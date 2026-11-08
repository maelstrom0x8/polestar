use allocate::AllocationResult;
use near_sdk::{near, AccountId};

use crate::types::{Ballot, Project, ProjectId, RoundConfig};
use crate::{Contract, ContractExt, RoundId, RoundPhase};

#[near(serializers = [json])]
pub struct RoundView {
    pub id: RoundId,
    pub config: RoundConfig,
    pub phase: RoundPhase,
    pub remaining: u128,
    pub project_count: u64,
    pub ballot_count: u64,
}

#[near]
impl Contract {
    pub fn get_round(&self, round_id: RoundId) -> Option<RoundView> {
        let round = self.rounds.get(&round_id)?;
        Some(RoundView {
            id: round.id,
            project_count: round.projects.len(),
            ballot_count: round.ballots.len(),
            config: round.config,
            phase: round.phase,
            remaining: round.remaining,
        })
    }

    pub fn get_round_phase(&self, round_id: RoundId) -> Option<RoundPhase> {
        self.rounds.get(&round_id).map(|round| round.phase)
    }

    pub fn get_projects(&self, round_id: RoundId) -> Vec<Project> {
        match self.rounds.get(&round_id) {
            Some(round) => round.projects.values().collect(),
            None => Vec::new(),
        }
    }

    pub fn get_ballot(&self, round_id: RoundId, voter: AccountId) -> Option<Ballot> {
        self.rounds.get(&round_id)?.ballots.get(&voter)
    }

    pub fn get_allocation_result(&self, round_id: RoundId) -> Option<AllocationResult<ProjectId>> {
        self.rounds.get(&round_id)?.result
    }

    pub fn get_remaining(&self, round_id: RoundId) -> Option<u128> {
        self.rounds.get(&round_id).map(|round| round.remaining)
    }
}
