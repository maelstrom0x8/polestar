use allocate::{AllocationResult, Ballot, FundingRecord, FundingStage, Project};
use serde::Deserialize;

#[derive(Deserialize)]
struct Scenario {
    budget: u128,
    projects: Vec<Project<String>>,
    ballots: Vec<Ballot<String, String>>,
}

fn load_scenario() -> Scenario {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/tests/fixtures/reference_scenario.json"
    );
    let raw = std::fs::read_to_string(path).expect("reference_scenario.json must be readable");
    serde_json::from_str(&raw).expect("reference_scenario.json must deserialize")
}

fn record(project: &str, stage: FundingStage, amount: u128) -> FundingRecord<String> {
    FundingRecord {
        project: project.to_string(),
        stage,
        amount,
    }
}

#[test]
fn matches_independent_python_fraction_reference() {
    let scenario = load_scenario();
    assert_eq!(scenario.ballots.len(), 100);
    assert_eq!(scenario.projects.len(), 6);

    let result = allocate::run_allocation(&scenario.projects, &scenario.ballots, scenario.budget)
        .expect("scenario is well-formed");

    let expected = AllocationResult {
        budget: 1000,
        funded: vec![
            record("p1", FundingStage::Mes, 300),
            record("p2", FundingStage::Mes, 200),
            record("p3", FundingStage::Mes, 150),
            record("p4", FundingStage::Completion, 100),
            record("p5", FundingStage::Completion, 80),
        ],
        unfunded: vec!["p6".to_string()],
        remaining: 170,
    };

    assert_eq!(
        result, expected,
        "Rust engine diverged from the independent Python fractions.Fraction reference"
    );

    let mes_funded = result
        .funded
        .iter()
        .filter(|r| r.stage == FundingStage::Mes)
        .count();
    let completion_funded = result
        .funded
        .iter()
        .filter(|r| r.stage == FundingStage::Completion)
        .count();
    assert_eq!(mes_funded, 3, "scenario must exercise the MES stage");
    assert_eq!(
        completion_funded, 2,
        "scenario must exercise the completion stage"
    );
    assert_eq!(
        result.unfunded.len(),
        1,
        "scenario must exercise PROP-Exhaustive on a genuine leftover"
    );

    let spent: u128 = result.funded.iter().map(|r| r.amount).sum();
    assert_eq!(spent + result.remaining, scenario.budget);
}
