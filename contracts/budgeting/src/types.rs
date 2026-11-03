use std::collections::{BTreeMap, BTreeSet};

use allocate::{AllocationResult, FundingRecord, FundingStage, Rational};
use near_sdk::collections::UnorderedMap;
use near_sdk::near;
use near_sdk::AccountId;

pub type RoundId = u64;
pub type ProjectId = u64;
pub type BlockHeight = u64;

pub const MAX_PROJECTS_PER_ROUND: u64 = 50;
pub const MAX_TITLE_LEN: usize = 200;
pub const MAX_SUMMARY_LEN: usize = 2000;

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RoundPhase {
    Registration,
    Declaration,
    Allocation,
    Settlement,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RoundConfig {
    pub budget: u128,
    pub opens_at: BlockHeight,
    pub closes_at: BlockHeight,
    pub t_min: BlockHeight,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Milestone {
    pub amount: u128,
    pub attested: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProjectStatus {
    Pending,
    Funded,
    Unfunded,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Project {
    pub id: ProjectId,
    pub proposer: AccountId,
    pub recipient: AccountId,
    pub title: String,
    pub summary: String,
    pub cost: u128,
    pub milestones: Vec<Milestone>,
    pub status: ProjectStatus,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Ballot {
    pub voter: AccountId,
    pub approved: BTreeSet<ProjectId>,
}

#[near(serializers = [borsh])]
pub struct AllocationProgress {
    pub stage: FundingStage,
    pub pending: BTreeSet<ProjectId>,
    pub voter_budget: BTreeMap<AccountId, Rational>,
    pub funded: Vec<FundingRecord<ProjectId>>,
}

#[near(serializers = [borsh])]
pub struct RoundState {
    pub id: RoundId,
    pub config: RoundConfig,
    pub phase: RoundPhase,
    pub projects: UnorderedMap<ProjectId, Project>,
    pub ballots: UnorderedMap<AccountId, Ballot>,
    pub next_project_id: ProjectId,
    pub remaining: u128,
    pub result: Option<AllocationResult<ProjectId>>,
    pub progress: Option<AllocationProgress>,
}

pub fn projects_prefix(round_id: RoundId) -> Vec<u8> {
    let mut prefix = b"p".to_vec();
    prefix.extend_from_slice(&round_id.to_le_bytes());
    prefix
}

pub fn ballots_prefix(round_id: RoundId) -> Vec<u8> {
    let mut prefix = b"b".to_vec();
    prefix.extend_from_slice(&round_id.to_le_bytes());
    prefix
}
