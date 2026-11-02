pub mod engine;
pub mod error;
pub(crate) mod rho;
pub mod types;

pub use engine::run_allocation;
pub use error::AllocationError;
pub use math::{Rational, RationalError};
pub use types::{AllocationResult, Ballot, FundingRecord, FundingStage, Project};

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;
    use std::collections::BTreeSet;

    fn project(id: &str, cost: u128) -> Project<String> {
        Project::new(id.to_string(), cost)
    }

    fn ballot(voter: &str, approved: &[&str]) -> Ballot<String, String> {
        Ballot::new(
            voter.to_string(),
            approved.iter().map(|s| s.to_string()).collect(),
        )
    }

    #[test]
    fn single_project_funded_by_unanimous_equal_shares() {
        let projects = vec![project("a", 90)];
        let ballots = vec![
            ballot("v1", &["a"]),
            ballot("v2", &["a"]),
            ballot("v3", &["a"]),
        ];
        let result = run_allocation(&projects, &ballots, 90).unwrap();
        assert_eq!(result.funded.len(), 1);
        assert_eq!(result.funded[0].project, "a");
        assert_eq!(result.funded[0].stage, FundingStage::Mes);
        assert_eq!(result.funded[0].amount, 90);
        assert!(result.unfunded.is_empty());
        assert_eq!(result.remaining, 0);
    }

    #[test]
    fn tied_rho_breaks_by_lexicographically_smallest_project_id() {
        let projects = vec![project("projecta", 75), project("projectb", 25)];
        let ballots = vec![
            ballot("v1", &["projecta"]),
            ballot("v2", &["projecta"]),
            ballot("v3", &["projecta"]),
            ballot("v4", &["projectb"]),
        ];
        let result = run_allocation(&projects, &ballots, 100).unwrap();
        assert_eq!(result.funded.len(), 2);
        assert_eq!(result.funded[0].project, "projecta");
        assert_eq!(result.funded[0].stage, FundingStage::Mes);
        assert_eq!(result.funded[1].project, "projectb");
        assert_eq!(result.funded[1].stage, FundingStage::Mes);
        assert_eq!(result.remaining, 0);
    }

    #[test]
    fn completion_stage_funds_highest_density_when_mes_funds_nothing() {
        let projects = vec![project("a", 7), project("b", 8)];
        let ballots = vec![ballot("v1", &["a"]), ballot("v2", &["b"])];
        let result = run_allocation(&projects, &ballots, 10).unwrap();

        assert_eq!(result.funded.len(), 1);
        assert_eq!(result.funded[0].project, "a");
        assert_eq!(result.funded[0].stage, FundingStage::Completion);
        assert_eq!(result.unfunded, vec!["b".to_string()]);
        assert_eq!(result.remaining, 3);
    }

    #[test]
    fn zero_ballots_is_deterministic_but_meaningless() {
        let projects = vec![project("a", 30), project("b", 10)];
        let ballots: Vec<Ballot<String, String>> = vec![];
        let result = run_allocation(&projects, &ballots, 50).unwrap();

        assert_eq!(result.funded.len(), 2);
        assert!(result
            .funded
            .iter()
            .all(|r| r.stage == FundingStage::Completion));
        assert!(result.unfunded.is_empty());
        assert_eq!(result.remaining, 10);
    }

    #[test]
    fn exhaustiveness_holds_when_cheapest_remaining_project_does_not_fit() {
        let projects = vec![project("a", 7), project("b", 8)];
        let ballots = vec![ballot("v1", &["a"]), ballot("v2", &["b"])];
        let result = run_allocation(&projects, &ballots, 10).unwrap();

        for unfunded_id in &result.unfunded {
            let cost = projects.iter().find(|p| &p.id == unfunded_id).unwrap().cost;
            assert!(cost > result.remaining);
        }
    }

    #[test]
    fn ejr_spot_check_cohesive_majority_wins_its_project() {
        let projects = vec![project("popular", 60), project("niche", 10)];
        let ballots = vec![
            ballot("v1", &["popular"]),
            ballot("v2", &["popular"]),
            ballot("v3", &["popular"]),
            ballot("v4", &["niche"]),
        ];
        let result = run_allocation(&projects, &ballots, 70).unwrap();
        let funded_ids: BTreeSet<_> = result.funded.iter().map(|r| r.project.clone()).collect();
        assert!(funded_ids.contains("popular"));
    }

    #[test]
    fn rejects_duplicate_project_id() {
        let projects = vec![project("a", 10), project("a", 20)];
        let ballots: Vec<Ballot<String, String>> = vec![];
        assert_eq!(
            run_allocation(&projects, &ballots, 100),
            Err(AllocationError::DuplicateProject("a".to_string()))
        );
    }

    #[test]
    fn rejects_zero_cost_project() {
        let projects = vec![project("a", 0)];
        let ballots: Vec<Ballot<String, String>> = vec![];
        assert_eq!(
            run_allocation(&projects, &ballots, 100),
            Err(AllocationError::ZeroCostProject("a".to_string()))
        );
    }

    #[test]
    fn rejects_empty_approval_set() {
        let projects = vec![project("a", 10)];
        let ballots = vec![Ballot::new("v1".to_string(), BTreeSet::new())];
        assert_eq!(
            run_allocation(&projects, &ballots, 100),
            Err(AllocationError::EmptyApprovalSet)
        );
    }

    #[test]
    fn rejects_unrecognized_project_in_ballot() {
        let projects = vec![project("a", 10)];
        let ballots = vec![ballot("v1", &["b"])];
        assert_eq!(
            run_allocation(&projects, &ballots, 100),
            Err(AllocationError::UnrecognizedProject("b".to_string()))
        );
    }

    fn arbitrary_scenario(
        max_projects: usize,
        max_voters: usize,
    ) -> impl Strategy<Value = (Vec<Project<String>>, Vec<Ballot<String, String>>, u128)> {
        (1..=max_projects, 1u128..=50)
            .prop_flat_map(move |(num_projects, _)| {
                prop::collection::vec(1u128..=50, num_projects).prop_flat_map(move |costs| {
                    let num_projects = costs.len();
                    (Just(costs), 0..=max_voters).prop_flat_map(move |(costs, num_voters)| {
                        prop::collection::vec(
                            prop::collection::vec(any::<bool>(), num_projects)
                                .prop_filter("at least one approval", |mask| {
                                    mask.iter().any(|&b| b)
                                }),
                            num_voters,
                        )
                        .prop_map(move |masks| (costs.clone(), masks))
                    })
                })
            })
            .prop_flat_map(|(costs, masks)| (Just(costs), Just(masks), 1u128..=600))
            .prop_map(|(costs, masks, budget)| {
                let projects: Vec<Project<String>> = costs
                    .iter()
                    .enumerate()
                    .map(|(i, &cost)| project(&format!("p{i}"), cost))
                    .collect();
                let ballots: Vec<Ballot<String, String>> = masks
                    .iter()
                    .enumerate()
                    .map(|(v, mask)| {
                        let approved: BTreeSet<String> = mask
                            .iter()
                            .enumerate()
                            .filter(|(_, &approve)| approve)
                            .map(|(i, _)| format!("p{i}"))
                            .collect();
                        Ballot::new(format!("v{v}"), approved)
                    })
                    .collect();
                (projects, ballots, budget)
            })
    }

    proptest! {
        #[test]
        fn prop_deterministic((projects, ballots, budget) in arbitrary_scenario(5, 8)) {
            let r1 = run_allocation(&projects, &ballots, budget);
            let r2 = run_allocation(&projects, &ballots, budget);
            prop_assert_eq!(r1, r2);
        }

        #[test]
        fn prop_budget_conservation((projects, ballots, budget) in arbitrary_scenario(5, 8)) {
            let result = run_allocation(&projects, &ballots, budget).unwrap();
            let spent: u128 = result.funded.iter().map(|r| r.amount).sum();
            prop_assert_eq!(spent + result.remaining, budget);
        }

        #[test]
        fn prop_exhaustive((projects, ballots, budget) in arbitrary_scenario(5, 8)) {
            let result = run_allocation(&projects, &ballots, budget).unwrap();
            for id in &result.unfunded {
                let cost = projects.iter().find(|p| &p.id == id).unwrap().cost;
                prop_assert!(cost > result.remaining);
            }
        }
    }
}
