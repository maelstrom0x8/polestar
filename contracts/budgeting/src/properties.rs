use std::collections::BTreeSet;

use allocate::AllocationResult;
use near_sdk::json_types::U128;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::{testing_env, AccountId, NearToken};
use proptest::prelude::*;

use crate::types::{ProjectId, ProjectStatus, RoundConfig};
use crate::Contract;

const OPENS_AT: u64 = 1_000;
const CLOSES_AT: u64 = 2_000;
const T_MIN: u64 = 10;
const FIRST_SEEN_AT: u64 = OPENS_AT - T_MIN - 1;

fn dao() -> AccountId {
    accounts(0)
}

fn synthetic_account(prefix: &str, index: usize) -> AccountId {
    format!("{prefix}{index}").parse().unwrap()
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

fn new_contract() -> Contract {
    near_sdk::mock::with_mocked_blockchain(|b| {
        b.take_storage();
    });
    set_ctx(dao(), NearToken::from_near(0), 0);
    Contract::new(dao())
}

#[derive(Debug, Clone)]
struct Scenario {
    costs: Vec<u128>,
    budget: u128,
    approvals: Vec<BTreeSet<usize>>,
}

fn scenario_strategy(max_projects: usize, max_voters: usize) -> impl Strategy<Value = Scenario> {
    (1..=max_projects)
        .prop_flat_map(move |num_projects| prop::collection::vec(1u128..=50, num_projects))
        .prop_flat_map(move |costs| {
            let num_projects = costs.len();
            (Just(costs), 0..=max_voters).prop_flat_map(move |(costs, num_voters)| {
                prop::collection::vec(
                    prop::collection::vec(any::<bool>(), num_projects)
                        .prop_filter("at least one approval", |mask| mask.iter().any(|&b| b)),
                    num_voters,
                )
                .prop_map(move |masks| {
                    let approvals: Vec<BTreeSet<usize>> = masks
                        .iter()
                        .map(|mask| {
                            mask.iter()
                                .enumerate()
                                .filter(|(_, &b)| b)
                                .map(|(i, _)| i)
                                .collect()
                        })
                        .collect();
                    (costs.clone(), approvals)
                })
            })
        })
        .prop_flat_map(|(costs, approvals)| (Just(costs), Just(approvals), 1u128..=600))
        .prop_map(|(costs, approvals, budget)| Scenario {
            costs,
            budget,
            approvals,
        })
}

struct ScenarioOutcome {
    result: AllocationResult<ProjectId>,
    remaining: u128,
    projects: Vec<crate::types::Project>,
    project_ids: Vec<ProjectId>,
}

fn run_scenario(
    scenario: &Scenario,
    project_order: &[usize],
    voter_order: &[usize],
) -> ScenarioOutcome {
    let mut contract = new_contract();
    set_ctx(dao(), NearToken::from_yoctonear(scenario.budget), 0);
    let round_id = contract.fund_round(
        RoundConfig {
            budget: scenario.budget,
            opens_at: OPENS_AT,
            closes_at: CLOSES_AT,
            t_min: T_MIN,
        },
        None,
    );

    let mut project_ids = vec![0u64; scenario.costs.len()];
    for &logical_index in project_order {
        let cost = scenario.costs[logical_index];
        set_ctx(
            synthetic_account("proposer", logical_index),
            NearToken::from_yoctonear(1),
            FIRST_SEEN_AT,
        );
        let pid = contract.register_project(
            round_id,
            synthetic_account("recipient", logical_index),
            "t".to_string(),
            "s".to_string(),
            U128(cost),
            vec![U128(cost)],
        );
        project_ids[logical_index] = pid;
    }

    set_ctx(
        synthetic_account("anyone", 0),
        NearToken::from_near(0),
        FIRST_SEEN_AT,
    );
    contract.open_declaration(round_id);

    for &voter_index in voter_order {
        let voter = synthetic_account("voter", voter_index);
        set_ctx(voter.clone(), NearToken::from_near(0), FIRST_SEEN_AT);
        contract.register_voter();
        let approved: BTreeSet<ProjectId> = scenario.approvals[voter_index]
            .iter()
            .map(|&i| project_ids[i])
            .collect();
        set_ctx(voter, NearToken::from_near(0), OPENS_AT);
        contract.submit_ballot(round_id, approved);
    }

    set_ctx(
        synthetic_account("anyone", 0),
        NearToken::from_near(0),
        CLOSES_AT + 1,
    );
    contract.close_declaration(round_id);
    while !contract.process_allocation_step(round_id) {}

    ScenarioOutcome {
        result: contract
            .get_allocation_result(round_id)
            .expect("result recorded"),
        remaining: contract.get_remaining(round_id).expect("round exists"),
        projects: contract.get_projects(round_id),
        project_ids,
    }
}

fn in_order(n: usize) -> Vec<usize> {
    (0..n).collect()
}

fn reversed(n: usize) -> Vec<usize> {
    (0..n).rev().collect()
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn prop_escrow_conservation_and_exhaustiveness(scenario in scenario_strategy(6, 6)) {
        let project_order = in_order(scenario.costs.len());
        let voter_order = in_order(scenario.approvals.len());
        let outcome = run_scenario(&scenario, &project_order, &voter_order);

        let spent: u128 = outcome.result.funded.iter().map(|record| record.amount).sum();
        prop_assert_eq!(spent + outcome.result.remaining, scenario.budget);
        prop_assert_eq!(outcome.remaining, outcome.result.remaining);

        for (logical_index, &project_id) in outcome.project_ids.iter().enumerate() {
            let project = outcome.projects.iter().find(|p| p.id == project_id).unwrap();
            if project.status == ProjectStatus::Unfunded {
                prop_assert!(scenario.costs[logical_index] > outcome.result.remaining);
            }
            if project.status == ProjectStatus::Funded {
                prop_assert!(outcome.result.funded.iter().any(|record| record.project == project_id));
            }
        }
    }

    #[test]
    fn prop_allocation_independent_of_ballot_submission_order(scenario in scenario_strategy(4, 4)) {
        let project_order = in_order(scenario.costs.len());
        let outcome_a = run_scenario(&scenario, &project_order, &in_order(scenario.approvals.len()));
        let outcome_b = run_scenario(&scenario, &project_order, &reversed(scenario.approvals.len()));

        prop_assert_eq!(&outcome_a.project_ids, &outcome_b.project_ids);
        prop_assert_eq!(outcome_a.result.remaining, outcome_b.result.remaining);

        let find = |result: &AllocationResult<ProjectId>, project_id: ProjectId| {
            result.funded.iter().find(|record| record.project == project_id).cloned()
        };

        for &project_id in &outcome_a.project_ids {
            let record_a = find(&outcome_a.result, project_id);
            let record_b = find(&outcome_b.result, project_id);
            match (record_a, record_b) {
                (Some(a), Some(b)) => {
                    prop_assert_eq!(a.stage, b.stage);
                    prop_assert_eq!(a.amount, b.amount);
                }
                (None, None) => {}
                _ => prop_assert!(
                    false,
                    "project {} funded status disagreed between forward and reversed ballot submission order",
                    project_id
                ),
            }
        }
    }
}

fn milestone_split(cost: u128) -> impl Strategy<Value = Vec<u128>> {
    (1usize..=3).prop_flat_map(move |parts| {
        prop::collection::vec(1u128..=20, parts).prop_map(move |weights| {
            let total_weight: u128 = weights.iter().sum();
            let mut amounts: Vec<u128> = weights.iter().map(|w| cost * w / total_weight).collect();
            let assigned: u128 = amounts.iter().sum();
            *amounts.last_mut().unwrap() += cost - assigned;
            amounts
        })
    })
}

fn cost_and_milestones() -> impl Strategy<Value = (u128, Vec<u128>)> {
    (1u128..=1000).prop_flat_map(|cost| milestone_split(cost).prop_map(move |m| (cost, m)))
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_milestone_sum_round_trips_through_storage((cost, milestones) in cost_and_milestones()) {
        let mut contract = new_contract();
        set_ctx(dao(), NearToken::from_yoctonear(1_000_000), 0);
        let round_id = contract.fund_round(RoundConfig {
            budget: 1_000_000,
            opens_at: OPENS_AT,
            closes_at: CLOSES_AT,
            t_min: T_MIN,
        }, None);

        set_ctx(synthetic_account("proposer", 0), NearToken::from_yoctonear(1), 0);
        let project_id = contract.register_project(
            round_id,
            synthetic_account("recipient", 0),
            "t".to_string(),
            "s".to_string(),
            U128(cost),
            milestones.iter().copied().map(U128).collect(),
        );

        let projects = contract.get_projects(round_id);
        let stored = projects.iter().find(|p| p.id == project_id).unwrap();
        let stored_sum: u128 = stored.milestones.iter().map(|m| m.amount).sum();
        prop_assert_eq!(stored_sum, cost);
        prop_assert_eq!(stored.milestones.len(), milestones.len());
    }
}
