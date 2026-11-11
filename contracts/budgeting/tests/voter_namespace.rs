use near_workspaces::types::{Gas, NearToken};
use serde_json::json;

const WASM_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/near/polestar_budgeting/polestar_budgeting.wasm"
);

#[tokio::test(flavor = "multi_thread")]
async fn only_direct_sub_accounts_of_the_namespace_can_vote() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let wasm = std::fs::read(WASM_PATH)
        .unwrap_or_else(|e| panic!("read {WASM_PATH}: {e} (run `cargo near build` first)"));
    let contract = worker.dev_deploy(&wasm).await?;
    let root = worker.root_account()?;
    let make = |parent: near_workspaces::Account, name: &'static str, near: u128| async move {
        parent
            .create_subaccount(name)
            .initial_balance(NearToken::from_near(near))
            .transact()
            .await?
            .into_result()
            .map_err(anyhow::Error::from)
    };
    let dao = make(root.clone(), "dao", 20).await?;
    let guild = make(root.clone(), "guild", 20).await?;
    let member = make(guild.clone(), "priya", 5).await?;
    let outsider = make(root.clone(), "outsider", 5).await?;
    let proposer = make(root.clone(), "proposer", 5).await?;

    contract
        .call("new")
        .args_json(json!({ "sputnik_dao_account": dao.id() }))
        .transact()
        .await?
        .into_result()?;

    for voter in [&member, &outsider] {
        voter
            .call(contract.id(), "register_voter")
            .transact()
            .await?
            .into_result()?;
    }

    let opens_at = worker.view_block().await?.height() + 5;
    let budget = NearToken::from_near(2);
    let round_id: u64 = dao
        .call(contract.id(), "fund_round")
        .args_json(json!({
            "config": { "budget": budget.as_yoctonear(), "opens_at": opens_at, "closes_at": opens_at + 200, "t_min": 0 },
            "voter_namespace": guild.id(),
        }))
        .deposit(budget)
        .gas(Gas::from_tgas(100))
        .transact()
        .await?
        .json()?;

    let round: serde_json::Value = contract
        .view("get_round")
        .args_json(json!({ "round_id": round_id }))
        .await?
        .json()?;
    assert_eq!(round["voter_namespace"], guild.id().as_str());

    let project_id: u64 = proposer
        .call(contract.id(), "register_project")
        .args_json(json!({
            "round_id": round_id,
            "recipient": proposer.id(),
            "title": "Tool library",
            "summary": "Sandbox fixture",
            "cost": NearToken::from_near(1).as_yoctonear().to_string(),
            "milestone_amounts": [NearToken::from_near(1).as_yoctonear().to_string()],
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

    let ballot = json!({ "round_id": round_id, "approved": [project_id] });
    let refused = outsider
        .call(contract.id(), "submit_ballot")
        .args_json(&ballot)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    assert!(format!("{:?}", refused.into_result()).contains("ERR_NOT_IN_VOTER_NAMESPACE"));

    member
        .call(contract.id(), "submit_ballot")
        .args_json(&ballot)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?
        .into_result()?;
    let recorded: Option<serde_json::Value> = contract
        .view("get_ballot")
        .args_json(json!({ "round_id": round_id, "voter": member.id() }))
        .await?
        .json()?;
    assert!(recorded.is_some());
    Ok(())
}
