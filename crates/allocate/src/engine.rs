use std::collections::{BTreeMap, BTreeSet};
use std::fmt;

use math::Rational;

use crate::error::AllocationError;
use crate::rho::affordability_price;
use crate::types::{AllocationResult, Ballot, FundingRecord, FundingStage, Project};

pub fn run_allocation<P, V>(
    projects: &[Project<P>],
    ballots: &[Ballot<P, V>],
    budget: u128,
) -> Result<AllocationResult<P>, AllocationError>
where
    P: Ord + Clone + fmt::Display,
    V: Ord + Clone,
{
    let mut state = AllocationState::new(projects, ballots, budget)?;
    loop {
        if let AllocationStepOutcome::Done(result) = state.step()? {
            return Ok(result);
        }
    }
}

pub enum AllocationStepOutcome<P> {
    Selected(FundingRecord<P>),
    StageAdvanced,
    Done(AllocationResult<P>),
}

pub struct AllocationState<P: Ord, V: Ord> {
    cost_of: BTreeMap<P, u128>,
    supporters_of: BTreeMap<P, Vec<V>>,
    voter_budget: BTreeMap<V, Rational>,
    pending: BTreeSet<P>,
    funded: Vec<FundingRecord<P>>,
    remaining: u128,
    budget: u128,
    stage: FundingStage,
}

impl<P, V> AllocationState<P, V>
where
    P: Ord + Clone + fmt::Display,
    V: Ord + Clone,
{
    pub fn new(
        projects: &[Project<P>],
        ballots: &[Ballot<P, V>],
        budget: u128,
    ) -> Result<Self, AllocationError> {
        let ProjectIndex {
            cost_of,
            supporters_of,
        } = validate_and_index(projects, ballots)?;

        let n = ballots.len() as u128;
        let mut voter_budget: BTreeMap<V, Rational> = BTreeMap::new();
        if n > 0 {
            let share = Rational::new(budget, n)?;
            for ballot in ballots {
                voter_budget.insert(ballot.voter.clone(), share);
            }
        }

        let pending: BTreeSet<P> = cost_of.keys().cloned().collect();

        Ok(Self {
            cost_of,
            supporters_of,
            voter_budget,
            pending,
            funded: Vec::new(),
            remaining: budget,
            budget,
            stage: FundingStage::Mes,
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub fn resume(
        projects: &[Project<P>],
        ballots: &[Ballot<P, V>],
        budget: u128,
        stage: FundingStage,
        pending: BTreeSet<P>,
        voter_budget: BTreeMap<V, Rational>,
        funded: Vec<FundingRecord<P>>,
        remaining: u128,
    ) -> Result<Self, AllocationError> {
        let ProjectIndex {
            cost_of,
            supporters_of,
        } = validate_and_index(projects, ballots)?;
        Ok(Self {
            cost_of,
            supporters_of,
            voter_budget,
            pending,
            funded,
            remaining,
            budget,
            stage,
        })
    }

    pub fn stage(&self) -> FundingStage {
        self.stage
    }

    pub fn pending(&self) -> &BTreeSet<P> {
        &self.pending
    }

    pub fn voter_budget(&self) -> &BTreeMap<V, Rational> {
        &self.voter_budget
    }

    pub fn funded_so_far(&self) -> &[FundingRecord<P>] {
        &self.funded
    }

    pub fn remaining(&self) -> u128 {
        self.remaining
    }

    pub fn step(&mut self) -> Result<AllocationStepOutcome<P>, AllocationError> {
        match self.stage {
            FundingStage::Mes => {
                let selected = mes_select_one(
                    &self.cost_of,
                    &self.supporters_of,
                    &mut self.voter_budget,
                    &mut self.pending,
                    &mut self.funded,
                    &mut self.remaining,
                )?;
                if selected {
                    Ok(AllocationStepOutcome::Selected(
                        self.funded
                            .last()
                            .cloned()
                            .expect("mes_select_one just pushed a record"),
                    ))
                } else {
                    self.stage = FundingStage::Completion;
                    Ok(AllocationStepOutcome::StageAdvanced)
                }
            }
            FundingStage::Completion => {
                let selected = completion_select_one(
                    &self.cost_of,
                    &self.supporters_of,
                    &mut self.pending,
                    &mut self.funded,
                    &mut self.remaining,
                )?;
                if selected {
                    Ok(AllocationStepOutcome::Selected(
                        self.funded
                            .last()
                            .cloned()
                            .expect("completion_select_one just pushed a record"),
                    ))
                } else {
                    for project_id in &self.pending {
                        let cost = self.cost_of[project_id];
                        if cost <= self.remaining {
                            return Err(AllocationError::ExhaustivenessViolated {
                                remaining: self.remaining,
                                cheapest_unfunded_cost: cost,
                            });
                        }
                    }
                    Ok(AllocationStepOutcome::Done(AllocationResult {
                        budget: self.budget,
                        funded: std::mem::take(&mut self.funded),
                        unfunded: std::mem::take(&mut self.pending).into_iter().collect(),
                        remaining: self.remaining,
                    }))
                }
            }
        }
    }
}

struct ProjectIndex<P, V> {
    cost_of: BTreeMap<P, u128>,
    supporters_of: BTreeMap<P, Vec<V>>,
}

fn validate_and_index<P, V>(
    projects: &[Project<P>],
    ballots: &[Ballot<P, V>],
) -> Result<ProjectIndex<P, V>, AllocationError>
where
    P: Ord + Clone + fmt::Display,
    V: Ord + Clone,
{
    let cost_of = validate_and_index_projects(projects)?;
    validate_ballots(ballots, &cost_of)?;

    let mut supporters_of: BTreeMap<P, Vec<V>> =
        cost_of.keys().cloned().map(|id| (id, Vec::new())).collect();
    for ballot in ballots {
        for project_id in &ballot.approved {
            supporters_of
                .get_mut(project_id)
                .expect("approval set was validated against cost_of above")
                .push(ballot.voter.clone());
        }
    }
    Ok(ProjectIndex {
        cost_of,
        supporters_of,
    })
}

fn validate_and_index_projects<P>(
    projects: &[Project<P>],
) -> Result<BTreeMap<P, u128>, AllocationError>
where
    P: Ord + Clone + fmt::Display,
{
    let mut cost_of = BTreeMap::new();
    for project in projects {
        if cost_of.insert(project.id.clone(), project.cost).is_some() {
            return Err(AllocationError::DuplicateProject(project.id.to_string()));
        }
        if project.cost == 0 {
            return Err(AllocationError::ZeroCostProject(project.id.to_string()));
        }
    }
    Ok(cost_of)
}

fn validate_ballots<P, V>(
    ballots: &[Ballot<P, V>],
    cost_of: &BTreeMap<P, u128>,
) -> Result<(), AllocationError>
where
    P: Ord + Clone + fmt::Display,
{
    for ballot in ballots {
        if ballot.approved.is_empty() {
            return Err(AllocationError::EmptyApprovalSet);
        }
        for project_id in &ballot.approved {
            if !cost_of.contains_key(project_id) {
                return Err(AllocationError::UnrecognizedProject(project_id.to_string()));
            }
        }
    }
    Ok(())
}

fn mes_select_one<P, V>(
    cost_of: &BTreeMap<P, u128>,
    supporters_of: &BTreeMap<P, Vec<V>>,
    voter_budget: &mut BTreeMap<V, Rational>,
    pending: &mut BTreeSet<P>,
    funded: &mut Vec<FundingRecord<P>>,
    remaining: &mut u128,
) -> Result<bool, AllocationError>
where
    P: Ord + Clone,
    V: Ord + Clone,
{
    let mut best: Option<(Rational, &P)> = None;

    for project_id in pending.iter() {
        let cost = cost_of[project_id];
        let supporters = &supporters_of[project_id];
        let Some(rho) = affordability_price(cost, supporters, voter_budget)? else {
            continue;
        };
        best = Some(match best {
            None => (rho, project_id),
            Some((best_rho, best_id)) => {
                if rho < best_rho || (rho == best_rho && project_id < best_id) {
                    (rho, project_id)
                } else {
                    (best_rho, best_id)
                }
            }
        });
    }

    let Some((rho, project_id)) = best else {
        return Ok(false);
    };
    let project_id = project_id.clone();

    for voter in &supporters_of[&project_id] {
        let voter_remaining = voter_budget
            .get_mut(voter)
            .expect("every supporter has a tracked budget");
        let payment = std::cmp::min(*voter_remaining, rho);
        *voter_remaining = voter_remaining.checked_sub(payment)?;
    }

    let cost = cost_of[&project_id];
    *remaining = remaining
        .checked_sub(cost)
        .expect("MES only ever selects a project it has just proven affordable");
    funded.push(FundingRecord {
        project: project_id.clone(),
        stage: FundingStage::Mes,
        amount: cost,
    });
    pending.remove(&project_id);

    Ok(true)
}

fn completion_select_one<P, V>(
    cost_of: &BTreeMap<P, u128>,
    supporters_of: &BTreeMap<P, Vec<V>>,
    pending: &mut BTreeSet<P>,
    funded: &mut Vec<FundingRecord<P>>,
    remaining: &mut u128,
) -> Result<bool, AllocationError>
where
    P: Ord + Clone,
{
    let mut best: Option<(Rational, &P)> = None;

    for project_id in pending.iter() {
        let cost = cost_of[project_id];
        if cost > *remaining {
            continue;
        }
        let support_count = supporters_of[project_id].len() as u128;
        let density = Rational::new(support_count, cost)?;
        best = Some(match best {
            None => (density, project_id),
            Some((best_density, best_id)) => {
                if density > best_density || (density == best_density && project_id < best_id) {
                    (density, project_id)
                } else {
                    (best_density, best_id)
                }
            }
        });
    }

    let Some((_, project_id)) = best else {
        return Ok(false);
    };
    let project_id = project_id.clone();

    let cost = cost_of[&project_id];
    *remaining = remaining
        .checked_sub(cost)
        .expect("completion only ever selects a project within the current remaining budget");
    funded.push(FundingRecord {
        project: project_id.clone(),
        stage: FundingStage::Completion,
        amount: cost,
    });
    pending.remove(&project_id);

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    fn scenario(
        max_projects: usize,
        max_voters: usize,
    ) -> impl Strategy<Value = (Vec<Project<String>>, Vec<Ballot<String, String>>, u128)> {
        (1..=max_projects)
            .prop_flat_map(|num_projects| prop::collection::vec(1u128..=50, num_projects))
            .prop_flat_map(move |costs| {
                let num_projects = costs.len();
                (Just(costs), 1..=max_voters).prop_flat_map(move |(costs, num_voters)| {
                    prop::collection::vec(
                        prop::collection::vec(any::<bool>(), num_projects)
                            .prop_filter("at least one approval", |mask| mask.iter().any(|&b| b)),
                        num_voters,
                    )
                    .prop_map(move |masks| (costs.clone(), masks))
                })
            })
            .prop_flat_map(|(costs, masks)| (Just(costs), Just(masks), 1u128..=600))
            .prop_map(|(costs, masks, budget)| {
                let projects: Vec<Project<String>> = costs
                    .iter()
                    .enumerate()
                    .map(|(i, &cost)| Project::new(format!("p{i}"), cost))
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
        fn prop_inv4_virtual_budget_bounds((projects, ballots, budget) in scenario(5, 8)) {
            let cost_of = validate_and_index_projects(&projects).unwrap();
            validate_ballots(&ballots, &cost_of).unwrap();

            let mut supporters_of: BTreeMap<String, Vec<String>> =
                cost_of.keys().cloned().map(|id| (id, Vec::new())).collect();
            for ballot in &ballots {
                for project_id in &ballot.approved {
                    supporters_of.get_mut(project_id).unwrap().push(ballot.voter.clone());
                }
            }

            let n = ballots.len() as u128;
            let share = Rational::new(budget, n).unwrap();
            let mut voter_budget: BTreeMap<String, Rational> =
                ballots.iter().map(|b| (b.voter.clone(), share)).collect();

            let mut pending: BTreeSet<String> = cost_of.keys().cloned().collect();
            let mut funded: Vec<FundingRecord<String>> = Vec::new();
            let mut remaining = budget;

            loop {
                let selected = mes_select_one(
                    &cost_of,
                    &supporters_of,
                    &mut voter_budget,
                    &mut pending,
                    &mut funded,
                    &mut remaining,
                )
                .unwrap();

                for b in voter_budget.values() {
                    prop_assert!(*b >= Rational::ZERO);
                    prop_assert!(*b <= share);
                }

                if !selected {
                    break;
                }
            }
        }

        #[test]
        fn prop_resume_after_every_step_matches_straight_through((projects, ballots, budget) in scenario(5, 8)) {
            let straight_through = run_allocation(&projects, &ballots, budget).unwrap();

            let mut state = AllocationState::new(&projects, &ballots, budget).unwrap();
            let result = loop {
                let outcome = state.step().unwrap();
                let (stage, pending, voter_budget, funded, remaining) = (
                    state.stage(),
                    state.pending().clone(),
                    state.voter_budget().clone(),
                    state.funded_so_far().to_vec(),
                    state.remaining(),
                );
                state = AllocationState::resume(
                    &projects, &ballots, budget, stage, pending, voter_budget, funded, remaining,
                )
                .unwrap();

                if let AllocationStepOutcome::Done(result) = outcome {
                    break result;
                }
            };

            prop_assert_eq!(result, straight_through);
        }
    }
}
