use allocate::{AllocationError, Ballot as EngineBallot, Project as EngineProject};
use near_sdk::{env, near};

use crate::types::{ProjectStatus, RoundId, RoundPhase};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn finalize_allocation(&mut self, round_id: RoundId) {
        let mut round = self.get_round_or_panic(round_id);
        if round.phase != RoundPhase::Allocation {
            env::panic_str("ERR_WRONG_PHASE");
        }

        let projects: Vec<EngineProject<u64>> = round
            .projects
            .iter()
            .map(|(id, project)| EngineProject::new(id, project.cost))
            .collect();
        let ballots: Vec<EngineBallot<u64, _>> = round
            .ballots
            .iter()
            .map(|(voter, ballot)| EngineBallot::new(voter, ballot.approved))
            .collect();

        let result = match allocate::run_allocation(&projects, &ballots, round.config.budget) {
            Ok(result) => result,
            Err(AllocationError::ArithmeticOverflow(_)) => env::panic_str("ERR_RATIONAL_OVERFLOW"),
            Err(_) => env::panic_str("ERR_ALLOCATION_INVARIANT_VIOLATED"),
        };

        for record in &result.funded {
            let mut project = round
                .projects
                .get(&record.project)
                .unwrap_or_else(|| env::panic_str("ERR_ALLOCATION_INVARIANT_VIOLATED"));
            project.status = ProjectStatus::Funded;
            round.projects.insert(&record.project, &project);
            env::log_str(&format!(
                "ProjectFunded round_id={round_id} project_id={} stage={:?} amount={}",
                record.project, record.stage, record.amount
            ));
        }
        for project_id in &result.unfunded {
            let mut project = round
                .projects
                .get(project_id)
                .unwrap_or_else(|| env::panic_str("ERR_ALLOCATION_INVARIANT_VIOLATED"));
            project.status = ProjectStatus::Unfunded;
            round.projects.insert(project_id, &project);
            env::log_str(&format!(
                "ProjectUnfunded round_id={round_id} project_id={project_id}"
            ));
        }

        round.remaining = result.remaining;
        let total_funded: u128 = result.funded.iter().map(|r| r.amount).sum();
        round.result = Some(result);
        round.phase = RoundPhase::Settlement;
        self.rounds.insert(&round_id, &round);

        env::log_str(&format!(
            "AllocationFinalized round_id={round_id} total_funded={total_funded} remaining={}",
            round.remaining
        ));
    }
}
