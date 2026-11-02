use near_sdk::{env, is_promise_success, near, Gas, NearToken, Promise};

use crate::types::{ProjectId, ProjectStatus, RoundId, RoundPhase};
use crate::{Contract, ContractExt};

const ON_MILESTONE_TRANSFER_GAS: Gas = Gas::from_tgas(5);

#[near]
impl Contract {
    pub fn attest_milestone(
        &mut self,
        round_id: RoundId,
        project_id: ProjectId,
        milestone_index: u32,
    ) -> Promise {
        self.assert_sputnik_dao();

        let mut round = self.get_round_or_panic(round_id);
        if round.phase != RoundPhase::Settlement {
            env::panic_str("ERR_WRONG_PHASE");
        }
        let mut project = round
            .projects
            .get(&project_id)
            .unwrap_or_else(|| env::panic_str("ERR_PROJECT_NOT_FOUND"));
        if project.status != ProjectStatus::Funded {
            env::panic_str("ERR_PROJECT_NOT_FUNDED");
        }
        let index = milestone_index as usize;
        let milestone = project
            .milestones
            .get(index)
            .unwrap_or_else(|| env::panic_str("ERR_INVALID_MILESTONE_INDEX"));
        if milestone.attested {
            env::panic_str("ERR_ALREADY_ATTESTED");
        }

        let amount = milestone.amount;
        let recipient = project.recipient.clone();
        project.milestones[index].attested = true;
        round.projects.insert(&project_id, &project);
        self.rounds.insert(&round_id, &round);

        env::log_str(&format!(
            "MilestoneAttested round_id={round_id} project_id={project_id} milestone_index={milestone_index}"
        ));

        Promise::new(recipient)
            .transfer(NearToken::from_yoctonear(amount))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(ON_MILESTONE_TRANSFER_GAS)
                    .on_milestone_transfer(round_id, project_id, milestone_index),
            )
    }

    #[private]
    pub fn on_milestone_transfer(
        &mut self,
        round_id: RoundId,
        project_id: ProjectId,
        milestone_index: u32,
    ) {
        if is_promise_success() {
            return;
        }

        let mut round = self.get_round_or_panic(round_id);
        let mut project = round
            .projects
            .get(&project_id)
            .unwrap_or_else(|| env::panic_str("ERR_PROJECT_NOT_FOUND"));
        project.milestones[milestone_index as usize].attested = false;
        round.projects.insert(&project_id, &project);
        self.rounds.insert(&round_id, &round);

        env::log_str(&format!(
            "MilestoneReleaseFailed round_id={round_id} project_id={project_id} milestone_index={milestone_index} reason=transfer_failed"
        ));
    }
}
