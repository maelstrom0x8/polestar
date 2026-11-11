use std::collections::{BTreeSet, HashMap};

use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::{
    test_vm_config, testing_env, AccountId, NearToken, PromiseResult, RuntimeFeesConfig,
};

use crate::types::{ProjectId, ProjectStatus, RoundConfig};
use crate::{Contract, RoundId, RoundPhase};

fn dao() -> AccountId {
    accounts(0)
}

fn non_dao() -> AccountId {
    accounts(1)
}

fn proposer() -> AccountId {
    accounts(2)
}

fn voter_a() -> AccountId {
    accounts(3)
}

fn stranger() -> AccountId {
    accounts(5)
}

fn set_ctx(predecessor: AccountId, deposit: NearToken, block_height: u64) {
    let context = VMContextBuilder::new()
        .current_account_id(accounts(0))
        .predecessor_account_id(predecessor)
        .attached_deposit(deposit)
        .block_height(block_height)
        .build();
    testing_env!(context);
}

fn set_ctx_with_promise_result(predecessor: AccountId, block_height: u64, result: PromiseResult) {
    let context = VMContextBuilder::new()
        .current_account_id(accounts(0))
        .predecessor_account_id(predecessor)
        .block_height(block_height)
        .build();
    testing_env!(
        context,
        test_vm_config(),
        RuntimeFeesConfig::test(),
        HashMap::default(),
        vec![result],
    );
}

fn new_contract() -> Contract {
    set_ctx(dao(), NearToken::from_near(0), 0);
    Contract::new(dao())
}

const BUDGET: u128 = 1_000;
const OPENS_AT: u64 = 100;
const CLOSES_AT: u64 = 200;
const T_MIN: u64 = 10;

fn fund(contract: &mut Contract) -> RoundId {
    set_ctx(dao(), NearToken::from_yoctonear(BUDGET), 10);
    contract.fund_round(
        RoundConfig {
            budget: BUDGET,
            opens_at: OPENS_AT,
            closes_at: CLOSES_AT,
            t_min: T_MIN,
        },
        None,
    )
}

fn register(
    contract: &mut Contract,
    round_id: RoundId,
    cost: u128,
    milestones: Vec<u128>,
) -> ProjectId {
    set_ctx(proposer(), NearToken::from_yoctonear(1), 20);
    contract.register_project(
        round_id,
        proposer(),
        "Title".to_string(),
        "Summary".to_string(),
        U128(cost),
        milestones.into_iter().map(U128).collect(),
    )
}

fn round_in_declaration(contract: &mut Contract) -> (RoundId, ProjectId) {
    let round_id = fund(contract);
    let project_id = register(contract, round_id, 600, vec![300, 300]);
    set_ctx(stranger(), NearToken::from_near(0), 50);
    contract.open_declaration(round_id);
    (round_id, project_id)
}

fn eligible_voter_seen_at(contract: &mut Contract, voter: AccountId, first_seen_at: u64) {
    set_ctx(voter, NearToken::from_near(0), first_seen_at);
    contract.register_voter();
}

#[test]
#[should_panic(expected = "ERR_NOT_SPUTNIK_DAO")]
fn fund_round_rejects_non_dao_caller() {
    let mut contract = new_contract();
    set_ctx(non_dao(), NearToken::from_yoctonear(BUDGET), 10);
    contract.fund_round(
        RoundConfig {
            budget: BUDGET,
            opens_at: OPENS_AT,
            closes_at: CLOSES_AT,
            t_min: T_MIN,
        },
        None,
    );
}

#[test]
#[should_panic(expected = "ERR_DEPOSIT_MISMATCH")]
fn fund_round_rejects_deposit_mismatch() {
    let mut contract = new_contract();
    set_ctx(dao(), NearToken::from_yoctonear(BUDGET - 1), 10);
    contract.fund_round(
        RoundConfig {
            budget: BUDGET,
            opens_at: OPENS_AT,
            closes_at: CLOSES_AT,
            t_min: T_MIN,
        },
        None,
    );
}

#[test]
#[should_panic(expected = "ERR_INVALID_CONFIG")]
fn fund_round_rejects_invalid_config() {
    let mut contract = new_contract();
    set_ctx(dao(), NearToken::from_yoctonear(BUDGET), 10);
    contract.fund_round(
        RoundConfig {
            budget: BUDGET,
            opens_at: CLOSES_AT,
            closes_at: OPENS_AT,
            t_min: T_MIN,
        },
        None,
    );
}

#[test]
fn fund_round_creates_registration_phase_round() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    assert_eq!(
        contract.get_round_phase(round_id),
        Some(RoundPhase::Registration)
    );
    assert_eq!(contract.get_remaining(round_id), Some(BUDGET));
}

#[test]
#[should_panic(expected = "ERR_ZERO_COST")]
fn register_project_rejects_zero_cost() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    register(&mut contract, round_id, 0, vec![]);
}

#[test]
#[should_panic(expected = "ERR_MILESTONE_SUM_MISMATCH")]
fn register_project_rejects_milestone_sum_mismatch() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    register(&mut contract, round_id, 600, vec![300, 200]);
}

#[test]
#[should_panic(expected = "ERR_NO_DEPOSIT")]
fn register_project_rejects_zero_deposit() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    set_ctx(proposer(), NearToken::from_near(0), 20);
    contract.register_project(
        round_id,
        proposer(),
        "Title".to_string(),
        "Summary".to_string(),
        U128(600),
        vec![U128(600)],
    );
}

#[test]
#[should_panic(expected = "ERR_WRONG_PHASE")]
fn register_project_rejects_wrong_phase() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    register(&mut contract, round_id, 100, vec![100]);
}

#[test]
#[should_panic(expected = "ERR_NO_PROJECTS")]
fn open_declaration_rejects_no_projects() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    set_ctx(stranger(), NearToken::from_near(0), 50);
    contract.open_declaration(round_id);
}

#[test]
fn open_declaration_transitions_to_declaration_phase() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    assert_eq!(
        contract.get_round_phase(round_id),
        Some(RoundPhase::Declaration)
    );
}

#[test]
#[should_panic(expected = "ERR_NO_PRIOR_INTERACTION")]
fn submit_ballot_rejects_unknown_voter() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_declaration(&mut contract);
    set_ctx(stranger(), NearToken::from_near(0), OPENS_AT);
    let mut approved = BTreeSet::new();
    approved.insert(project_id);
    contract.submit_ballot(round_id, approved);
}

#[test]
#[should_panic(expected = "ERR_ACCOUNT_TOO_NEW")]
fn submit_ballot_rejects_account_too_new() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_declaration(&mut contract);
    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - 1);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    let mut approved = BTreeSet::new();
    approved.insert(project_id);
    contract.submit_ballot(round_id, approved);
}

#[test]
#[should_panic(expected = "ERR_EMPTY_APPROVAL")]
fn submit_ballot_rejects_empty_approval() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - T_MIN);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    contract.submit_ballot(round_id, BTreeSet::new());
}

#[test]
#[should_panic(expected = "ERR_UNREGISTERED_PROJECT")]
fn submit_ballot_rejects_unregistered_project() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - T_MIN);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    let mut approved = BTreeSet::new();
    approved.insert(999);
    contract.submit_ballot(round_id, approved);
}

#[test]
#[should_panic(expected = "ERR_ALREADY_VOTED")]
fn submit_ballot_rejects_duplicate_vote() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_declaration(&mut contract);
    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - T_MIN);
    let mut approved = BTreeSet::new();
    approved.insert(project_id);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    contract.submit_ballot(round_id, approved.clone());
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT + 1);
    contract.submit_ballot(round_id, approved);
}

#[test]
fn submit_ballot_succeeds_for_eligible_voter() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_declaration(&mut contract);
    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - T_MIN);
    let mut approved = BTreeSet::new();
    approved.insert(project_id);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    contract.submit_ballot(round_id, approved.clone());

    let ballot = contract
        .get_ballot(round_id, voter_a())
        .expect("ballot recorded");
    assert_eq!(ballot.approved, approved);
}

#[test]
#[should_panic(expected = "ERR_DECLARATION_CLOSED")]
fn submit_ballot_rejects_after_deadline() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_declaration(&mut contract);
    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - T_MIN);
    set_ctx(voter_a(), NearToken::from_near(0), CLOSES_AT + 1);
    let mut approved = BTreeSet::new();
    approved.insert(project_id);
    contract.submit_ballot(round_id, approved);
}

#[test]
#[should_panic(expected = "ERR_DECLARATION_NOT_YET_CLOSED")]
fn close_declaration_rejects_before_deadline() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    set_ctx(stranger(), NearToken::from_near(0), CLOSES_AT - 1);
    contract.close_declaration(round_id);
}

#[test]
fn close_declaration_transitions_to_allocation_phase() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    set_ctx(stranger(), NearToken::from_near(0), CLOSES_AT + 1);
    contract.close_declaration(round_id);
    assert_eq!(
        contract.get_round_phase(round_id),
        Some(RoundPhase::Allocation)
    );
}

#[test]
#[should_panic(expected = "ERR_WRONG_PHASE")]
fn process_allocation_step_rejects_wrong_phase() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    set_ctx(stranger(), NearToken::from_near(0), CLOSES_AT + 1);
    contract.process_allocation_step(round_id);
}

#[test]
#[should_panic(expected = "ERR_NOT_SPUTNIK_DAO")]
fn attest_milestone_rejects_non_dao_caller() {
    let mut contract = new_contract();
    set_ctx(non_dao(), NearToken::from_near(0), 0);
    let _ = contract.attest_milestone(0, 0, 0);
}

fn round_in_settlement(contract: &mut Contract) -> (RoundId, ProjectId) {
    let (round_id, project_id) = round_in_declaration(contract);
    eligible_voter_seen_at(contract, voter_a(), OPENS_AT - T_MIN);
    let mut approved = BTreeSet::new();
    approved.insert(project_id);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    contract.submit_ballot(round_id, approved);

    set_ctx(stranger(), NearToken::from_near(0), CLOSES_AT + 1);
    contract.close_declaration(round_id);
    while !contract.process_allocation_step(round_id) {}
    (round_id, project_id)
}

#[test]
fn full_lifecycle_preserves_escrow_conservation() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_settlement(&mut contract);

    assert_eq!(
        contract.get_round_phase(round_id),
        Some(RoundPhase::Settlement)
    );

    let result = contract
        .get_allocation_result(round_id)
        .expect("allocation result recorded");
    let spent: u128 = result.funded.iter().map(|record| record.amount).sum();
    assert_eq!(
        spent + result.remaining,
        BUDGET,
        "INV-3: budget must equal remaining plus the cost of every funded project"
    );
    assert_eq!(contract.get_remaining(round_id), Some(result.remaining));

    let projects = contract.get_projects(round_id);
    let funded_project = projects.iter().find(|p| p.id == project_id).unwrap();
    assert_eq!(funded_project.status, ProjectStatus::Funded);

    for unfunded_id in &result.unfunded {
        let cost = projects.iter().find(|p| &p.id == unfunded_id).unwrap().cost;
        assert!(
            cost > result.remaining,
            "PROP-Exhaustive: an unfunded project's cost must exceed the final remaining"
        );
    }
}

#[test]
fn attest_milestone_dispatches_transfer_and_marks_attested() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_settlement(&mut contract);

    set_ctx(dao(), NearToken::from_near(0), CLOSES_AT + 10);
    let _ = contract.attest_milestone(round_id, project_id, 0);

    let projects = contract.get_projects(round_id);
    let project = projects.iter().find(|p| p.id == project_id).unwrap();
    assert!(project.milestones[0].attested);
    assert!(!project.milestones[1].attested);
}

#[test]
#[should_panic(expected = "ERR_ALREADY_ATTESTED")]
fn attest_milestone_rejects_double_attestation() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_settlement(&mut contract);

    set_ctx(dao(), NearToken::from_near(0), CLOSES_AT + 10);
    let _ = contract.attest_milestone(round_id, project_id, 0);
    set_ctx(dao(), NearToken::from_near(0), CLOSES_AT + 11);
    let _ = contract.attest_milestone(round_id, project_id, 0);
}

#[test]
fn on_milestone_transfer_rolls_back_attested_on_failure() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_settlement(&mut contract);
    let remaining_before = contract.get_remaining(round_id);

    set_ctx(dao(), NearToken::from_near(0), CLOSES_AT + 10);
    let _ = contract.attest_milestone(round_id, project_id, 0);

    set_ctx_with_promise_result(accounts(0), CLOSES_AT + 10, PromiseResult::Failed);
    contract.on_milestone_transfer(round_id, project_id, 0);

    let projects = contract.get_projects(round_id);
    let project = projects.iter().find(|p| p.id == project_id).unwrap();
    assert!(
        !project.milestones[0].attested,
        "a failed transfer must roll the optimistic attested flag back to false"
    );
    assert_eq!(
        contract.get_remaining(round_id),
        remaining_before,
        "a milestone transfer failure must not touch the round's escrowed remaining"
    );
}

#[test]
fn get_round_count_reflects_rounds_created() {
    let mut contract = new_contract();
    assert_eq!(contract.get_round_count(), 0);
    fund(&mut contract);
    assert_eq!(contract.get_round_count(), 1);
    fund(&mut contract);
    assert_eq!(contract.get_round_count(), 2);
}

#[test]
fn get_project_returns_single_project() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    let project_id = register(&mut contract, round_id, 600, vec![300, 300]);

    let project = contract
        .get_project(round_id, project_id)
        .expect("project exists");
    assert_eq!(project.id, project_id);
    assert_eq!(project.cost, 600);
    assert!(contract.get_project(round_id, project_id + 1).is_none());
    assert!(contract.get_project(round_id + 1, project_id).is_none());
}

#[test]
fn get_project_support_counts_approving_ballots_only() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    let project_id = register(&mut contract, round_id, 600, vec![300, 300]);
    let other_project_id = register(&mut contract, round_id, 100, vec![100]);
    set_ctx(stranger(), NearToken::from_near(0), 50);
    contract.open_declaration(round_id);

    assert_eq!(contract.get_project_support(round_id, project_id), 0);

    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - T_MIN);
    let mut approved = BTreeSet::new();
    approved.insert(project_id);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    contract.submit_ballot(round_id, approved);

    assert_eq!(contract.get_project_support(round_id, project_id), 1);
    assert_eq!(contract.get_project_support(round_id, other_project_id), 0);
}

#[test]
fn get_first_seen_reports_only_the_first_interaction() {
    let mut contract = new_contract();
    assert_eq!(contract.get_first_seen(stranger()), None);

    set_ctx(stranger(), NearToken::from_near(0), 40);
    contract.register_voter();
    assert_eq!(contract.get_first_seen(stranger()), Some(40));

    set_ctx(stranger(), NearToken::from_near(0), 90);
    contract.register_voter();
    assert_eq!(contract.get_first_seen(stranger()), Some(40));
}

#[test]
fn get_first_seen_is_set_by_registering_a_project() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    register(&mut contract, round_id, 600, vec![600]);
    assert_eq!(contract.get_first_seen(proposer()), Some(20));
}

const SETTLED_REMAINING: u128 = BUDGET - 600;

fn return_remaining_as_dao(contract: &mut Contract, round_id: RoundId) {
    set_ctx(dao(), NearToken::from_near(0), CLOSES_AT + 10);
    let _ = contract.return_remaining(round_id);
}

fn is_returned(contract: &Contract, round_id: RoundId) -> bool {
    contract
        .get_round(round_id)
        .expect("round exists")
        .remaining_returned
}

#[test]
fn return_remaining_sends_the_unspent_budget_to_the_dao() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_settlement(&mut contract);
    assert_eq!(contract.get_remaining(round_id), Some(SETTLED_REMAINING));
    assert!(!is_returned(&contract, round_id));

    set_ctx(dao(), NearToken::from_near(0), CLOSES_AT + 10);
    let _ = contract.return_remaining(round_id);

    let transfers: Vec<(AccountId, NearToken)> = near_sdk::test_utils::get_created_receipts()
        .into_iter()
        .flat_map(|receipt| {
            let receiver = receipt.receiver_id.clone();
            receipt
                .actions
                .into_iter()
                .filter_map(move |action| match action {
                    MockAction::Transfer { deposit, .. } => Some((receiver.clone(), deposit)),
                    _ => None,
                })
        })
        .collect();
    assert_eq!(
        transfers,
        vec![(dao(), NearToken::from_yoctonear(SETTLED_REMAINING))],
        "exactly one transfer, of the round's remaining, to the DAO"
    );
    assert!(is_returned(&contract, round_id));
}

#[test]
fn return_remaining_leaves_the_allocation_and_escrow_accounting_intact() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_settlement(&mut contract);
    let result_before = contract.get_allocation_result(round_id);

    return_remaining_as_dao(&mut contract, round_id);

    assert_eq!(
        contract.get_remaining(round_id),
        Some(SETTLED_REMAINING),
        "remaining is the record of what the count left over and is never rewritten"
    );
    assert_eq!(contract.get_allocation_result(round_id), result_before);
    let funded_cost: u128 = contract
        .get_projects(round_id)
        .iter()
        .filter(|p| p.status == ProjectStatus::Funded)
        .map(|p| p.cost)
        .sum();
    assert_eq!(
        funded_cost + SETTLED_REMAINING,
        BUDGET,
        "INV-3 still holds after the return"
    );

    set_ctx(dao(), NearToken::from_near(0), CLOSES_AT + 11);
    let _ = contract.attest_milestone(round_id, project_id, 0);
    let project = contract.get_project(round_id, project_id).unwrap();
    assert!(
        project.milestones[0].attested,
        "returning the remainder must not block paying funded projects"
    );
}

#[test]
#[should_panic(expected = "ERR_NOT_SPUTNIK_DAO")]
fn return_remaining_rejects_non_dao_caller() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_settlement(&mut contract);
    set_ctx(non_dao(), NearToken::from_near(0), CLOSES_AT + 10);
    let _ = contract.return_remaining(round_id);
}

#[test]
#[should_panic(expected = "ERR_WRONG_PHASE")]
fn return_remaining_rejects_a_round_before_settlement() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    return_remaining_as_dao(&mut contract, round_id);
}

#[test]
#[should_panic(expected = "ERR_ROUND_NOT_FOUND")]
fn return_remaining_rejects_an_unknown_round() {
    let mut contract = new_contract();
    return_remaining_as_dao(&mut contract, 42);
}

#[test]
#[should_panic(expected = "ERR_ALREADY_RETURNED")]
fn return_remaining_rejects_a_second_call() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_settlement(&mut contract);
    return_remaining_as_dao(&mut contract, round_id);
    return_remaining_as_dao(&mut contract, round_id);
}

#[test]
#[should_panic(expected = "ERR_NOTHING_TO_RETURN")]
fn return_remaining_rejects_a_fully_spent_round() {
    let mut contract = new_contract();
    let round_id = fund(&mut contract);
    let project_id = register(&mut contract, round_id, BUDGET, vec![BUDGET]);
    set_ctx(stranger(), NearToken::from_near(0), 50);
    contract.open_declaration(round_id);
    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - T_MIN);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    contract.submit_ballot(round_id, BTreeSet::from([project_id]));
    set_ctx(stranger(), NearToken::from_near(0), CLOSES_AT + 1);
    contract.close_declaration(round_id);
    while !contract.process_allocation_step(round_id) {}
    assert_eq!(contract.get_remaining(round_id), Some(0));

    return_remaining_as_dao(&mut contract, round_id);
}

#[test]
#[should_panic(expected = "ERR_INSUFFICIENT_BALANCE")]
fn return_remaining_rejects_when_the_contract_cannot_cover_it() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_settlement(&mut contract);
    let context = VMContextBuilder::new()
        .current_account_id(accounts(0))
        .predecessor_account_id(dao())
        .block_height(CLOSES_AT + 10)
        .account_balance(NearToken::from_yoctonear(0))
        .build();
    testing_env!(context);
    let _ = contract.return_remaining(round_id);
}

#[test]
fn on_remaining_return_failure_clears_the_record_so_it_can_be_retried() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_settlement(&mut contract);
    return_remaining_as_dao(&mut contract, round_id);

    set_ctx_with_promise_result(accounts(0), CLOSES_AT + 10, PromiseResult::Failed);
    contract.on_remaining_return(round_id);
    assert!(
        !is_returned(&contract, round_id),
        "a failed transfer must not leave the round marked as returned"
    );
    assert_eq!(contract.get_remaining(round_id), Some(SETTLED_REMAINING));

    return_remaining_as_dao(&mut contract, round_id);
    assert!(is_returned(&contract, round_id));
}

#[test]
fn on_remaining_return_success_keeps_the_record() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_settlement(&mut contract);
    return_remaining_as_dao(&mut contract, round_id);

    set_ctx_with_promise_result(
        accounts(0),
        CLOSES_AT + 10,
        PromiseResult::Successful(vec![]),
    );
    contract.on_remaining_return(round_id);
    assert!(is_returned(&contract, round_id));
}

fn guild() -> AccountId {
    "guild.near".parse().unwrap()
}

fn namespaced_round_in_declaration(contract: &mut Contract) -> (RoundId, ProjectId) {
    set_ctx(dao(), NearToken::from_yoctonear(BUDGET), 10);
    let round_id = contract.fund_round(
        RoundConfig {
            budget: BUDGET,
            opens_at: OPENS_AT,
            closes_at: CLOSES_AT,
            t_min: T_MIN,
        },
        Some(guild()),
    );
    let project_id = register(contract, round_id, 600, vec![300, 300]);
    set_ctx(stranger(), NearToken::from_near(0), 50);
    contract.open_declaration(round_id);
    (round_id, project_id)
}

fn vote_as(contract: &mut Contract, round_id: RoundId, project_id: ProjectId, voter: AccountId) {
    eligible_voter_seen_at(contract, voter.clone(), OPENS_AT - T_MIN);
    set_ctx(voter, NearToken::from_near(0), OPENS_AT);
    contract.submit_ballot(round_id, BTreeSet::from([project_id]));
}

#[test]
fn voter_namespace_is_recorded_and_reported() {
    let mut contract = new_contract();
    let (round_id, _) = namespaced_round_in_declaration(&mut contract);
    assert_eq!(
        contract.get_round(round_id).unwrap().voter_namespace,
        Some(guild())
    );
}

#[test]
fn open_rounds_report_no_voter_namespace() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    assert_eq!(contract.get_round(round_id).unwrap().voter_namespace, None);
}

#[test]
fn direct_sub_accounts_of_the_namespace_can_vote() {
    let mut contract = new_contract();
    let (round_id, project_id) = namespaced_round_in_declaration(&mut contract);
    let member: AccountId = "priya.guild.near".parse().unwrap();
    vote_as(&mut contract, round_id, project_id, member.clone());
    assert!(contract.get_ballot(round_id, member).is_some());
}

#[test]
#[should_panic(expected = "ERR_NOT_IN_VOTER_NAMESPACE")]
fn accounts_outside_the_namespace_cannot_vote() {
    let mut contract = new_contract();
    let (round_id, project_id) = namespaced_round_in_declaration(&mut contract);
    vote_as(&mut contract, round_id, project_id, voter_a());
}

#[test]
#[should_panic(expected = "ERR_NOT_IN_VOTER_NAMESPACE")]
fn deeper_sub_accounts_cannot_vote() {
    let mut contract = new_contract();
    let (round_id, project_id) = namespaced_round_in_declaration(&mut contract);
    vote_as(
        &mut contract,
        round_id,
        project_id,
        "sock.priya.guild.near".parse().unwrap(),
    );
}

#[test]
#[should_panic(expected = "ERR_NOT_IN_VOTER_NAMESPACE")]
fn the_namespace_account_itself_cannot_vote() {
    let mut contract = new_contract();
    let (round_id, project_id) = namespaced_round_in_declaration(&mut contract);
    vote_as(&mut contract, round_id, project_id, guild());
}

#[test]
#[should_panic(expected = "ERR_NOT_IN_VOTER_NAMESPACE")]
fn a_lookalike_suffix_is_not_a_sub_account() {
    let mut contract = new_contract();
    let (round_id, project_id) = namespaced_round_in_declaration(&mut contract);
    vote_as(
        &mut contract,
        round_id,
        project_id,
        "fakeguild.near".parse().unwrap(),
    );
}

#[test]
fn the_namespace_is_checked_before_eligibility_timing() {
    let mut contract = new_contract();
    let (round_id, project_id) = namespaced_round_in_declaration(&mut contract);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    let refusal = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        contract.submit_ballot(round_id, BTreeSet::from([project_id]));
    }))
    .expect_err("an unregistered outsider must be refused");
    let message = refusal
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| refusal.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default();
    assert!(
        message.contains("ERR_NOT_IN_VOTER_NAMESPACE"),
        "outsiders learn only that they can't vote, got: {message}"
    );
}

#[test]
#[should_panic(expected = "ERR_INVALID_STEP_COUNT")]
fn process_allocation_steps_rejects_zero_steps() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    set_ctx(stranger(), NearToken::from_near(0), CLOSES_AT + 1);
    contract.close_declaration(round_id);
    contract.process_allocation_steps(round_id, 0);
}

#[test]
#[should_panic(expected = "ERR_WRONG_PHASE")]
fn process_allocation_steps_rejects_wrong_phase() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    contract.process_allocation_steps(round_id, 10);
}

#[test]
fn process_allocation_steps_stops_at_max_steps() {
    let mut contract = new_contract();
    let (round_id, _) = round_in_declaration(&mut contract);
    set_ctx(stranger(), NearToken::from_near(0), CLOSES_AT + 1);
    contract.close_declaration(round_id);

    assert!(!contract.process_allocation_steps(round_id, 1));
    assert_eq!(
        contract.get_round_phase(round_id),
        Some(RoundPhase::Allocation)
    );
}

#[test]
fn process_allocation_steps_finishes_a_round_in_one_call() {
    let mut contract = new_contract();
    let (round_id, project_id) = round_in_declaration(&mut contract);
    eligible_voter_seen_at(&mut contract, voter_a(), OPENS_AT - T_MIN);
    set_ctx(voter_a(), NearToken::from_near(0), OPENS_AT);
    contract.submit_ballot(round_id, BTreeSet::from([project_id]));
    set_ctx(stranger(), NearToken::from_near(0), CLOSES_AT + 1);
    contract.close_declaration(round_id);

    assert!(contract.process_allocation_steps(round_id, 100));
    assert_eq!(
        contract.get_round_phase(round_id),
        Some(RoundPhase::Settlement)
    );
    assert_eq!(
        contract.get_project(round_id, project_id).unwrap().status,
        ProjectStatus::Funded
    );
}
