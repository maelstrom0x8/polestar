mod allocation;
mod auth;
mod escrow;
mod round;
mod types;

use near_sdk::collections::LookupMap;
use near_sdk::{near, AccountId, BorshStorageKey, PanicOnDefault};

pub use types::{
    BlockHeight, Milestone, Project, ProjectId, ProjectStatus, RoundConfig, RoundId, RoundPhase,
};

#[derive(BorshStorageKey)]
#[near(serializers = [borsh])]
enum StorageKey {
    Rounds,
    FirstSeen,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub(crate) sputnik_dao_account: AccountId,
    pub(crate) next_round_id: RoundId,
    pub(crate) rounds: LookupMap<RoundId, types::RoundState>,
    pub(crate) first_seen: LookupMap<AccountId, BlockHeight>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(sputnik_dao_account: AccountId) -> Self {
        Self {
            sputnik_dao_account,
            next_round_id: 0,
            rounds: LookupMap::new(StorageKey::Rounds),
            first_seen: LookupMap::new(StorageKey::FirstSeen),
        }
    }
}
