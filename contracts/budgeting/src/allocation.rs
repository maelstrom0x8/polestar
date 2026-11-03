use allocate::{
    AllocationError, AllocationState, AllocationStepOutcome, Ballot as EngineBallot,
    Project as EngineProject,
};
use near_sdk::{env, near, AccountId};

use crate::types::{AllocationProgress, ProjectId, ProjectStatus, RoundId, RoundPhase};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn process_allocation_step(&mut self, round_id: RoundId) -> bool {
        let mut round = self.get_round_or_panic(round_id);
        if round.phase != RoundPhase::Allocation {
            env::panic_str("ERR_WRONG_PHASE");
        }
        let progress = round
            .progress
            .take()
            .unwrap_or_else(|| env::panic_str("ERR_ALLOCATION_INVARIANT_VIOLATED"));

        let projects: Vec<EngineProject<ProjectId>> = round
            .projects
            .iter()
            .map(|(id, project)| EngineProject::new(id, project.cost))
            .collect();
        let ballots: Vec<EngineBallot<ProjectId, AccountId>> = round
            .ballots
            .iter()
            .map(|(voter, ballot)| EngineBallot::new(voter, ballot.approved))
            .collect();

        let mut state = match AllocationState::resume(
            &projects,
            &ballots,
            round.config.budget,
            progress.stage,
            progress.pending,
            progress.voter_budget,
            progress.funded,
            round.remaining,
        ) {
            Ok(state) => state,
            Err(AllocationError::ArithmeticOverflow(_)) => env::panic_str("ERR_RATIONAL_OVERFLOW"),
            Err(_) => env::panic_str("ERR_ALLOCATION_INVARIANT_VIOLATED"),
        };

        let outcome = match state.step() {
            Ok(outcome) => outcome,
            Err(AllocationError::ArithmeticOverflow(_)) => env::panic_str("ERR_RATIONAL_OVERFLOW"),
            Err(_) => env::panic_str("ERR_ALLOCATION_INVARIANT_VIOLATED"),
        };

        let Some(result) = (match outcome {
            AllocationStepOutcome::Selected(record) => {
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
                None
            }
            AllocationStepOutcome::StageAdvanced => None,
            AllocationStepOutcome::Done(result) => Some(result),
        }) else {
            round.remaining = state.remaining();
            round.progress = Some(AllocationProgress {
                stage: state.stage(),
                pending: state.pending().clone(),
                voter_budget: state.voter_budget().clone(),
                funded: state.funded_so_far().to_vec(),
            });
            self.rounds.insert(&round_id, &round);
            return false;
        };

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
        round.progress = None;
        round.phase = RoundPhase::Settlement;
        self.rounds.insert(&round_id, &round);

        env::log_str(&format!(
            "AllocationFinalized round_id={round_id} total_funded={total_funded} remaining={}",
            round.remaining
        ));
        true
    }
}
