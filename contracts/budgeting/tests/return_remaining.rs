use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, Contract, Worker};
use serde_json::{json, Value};

const WASM_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/near/polestar_budgeting/polestar_budgeting.wasm"
);

const BUDGET: NearToken = NearToken::from_near(10);
const PROJECT_COST: NearToken = NearToken::from_near(6);
const MILESTONE: NearToken = NearToken::from_near(3);

fn read_wasm(path: &str) -> Vec<u8> {
    std::fs::read(path)
        .unwrap_or_else(|e| panic!("read {path}: {e} (run `cargo near build` first)"))
}

async fn subaccount(
    worker: &Worker<near_workspaces::network::Sandbox>,
    name: &str,
) -> anyhow::Result<Account> {
    Ok(worker
        .root_account()?
        .create_subaccount(name)
        .initial_balance(NearToken::from_near(50))
        .transact()
        .await?
        .into_result()?)
}

async fn round(contract: &Contract, round_id: u64) -> anyhow::Result<Value> {
    Ok(contract
        .view("get_round")
        .args_json(json!({ "round_id": round_id }))
        .await?
        .json()?)
}
async fn settled_round(
    worker: &Worker<near_workspaces::network::Sandbox>,
    contract: &Contract,
    dao: &Account,
    proposer: &Account,
    voter: &Account,
) -> anyhow::Result<(u64, u64)> {
    voter
        .call(contract.id(), "register_voter")
        .gas(Gas::from_tgas(30))
        .transact()
        .await?
        .into_result()?;

    let opens_at = worker.view_block().await?.height() + 5;
    let closes_at = opens_at + 20;
    let round_id: u64 = dao
        .call(contract.id(), "fund_round")
        .args_json(json!({ "config": {
            "budget": BUDGET.as_yoctonear(),
            "opens_at": opens_at,
            "closes_at": closes_at,
            "t_min": 0,
        }}))
        .deposit(BUDGET)
        .gas(Gas::from_tgas(100))
        .transact()
        .await?
        .json()?;

    let project_id: u64 = proposer
        .call(contract.id(), "register_project")
        .args_json(json!({
            "round_id": round_id,
            "recipient": proposer.id(),
            "title": "Tool library",
            "summary": "Sandbox fixture",
            "cost": PROJECT_COST.as_yoctonear().to_string(),
            "milestone_amounts": [MILESTONE.as_yoctonear().to_string(), MILESTONE.as_yoctonear().to_string()],
        }))
        .deposit(NearToken::from_millinear(10))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?
        .json()?;

    dao.call(contract.id(), "open_declaration")
        .args_json(json!({ "round_id": round_id }))
        .transact()
        .await?
        .into_result()?;
    voter
        .call(contract.id(), "submit_ballot")
        .args_json(json!({ "round_id": round_id, "approved": [project_id] }))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?
        .into_result()?;

    worker.fast_forward(30).await?;
    dao.call(contract.id(), "close_declaration")
        .args_json(json!({ "round_id": round_id }))
        .gas(Gas::from_tgas(300))
        .transact()
        .await?
        .into_result()?;
    loop {
        let done: bool = dao
            .call(contract.id(), "process_allocation_step")
            .args_json(json!({ "round_id": round_id }))
            .gas(Gas::from_tgas(300))
            .transact()
            .await?
            .json()?;
        if done {
            break;
        }
    }
    assert_eq!(round(contract, round_id).await?["phase"], "Settlement");
    Ok((round_id, project_id))
}
#[tokio::test(flavor = "multi_thread")]
async fn return_remaining_on_real_wasm() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let current = read_wasm(WASM_PATH);
    let previous = std::env::var("PREVIOUS_WASM").ok().map(|p| read_wasm(&p));
    let contract = worker
        .dev_deploy(previous.as_deref().unwrap_or(&current))
        .await?;

    let dao = subaccount(&worker, "dao").await?;
    let proposer = subaccount(&worker, "proposer").await?;
    let voter = subaccount(&worker, "voter").await?;
    let stranger = subaccount(&worker, "stranger").await?;

    contract
        .call("new")
        .args_json(json!({ "sputnik_dao_account": dao.id() }))
        .transact()
        .await?
        .into_result()?;

    let (round_id, project_id) = settled_round(&worker, &contract, &dao, &proposer, &voter).await?;

    if previous.is_some() {
        contract
            .as_account()
            .deploy(&current)
            .await?
            .into_result()?;
        println!("upgraded to the current build with round {round_id} in Settlement");
    }

    let before = round(&contract, round_id).await?;
    let remaining = BUDGET.as_yoctonear() - PROJECT_COST.as_yoctonear();
    assert_eq!(before["remaining"].to_string(), remaining.to_string());
    assert_eq!(before["remaining_returned"], false);

    let refused = stranger
        .call(contract.id(), "return_remaining")
        .args_json(json!({ "round_id": round_id }))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    assert!(format!("{:?}", refused.into_result()).contains("ERR_NOT_SPUTNIK_DAO"));

    let dao_before = dao.view_account().await?.balance.as_yoctonear();
    let contract_before = contract.view_account().await?.balance.as_yoctonear();
    let outcome = dao
        .call(contract.id(), "return_remaining")
        .args_json(json!({ "round_id": round_id }))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?
        .into_result()?;
    assert!(outcome
        .logs()
        .contains(&format!("RemainingReturned round_id={round_id} amount={remaining}").as_str()));
    let contract_lost = contract_before - contract.view_account().await?.balance.as_yoctonear();
    let dao_gained = dao.view_account().await?.balance.as_yoctonear() - dao_before;
    let reward_allowance = NearToken::from_millinear(10).as_yoctonear();
    let gas_allowance = NearToken::from_millinear(100).as_yoctonear();
    assert!(
        contract_lost <= remaining && contract_lost + reward_allowance > remaining,
        "contract should release the 4 NEAR remainder, lost {contract_lost}"
    );
    assert!(
        dao_gained <= remaining && dao_gained + gas_allowance > remaining,
        "DAO should receive the 4 NEAR remainder, gained {dao_gained}"
    );

    let after = round(&contract, round_id).await?;
    assert_eq!(after["remaining_returned"], true);
    assert_eq!(after["remaining"].to_string(), remaining.to_string());

    let second = dao
        .call(contract.id(), "return_remaining")
        .args_json(json!({ "round_id": round_id }))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    assert!(format!("{:?}", second.into_result()).contains("ERR_ALREADY_RETURNED"));

    let private = stranger
        .call(contract.id(), "on_remaining_return")
        .args_json(json!({ "round_id": round_id }))
        .gas(Gas::from_tgas(10))
        .transact()
        .await?;
    assert!(format!("{:?}", private.into_result()).contains("is private"));
    assert_eq!(
        round(&contract, round_id).await?["remaining_returned"],
        true
    );

    let proposer_before = proposer.view_account().await?.balance;
    dao.call(contract.id(), "attest_milestone")
        .args_json(json!({ "round_id": round_id, "project_id": project_id, "milestone_index": 0 }))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?
        .into_result()?;
    let proposer_gained =
        proposer.view_account().await?.balance.as_yoctonear() - proposer_before.as_yoctonear();
    assert_eq!(
        proposer_gained,
        MILESTONE.as_yoctonear(),
        "milestone payments still work after the remainder is returned"
    );

    Ok(())
}
