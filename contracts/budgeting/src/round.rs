use std::collections::BTreeSet;

use allocate::{
    AllocationError, AllocationState, Ballot as EngineBallot, Project as EngineProject,
};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::{env, near, AccountId, NearToken};

use crate::types::{
    ballots_prefix, projects_prefix, AllocationProgress, Ballot, Milestone, Project, ProjectId,
    ProjectStatus, RoundConfig, RoundId, RoundPhase, RoundState, MAX_PROJECTS_PER_ROUND,
    MAX_SUMMARY_LEN, MAX_TITLE_LEN,
};
use crate::{Contract, ContractExt};

impl Contract {
    pub(crate) fn get_round_or_panic(&self, round_id: RoundId) -> RoundState {
        self.rounds
            .get(&round_id)
            .unwrap_or_else(|| env::panic_str("ERR_ROUND_NOT_FOUND"))
    }

    pub(crate) fn mark_first_seen(&mut self, account: &AccountId) {
        if !self.first_seen.contains_key(account) {
            self.first_seen.insert(account, &env::block_height());
        }
    }
}

#[near]
impl Contract {
    #[payable]
    pub fn fund_round(&mut self, config: RoundConfig) -> RoundId {
        self.assert_sputnik_dao();
        if config.closes_at <= config.opens_at {
            env::panic_str("ERR_INVALID_CONFIG");
        }
        if env::attached_deposit() != NearToken::from_yoctonear(config.budget) {
            env::panic_str("ERR_DEPOSIT_MISMATCH");
        }

        let round_id = self.next_round_id;
        self.next_round_id += 1;

        let round = RoundState {
            id: round_id,
            remaining: config.budget,
            config,
            phase: RoundPhase::Registration,
            projects: UnorderedMap::new(projects_prefix(round_id)),
            ballots: UnorderedMap::new(ballots_prefix(round_id)),
            next_project_id: 0,
            result: None,
            progress: None,
        };
        self.rounds.insert(&round_id, &round);

        env::log_str(&format!(
            "RoundFunded round_id={round_id} budget={} opens_at={} closes_at={}",
            round.config.budget, round.config.opens_at, round.config.closes_at
        ));

        round_id
    }

    #[payable]
    pub fn register_project(
        &mut self,
        round_id: RoundId,
        recipient: AccountId,
        title: String,
        summary: String,
        cost: U128,
        milestone_amounts: Vec<U128>,
    ) -> ProjectId {
        // Amounts cross the JSON boundary as strings (U128): wallet clients
        // build arguments as JavaScript values, which can't hold u128 exactly.
        let cost = cost.0;
        let milestone_amounts: Vec<u128> = milestone_amounts
            .into_iter()
            .map(|amount| amount.0)
            .collect();
        let mut round = self.get_round_or_panic(round_id);
        if round.phase != RoundPhase::Registration {
            env::panic_str("ERR_WRONG_PHASE");
        }
        if env::attached_deposit().is_zero() {
            env::panic_str("ERR_NO_DEPOSIT");
        }
        if cost == 0 {
            env::panic_str("ERR_ZERO_COST");
        }
        if title.len() > MAX_TITLE_LEN {
            env::panic_str("ERR_TITLE_TOO_LONG");
        }
        if summary.len() > MAX_SUMMARY_LEN {
            env::panic_str("ERR_SUMMARY_TOO_LONG");
        }
        if round.projects.len() >= MAX_PROJECTS_PER_ROUND {
            env::panic_str("ERR_TOO_MANY_PROJECTS");
        }

        let mut sum: u128 = 0;
        for amount in &milestone_amounts {
            sum = sum
                .checked_add(*amount)
                .unwrap_or_else(|| env::panic_str("ERR_ARITHMETIC_OVERFLOW"));
        }
        if sum != cost {
            env::panic_str("ERR_MILESTONE_SUM_MISMATCH");
        }

        let proposer = env::predecessor_account_id();
        let project_id = round.next_project_id;
        round.next_project_id += 1;

        let project = Project {
            id: project_id,
            proposer: proposer.clone(),
            recipient,
            title,
            summary,
            cost,
            milestones: milestone_amounts
                .into_iter()
                .map(|amount| Milestone {
                    amount,
                    attested: false,
                })
                .collect(),
            status: ProjectStatus::Pending,
        };
        round.projects.insert(&project_id, &project);
        self.rounds.insert(&round_id, &round);
        self.mark_first_seen(&proposer);

        env::log_str(&format!(
            "ProjectRegistered round_id={round_id} project_id={project_id} cost={cost} milestones={}",
            project.milestones.len()
        ));

        project_id
    }

    pub fn open_declaration(&mut self, round_id: RoundId) {
        let mut round = self.get_round_or_panic(round_id);
        if round.phase != RoundPhase::Registration {
            env::panic_str("ERR_WRONG_PHASE");
        }
        if round.projects.is_empty() {
            env::panic_str("ERR_NO_PROJECTS");
        }
        round.phase = RoundPhase::Declaration;
        self.rounds.insert(&round_id, &round);
        env::log_str(&format!("DeclarationOpened round_id={round_id}"));
    }

    pub fn register_voter(&mut self) {
        self.mark_first_seen(&env::predecessor_account_id());
    }

    pub fn submit_ballot(&mut self, round_id: RoundId, approved: BTreeSet<ProjectId>) {
        let mut round = self.get_round_or_panic(round_id);
        if round.phase != RoundPhase::Declaration {
            env::panic_str("ERR_WRONG_PHASE");
        }
        if env::block_height() > round.config.closes_at {
            env::panic_str("ERR_DECLARATION_CLOSED");
        }

        let voter = env::predecessor_account_id();
        if round.ballots.get(&voter).is_some() {
            env::panic_str("ERR_ALREADY_VOTED");
        }
        if approved.is_empty() {
            env::panic_str("ERR_EMPTY_APPROVAL");
        }
        for project_id in &approved {
            if round.projects.get(project_id).is_none() {
                env::panic_str("ERR_UNREGISTERED_PROJECT");
            }
        }

        let first_seen = self
            .first_seen
            .get(&voter)
            .unwrap_or_else(|| env::panic_str("ERR_NO_PRIOR_INTERACTION"));
        if first_seen >= round.config.opens_at {
            env::panic_str("ERR_NO_PRIOR_INTERACTION");
        }
        if first_seen + round.config.t_min > round.config.opens_at {
            env::panic_str("ERR_ACCOUNT_TOO_NEW");
        }

        let approval_count = approved.len();
        round.ballots.insert(
            &voter,
            &Ballot {
                voter: voter.clone(),
                approved,
            },
        );
        self.rounds.insert(&round_id, &round);

        env::log_str(&format!(
            "BallotSubmitted round_id={round_id} voter={voter} approved_count={approval_count}"
        ));
    }

    pub fn close_declaration(&mut self, round_id: RoundId) {
        let mut round = self.get_round_or_panic(round_id);
        if round.phase != RoundPhase::Declaration {
            env::panic_str("ERR_WRONG_PHASE");
        }
        if env::block_height() <= round.config.closes_at {
            env::panic_str("ERR_DECLARATION_NOT_YET_CLOSED");
        }

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
        let state = match AllocationState::new(&projects, &ballots, round.config.budget) {
            Ok(state) => state,
            Err(AllocationError::ArithmeticOverflow(_)) => env::panic_str("ERR_RATIONAL_OVERFLOW"),
            Err(_) => env::panic_str("ERR_ALLOCATION_INVARIANT_VIOLATED"),
        };
        round.progress = Some(AllocationProgress {
            stage: state.stage(),
            pending: state.pending().clone(),
            voter_budget: state.voter_budget().clone(),
            funded: state.funded_so_far().to_vec(),
        });

        round.phase = RoundPhase::Allocation;
        let ballot_count = round.ballots.len();
        self.rounds.insert(&round_id, &round);

        env::log_str(&format!(
            "DeclarationClosed round_id={round_id} n={ballot_count}"
        ));
    }
}
