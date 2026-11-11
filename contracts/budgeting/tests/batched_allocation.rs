use near_workspaces::network::Sandbox;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, Contract, Worker};
use serde_json::{json, Value};

const WASM_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/near/polestar_budgeting/polestar_budgeting.wasm"
);

const COSTS: [u128; 6] = [3, 2, 4, 1, 2, 5];
const APPROVALS: [&[usize]; 8] = [
    &[0, 1],
    &[0, 3],
    &[1, 2],
    &[2, 4],
    &[3],
    &[0, 1, 4],
    &[5],
    &[2, 3, 5],
];

async fn counted_round(
    worker: &Worker<Sandbox>,
    batch: Option<u32>,
) -> anyhow::Result<(Vec<Value>, Value, u32, u64)> {
    let wasm = std::fs::read(WASM_PATH)?;
    let contract: Contract = worker.dev_deploy(&wasm).await?;
    let root = worker.root_account()?;
    let tag = batch.map_or("s".to_string(), |b| format!("b{b}"));
    let dao: Account = root
        .create_subaccount(&format!("dao{tag}"))
        .initial_balance(NearToken::from_near(40))
        .transact()
        .await?
        .into_result()?;
    contract
        .call("new")
        .args_json(json!({ "sputnik_dao_account": dao.id() }))
        .transact()
        .await?
        .into_result()?;

    let mut voters = Vec::new();
    for i in 0..APPROVALS.len() {
        let voter = root
            .create_subaccount(&format!("v{i}{tag}"))
            .initial_balance(NearToken::from_near(2))
            .transact()
            .await?
            .into_result()?;
        voter
            .call(contract.id(), "register_voter")
            .transact()
            .await?
            .into_result()?;
        voters.push(voter);
    }

    let opens_at = worker.view_block().await?.height() + 5;
    let budget = NearToken::from_near(9);
    let round_id: u64 = dao
        .call(contract.id(), "fund_round")
        .args_json(json!({ "config": { "budget": budget.as_yoctonear(), "opens_at": opens_at, "closes_at": opens_at + 60, "t_min": 0 } }))
        .deposit(budget)
        .gas(Gas::from_tgas(100))
        .transact()
        .await?
        .json()?;

    let mut ids = Vec::new();
    for cost in COSTS {
        let amount = NearToken::from_near(cost).as_yoctonear().to_string();
        let id: u64 = dao
            .call(contract.id(), "register_project")
            .args_json(json!({ "round_id": round_id, "recipient": dao.id(), "title": "p", "summary": "s", "cost": amount, "milestone_amounts": [amount] }))
            .deposit(NearToken::from_millinear(10))
            .gas(Gas::from_tgas(100))
            .transact()
            .await?
            .json()?;
        ids.push(id);
    }
    dao.call(contract.id(), "open_declaration")
        .args_json(json!({ "round_id": round_id }))
        .transact()
        .await?
        .into_result()?;
    for (voter, approved) in voters.iter().zip(APPROVALS) {
        let approved: Vec<u64> = approved.iter().map(|&i| ids[i]).collect();
        voter
            .call(contract.id(), "submit_ballot")
            .args_json(json!({ "round_id": round_id, "approved": approved }))
            .gas(Gas::from_tgas(50))
            .transact()
            .await?
            .into_result()?;
    }
    worker.fast_forward(70).await?;
    dao.call(contract.id(), "close_declaration")
        .args_json(json!({ "round_id": round_id }))
        .gas(Gas::from_tgas(300))
        .transact()
        .await?
        .into_result()?;

    let mut calls = 0u32;
    let mut heaviest = 0u64;
    loop {
        let call = match batch {
            None => dao
                .call(contract.id(), "process_allocation_step")
                .args_json(json!({ "round_id": round_id })),
            Some(max_steps) => dao
                .call(contract.id(), "process_allocation_steps")
                .args_json(json!({ "round_id": round_id, "max_steps": max_steps })),
        };
        let outcome = call
            .gas(Gas::from_tgas(300))
            .transact()
            .await?
            .into_result()?;
        calls += 1;
        heaviest = heaviest.max(outcome.total_gas_burnt.as_gas());
        if outcome.json::<bool>()? {
            break;
        }
    }

    let projects: Vec<Value> = contract
        .view("get_projects")
        .args_json(json!({ "round_id": round_id }))
        .await?
        .json()?;
    let result: Value = contract
        .view("get_allocation_result")
        .args_json(json!({ "round_id": round_id }))
        .await?
        .json()?;
    Ok((projects, result, calls, heaviest))
}

#[tokio::test(flavor = "multi_thread")]
async fn batched_counting_matches_stepwise_in_fewer_transactions() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let (projects_s, result_s, calls_s, gas_s) = counted_round(&worker, None).await?;
    let (projects_b, result_b, calls_b, gas_b) = counted_round(&worker, Some(100)).await?;

    let statuses = |projects: &[Value]| {
        projects
            .iter()
            .map(|p| (p["id"].clone(), p["status"].clone()))
            .collect::<Vec<_>>()
    };
    assert_eq!(statuses(&projects_s), statuses(&projects_b));
    assert_eq!(result_s, result_b);
    println!(
        "stepwise: {calls_s} transactions, heaviest {} Tgas",
        gas_s / 1_000_000_000_000
    );
    println!(
        "batched:  {calls_b} transactions, heaviest {} Tgas",
        gas_b / 1_000_000_000_000
    );
    assert!(
        calls_s > 2,
        "fixture should need several steps, took {calls_s}"
    );
    assert_eq!(
        calls_b, 1,
        "a round this size should finish in one batched call"
    );
    Ok(())
}
