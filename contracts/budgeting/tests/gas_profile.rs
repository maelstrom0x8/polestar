use near_workspaces::types::NearToken;
use serde_json::json;

const WASM_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/near/polestar_budgeting/polestar_budgeting.wasm"
);

const PROJECT_COUNTS: [u64; 4] = [5, 10, 20, 30];
const VOTER_COUNTS: [usize; 4] = [20, 100, 300, 500];
// 1000 Tgas: confirmed via `protocol_config_check.rs` against this sandbox's actual
// `limit_config.max_gas_burnt` — not the commonly-cited 300 Tgas figure, which is stale.
const MAX_GAS: u64 = 1_000_000_000_000_000;

#[tokio::test(flavor = "multi_thread")]
async fn profile_process_allocation_step_gas() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let wasm = std::fs::read(WASM_PATH)
        .unwrap_or_else(|e| panic!("read {WASM_PATH}: {e} (run `cargo near build` first)"));
    let contract = worker.dev_deploy(&wasm).await?;

    let root = worker.root_account()?;
    let dao = root
        .create_subaccount("dao")
        .initial_balance(NearToken::from_near(2_000))
        .transact()
        .await?
        .into_result()?;
    let proposer = root
        .create_subaccount("proposer")
        .initial_balance(NearToken::from_near(100))
        .transact()
        .await?
        .into_result()?;

    contract
        .call("new")
        .args_json(json!({ "sputnik_dao_account": dao.id() }))
        .transact()
        .await?
        .into_result()?;

    let max_voters = *VOTER_COUNTS.iter().max().unwrap();
    let mut voters = Vec::with_capacity(max_voters);
    for i in 0..max_voters {
        let voter = root
            .create_subaccount(&format!("voter{i}"))
            .initial_balance(NearToken::from_near(10))
            .transact()
            .await?
            .into_result()?;
        voter
            .call(contract.id(), "register_voter")
            .gas(near_workspaces::types::Gas::from_tgas(30))
            .transact()
            .await?
            .into_result()?;
        voters.push(voter);
    }

    println!(
        "project_count,voter_count,close_declaration_gas,step_count,max_step_gas,max_step_fraction_of_1000tgas,status"
    );

    for &project_count in &PROJECT_COUNTS {
        for &voter_count in &VOTER_COUNTS {
            let opens_at = worker.view_block().await?.height() + 10;
            let closes_at = opens_at + 5_000;
            let per_project_cost = NearToken::from_near(1);
            let budget =
                NearToken::from_yoctonear(per_project_cost.as_yoctonear() * project_count as u128);

            let round_id: u64 = dao
                .call(contract.id(), "fund_round")
                .args_json(json!({
                    "config": {
                        "budget": budget.as_yoctonear(),
                        "opens_at": opens_at,
                        "closes_at": closes_at,
                        "t_min": 0,
                    }
                }))
                .deposit(budget)
                .gas(near_workspaces::types::Gas::from_tgas(100))
                .transact()
                .await?
                .json()?;

            let mut project_ids = Vec::with_capacity(project_count as usize);
            for _ in 0..project_count {
                let project_id: u64 = proposer
                    .call(contract.id(), "register_project")
                    .args_json(json!({
                        "round_id": round_id,
                        "recipient": proposer.id(),
                        "title": "Bench project",
                        "summary": "Gas-profiling fixture",
                        "cost": per_project_cost.as_yoctonear().to_string(),
                        "milestone_amounts": [per_project_cost.as_yoctonear().to_string()],
                    }))
                    .deposit(NearToken::from_millinear(10))
                    .gas(near_workspaces::types::Gas::from_tgas(100))
                    .transact()
                    .await?
                    .json()?;
                project_ids.push(project_id);
            }

            dao.call(contract.id(), "open_declaration")
                .args_json(json!({ "round_id": round_id }))
                .gas(near_workspaces::types::Gas::from_tgas(100))
                .transact()
                .await?
                .into_result()?;

            let mut ballot_futures = Vec::with_capacity(voter_count);
            for voter in voters.iter().take(voter_count) {
                ballot_futures.push(
                    voter
                        .call(contract.id(), "submit_ballot")
                        .args_json(json!({
                            "round_id": round_id,
                            "approved": project_ids,
                        }))
                        .gas(near_workspaces::types::Gas::from_tgas(100))
                        .transact(),
                );
            }
            for result in futures::future::join_all(ballot_futures).await {
                result?.into_result()?;
            }

            let current_height = worker.view_block().await?.height();
            if current_height <= closes_at {
                worker.fast_forward(closes_at - current_height + 10).await?;
            }

            let close = dao
                .call(contract.id(), "close_declaration")
                .args_json(json!({ "round_id": round_id }))
                .max_gas()
                .transact()
                .await?;
            let close_declaration_gas = close.total_gas_burnt.as_gas();
            close.into_result()?;

            let mut step_count = 0u32;
            let mut max_step_gas = 0u64;
            let mut failure = None;
            loop {
                let step = dao
                    .call(contract.id(), "process_allocation_step")
                    .args_json(json!({ "round_id": round_id }))
                    .max_gas()
                    .transact()
                    .await?;
                step_count += 1;
                max_step_gas = max_step_gas.max(step.total_gas_burnt.as_gas());
                match step.into_result() {
                    Ok(success) => {
                        if success.json::<bool>()? {
                            break;
                        }
                    }
                    Err(f) => {
                        failure = Some(f);
                        break;
                    }
                }
            }

            match failure {
                None => println!(
                    "{project_count},{voter_count},{close_declaration_gas},{step_count},{max_step_gas},{:.4},ok",
                    max_step_gas as f64 / MAX_GAS as f64
                ),
                Some(f) => println!(
                    "{project_count},{voter_count},{close_declaration_gas},{step_count},{max_step_gas},{:.4},FAILED:{f:?}",
                    max_step_gas as f64 / MAX_GAS as f64
                ),
            }
        }
    }

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn worst_single_step_at_max_projects_per_round_fits() -> anyhow::Result<()> {
    const PROJECT_COUNT: u64 = 50; // MAX_PROJECTS_PER_ROUND
    const VOTER_COUNT: usize = 500;

    let worker = near_workspaces::sandbox().await?;
    let wasm = std::fs::read(WASM_PATH)
        .unwrap_or_else(|e| panic!("read {WASM_PATH}: {e} (run `cargo near build` first)"));
    let contract = worker.dev_deploy(&wasm).await?;

    let root = worker.root_account()?;
    let dao = root
        .create_subaccount("dao")
        .initial_balance(NearToken::from_near(2_000))
        .transact()
        .await?
        .into_result()?;
    let proposer = root
        .create_subaccount("proposer")
        .initial_balance(NearToken::from_near(100))
        .transact()
        .await?
        .into_result()?;

    contract
        .call("new")
        .args_json(json!({ "sputnik_dao_account": dao.id() }))
        .transact()
        .await?
        .into_result()?;

    let mut voters = Vec::with_capacity(VOTER_COUNT);
    for i in 0..VOTER_COUNT {
        let voter = root
            .create_subaccount(&format!("voter{i}"))
            .initial_balance(NearToken::from_near(10))
            .transact()
            .await?
            .into_result()?;
        voter
            .call(contract.id(), "register_voter")
            .gas(near_workspaces::types::Gas::from_tgas(30))
            .transact()
            .await?
            .into_result()?;
        voters.push(voter);
    }

    let opens_at = worker.view_block().await?.height() + 10;
    let closes_at = opens_at + 5_000;
    let per_project_cost = NearToken::from_near(1);
    let budget = NearToken::from_yoctonear(per_project_cost.as_yoctonear() * PROJECT_COUNT as u128);

    let round_id: u64 = dao
        .call(contract.id(), "fund_round")
        .args_json(json!({
            "config": {
                "budget": budget.as_yoctonear(),
                "opens_at": opens_at,
                "closes_at": closes_at,
                "t_min": 0,
            }
        }))
        .deposit(budget)
        .gas(near_workspaces::types::Gas::from_tgas(100))
        .transact()
        .await?
        .json()?;

    let mut project_ids = Vec::with_capacity(PROJECT_COUNT as usize);
    for _ in 0..PROJECT_COUNT {
        let project_id: u64 = proposer
            .call(contract.id(), "register_project")
            .args_json(json!({
                "round_id": round_id,
                "recipient": proposer.id(),
                "title": "Bench project",
                "summary": "Gas-profiling fixture",
                "cost": per_project_cost.as_yoctonear().to_string(),
                "milestone_amounts": [per_project_cost.as_yoctonear().to_string()],
            }))
            .deposit(NearToken::from_millinear(10))
            .gas(near_workspaces::types::Gas::from_tgas(100))
            .transact()
            .await?
            .json()?;
        project_ids.push(project_id);
    }

    dao.call(contract.id(), "open_declaration")
        .args_json(json!({ "round_id": round_id }))
        .gas(near_workspaces::types::Gas::from_tgas(100))
        .transact()
        .await?
        .into_result()?;

    let mut ballot_futures = Vec::with_capacity(VOTER_COUNT);
    for voter in &voters {
        ballot_futures.push(
            voter
                .call(contract.id(), "submit_ballot")
                .args_json(json!({
                    "round_id": round_id,
                    "approved": project_ids,
                }))
                .gas(near_workspaces::types::Gas::from_tgas(100))
                .transact(),
        );
    }
    for result in futures::future::join_all(ballot_futures).await {
        result?.into_result()?;
    }

    let current_height = worker.view_block().await?.height();
    if current_height <= closes_at {
        worker.fast_forward(closes_at - current_height + 10).await?;
    }

    let close = dao
        .call(contract.id(), "close_declaration")
        .args_json(json!({ "round_id": round_id }))
        .max_gas()
        .transact()
        .await?;
    println!(
        "close_declaration gas at {PROJECT_COUNT} projects x {VOTER_COUNT} voters: {}",
        close.total_gas_burnt.as_gas()
    );
    close.into_result()?;

    let mut max_step_gas = 0u64;
    loop {
        let step = dao
            .call(contract.id(), "process_allocation_step")
            .args_json(json!({ "round_id": round_id }))
            .max_gas()
            .transact()
            .await?;
        max_step_gas = max_step_gas.max(step.total_gas_burnt.as_gas());
        let done: bool = step.into_result()?.json()?;
        if done {
            break;
        }
    }

    println!(
        "worst single process_allocation_step at {PROJECT_COUNT} projects x {VOTER_COUNT} voters: \
         {max_step_gas} gas ({:.4} of {MAX_GAS})",
        max_step_gas as f64 / MAX_GAS as f64
    );
    assert!(
        max_step_gas < MAX_GAS,
        "a single process_allocation_step at the MAX_PROJECTS_PER_ROUND cap must fit under the gas ceiling"
    );

    Ok(())
}
