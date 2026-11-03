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
async fn profile_finalize_allocation_gas() -> anyhow::Result<()> {
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

    println!("project_count,voter_count,gas_burnt,fraction_of_1000tgas,status");

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
                        "cost": per_project_cost.as_yoctonear(),
                        "milestone_amounts": [per_project_cost.as_yoctonear()],
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

            dao.call(contract.id(), "close_declaration")
                .args_json(json!({ "round_id": round_id }))
                .gas(near_workspaces::types::Gas::from_tgas(100))
                .transact()
                .await?
                .into_result()?;

            let finalize = dao
                .call(contract.id(), "finalize_allocation")
                .args_json(json!({ "round_id": round_id }))
                .max_gas()
                .transact()
                .await?;
            let gas_burnt = finalize.total_gas_burnt.as_gas();
            match finalize.into_result() {
                Ok(_) => println!(
                    "{project_count},{voter_count},{gas_burnt},{:.4},ok",
                    gas_burnt as f64 / MAX_GAS as f64
                ),
                Err(failure) => println!(
                    "{project_count},{voter_count},{gas_burnt},{:.4},FAILED:{failure:?}",
                    gas_burnt as f64 / MAX_GAS as f64
                ),
            }
        }
    }

    Ok(())
}
