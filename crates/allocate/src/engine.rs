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

    let n = ballots.len() as u128;
    let mut voter_budget: BTreeMap<V, Rational> = BTreeMap::new();
    if n > 0 {
        let share = Rational::new(budget, n)?;
        for ballot in ballots {
            voter_budget.insert(ballot.voter.clone(), share);
        }
    }

    let mut pending: BTreeSet<P> = cost_of.keys().cloned().collect();
    let mut funded: Vec<FundingRecord<P>> = Vec::new();
    let mut remaining = budget;

    run_mes_stage(
        &cost_of,
        &supporters_of,
        &mut voter_budget,
        &mut pending,
        &mut funded,
        &mut remaining,
    )?;

    run_completion_stage(
        &cost_of,
        &supporters_of,
        &mut pending,
        &mut funded,
        &mut remaining,
    )?;

    for project_id in &pending {
        let cost = cost_of[project_id];
        if cost <= remaining {
            return Err(AllocationError::ExhaustivenessViolated {
                remaining,
                cheapest_unfunded_cost: cost,
            });
        }
    }

    Ok(AllocationResult {
        budget,
        funded,
        unfunded: pending.into_iter().collect(),
        remaining,
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

fn run_mes_stage<P, V>(
    cost_of: &BTreeMap<P, u128>,
    supporters_of: &BTreeMap<P, Vec<V>>,
    voter_budget: &mut BTreeMap<V, Rational>,
    pending: &mut BTreeSet<P>,
    funded: &mut Vec<FundingRecord<P>>,
    remaining: &mut u128,
) -> Result<(), AllocationError>
where
    P: Ord + Clone,
    V: Ord + Clone,
{
    loop {
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
            break;
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
    }

    Ok(())
}

fn run_completion_stage<P, V>(
    cost_of: &BTreeMap<P, u128>,
    supporters_of: &BTreeMap<P, Vec<V>>,
    pending: &mut BTreeSet<P>,
    funded: &mut Vec<FundingRecord<P>>,
    remaining: &mut u128,
) -> Result<(), AllocationError>
where
    P: Ord + Clone,
{
    loop {
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
            break;
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
    }

    Ok(())
}
