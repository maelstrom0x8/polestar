use std::collections::BTreeMap;
use math::Rational;
use crate::error::VoteError;
use crate::types::{Ballot, CandidateStatus, RoundRecord};

pub(crate) struct TallyState<C: Ord> {
    pub(crate) statuses: BTreeMap<C, CandidateStatus>,
    pub(crate) elected: Vec<C>,
    pub(crate) eliminated: Vec<C>,
    pub(crate) quota_elected_count: u32,
    pub(crate) uncontested_tallies: BTreeMap<C, Rational>,
    pub(crate) rounds: Vec<RoundRecord<C>>,
    pub(crate) round_number: u32,
}

impl<C: Ord + Clone> TallyState<C> {
    pub(crate) fn new(candidates: &[C]) -> Self {
        let statuses = candidates
            .iter()
            .map(|c| (c.clone(), CandidateStatus::Continuing))
            .collect();
        Self {
            statuses,
            elected: Vec::new(),
            eliminated: Vec::new(),
            quota_elected_count: 0,
            uncontested_tallies: BTreeMap::new(),
            rounds: Vec::new(),
            round_number: 1,
        }
    }

    pub(crate) fn continuing_candidates(&self) -> Vec<C> {
        self.statuses
            .iter()
            .filter(|(_, &status)| status == CandidateStatus::Continuing)
            .map(|(c, _)| c.clone())
            .collect()
    }

    pub(crate) fn compute_tallies<V>(
        &self,
        candidates: &[C],
        ballots: &[Ballot<C, V>],
    ) -> Result<(BTreeMap<C, Rational>, Rational), VoteError> {
        let mut tallies: BTreeMap<C, Rational> =
            candidates.iter().map(|c| (c.clone(), Rational::ZERO)).collect();
        let mut exhausted = Rational::ZERO;

        for ballot in ballots.iter() {
            match ballot.active_preference(&self.statuses) {
                Some(candidate) => {
                    let tally = tallies
                        .get_mut(candidate)
                        .expect("active candidate must exist in registered tallies");
                    *tally = tally.checked_add(ballot.weight)?;
                }
                None => {
                    exhausted = exhausted.checked_add(ballot.weight)?;
                }
            }
        }

        Ok((tallies, exhausted))
    }

    pub(crate) fn verify_weight_accounting(
        &self,
        quota: Rational,
        initial_weight: Rational,
        tallies: &BTreeMap<C, Rational>,
        exhausted: Rational,
    ) -> Result<(), VoteError> {
        let mut accumulated = quota.checked_mul(Rational::from_u128(self.quota_elected_count as u128))?;
        for tally in self.uncontested_tallies.values() {
            accumulated = accumulated.checked_add(*tally)?;
        }
        for (candidate, &tally) in tallies {
            if self.statuses.get(candidate) == Some(&CandidateStatus::Continuing) {
                accumulated = accumulated.checked_add(tally)?;
            }
        }
        accumulated = accumulated.checked_add(exhausted)?;

        if accumulated != initial_weight {
            return Err(VoteError::WeightAccountingMismatch {
                round: self.round_number,
                expected: initial_weight,
                actual: accumulated,
            });
        }

        Ok(())
    }
}
