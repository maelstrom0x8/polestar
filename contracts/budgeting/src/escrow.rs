use near_sdk::{env, is_promise_success, near, Gas, NearToken, Promise};

use crate::types::{ProjectId, ProjectStatus, RoundId, RoundPhase};
use crate::{Contract, ContractExt};

const ON_MILESTONE_TRANSFER_GAS: Gas = Gas::from_tgas(5);
const ON_REMAINING_RETURN_GAS: Gas = Gas::from_tgas(5);

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

    pub fn return_remaining(&mut self, round_id: RoundId) -> Promise {
        self.assert_sputnik_dao();

        let round = self.get_round_or_panic(round_id);
        if round.phase != RoundPhase::Settlement {
            env::panic_str("ERR_WRONG_PHASE");
        }
        let mut returned = self.remaining_returned();
        if returned.contains_key(&round_id) {
            env::panic_str("ERR_ALREADY_RETURNED");
        }
        let amount = round.remaining;
        if amount == 0 {
            env::panic_str("ERR_NOTHING_TO_RETURN");
        }

        returned.insert(&round_id, &amount);

        let storage_locked =
            env::storage_byte_cost().saturating_mul(u128::from(env::storage_usage()));
        if env::account_balance()
            .saturating_sub(storage_locked)
            .as_yoctonear()
            < amount
        {
            env::panic_str("ERR_INSUFFICIENT_BALANCE");
        }

        env::log_str(&format!(
            "RemainingReturned round_id={round_id} amount={amount}"
        ));

        Promise::new(self.sputnik_dao_account.clone())
            .transfer(NearToken::from_yoctonear(amount))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(ON_REMAINING_RETURN_GAS)
                    .on_remaining_return(round_id),
            )
    }

    #[private]
    pub fn on_remaining_return(&mut self, round_id: RoundId) {
        if is_promise_success() {
            return;
        }

        self.remaining_returned().remove(&round_id);

        env::log_str(&format!(
            "RemainingReturnFailed round_id={round_id} reason=transfer_failed"
        ));
    }
}
