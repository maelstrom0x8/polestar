use std::collections::BTreeSet;
use std::fmt;
use math::Rational;
use crate::error::VoteError;
use crate::policy::{DroopQuota, LexicographicTieBreaker, QuotaRule, TieBreaker};
use crate::tally::TallyState;
use crate::types::{Ballot, CandidateStatus, ElectionResult, RoundAction, RoundRecord, SurplusTransfer};

pub fn count_votes_default<C, V>(
    candidates: &[C],
    ballots: &mut [Ballot<C, V>],
    seats: u32,
) -> Result<ElectionResult<C>, VoteError>
where
    C: Ord + Clone + fmt::Display,
    V: Clone,
{
    count_votes(
        candidates,
        ballots,
        seats,
        DroopQuota,
        LexicographicTieBreaker,
    )
}

pub fn count_votes<C, V, Q, T>(
    candidates: &[C],
    ballots: &mut [Ballot<C, V>],
    seats: u32,
    quota_rule: Q,
    tie_breaker: T,
) -> Result<ElectionResult<C>, VoteError>
where
    C: Ord + Clone + fmt::Display,
    V: Clone,
    Q: QuotaRule,
    T: TieBreaker<C>,
{
    if seats == 0 {
        return Err(VoteError::ZeroSeats);
    }
    if candidates.len() < seats as usize {
        return Err(VoteError::InsufficientCandidates {
            candidates: candidates.len(),
            seats,
        });
    }

    {
        let mut seen = BTreeSet::new();
        for candidate in candidates {
            if !seen.insert(candidate) {
                return Err(VoteError::DuplicateCandidate(candidate.to_string()));
            }
        }
    }

    let candidate_set: BTreeSet<&C> = candidates.iter().collect();

    for ballot in ballots.iter() {
        let mut seen = BTreeSet::new();
        for preference in &ballot.preferences {
            if !candidate_set.contains(preference) {
                return Err(VoteError::UnrecognizedCandidate(preference.to_string()));
            }
            if !seen.insert(preference) {
                return Err(VoteError::DuplicatePreference);
            }
        }
    }

    let total_ballots = ballots.len() as u64;
    let quota = quota_rule.calculate_quota(total_ballots, seats)?;
    let initial_weight = Rational::from_u128(total_ballots as u128);

    let mut state = TallyState::new(candidates);

    loop {
        if state.elected.len() == seats as usize {
            break;
        }

        let (tallies, exhausted) = state.compute_tallies(candidates, ballots)?;
        state.verify_weight_accounting(quota, initial_weight, &tallies, exhausted)?;

        let continuing = state.continuing_candidates();
        let remaining_seats = seats as usize - state.elected.len();

        if continuing.len() <= remaining_seats {
            let mut ordered = continuing;
            ordered.sort();
            for candidate in &ordered {
                let tally = *tallies
                    .get(candidate)
                    .expect("continuing candidate must exist in tallies");
                state.uncontested_tallies.insert(candidate.clone(), tally);
                state.statuses.insert(candidate.clone(), CandidateStatus::Elected);
                state.elected.push(candidate.clone());
            }
            state.rounds.push(RoundRecord {
                round: state.round_number,
                tallies,
                action: RoundAction::UncontestedElection {
                    candidates: ordered,
                },
            });
            break;
        }

        let mut qualifying: Vec<(C, Rational)> = tallies
            .iter()
            .filter(|(candidate, &tally)| {
                state.statuses.get(candidate) == Some(&CandidateStatus::Continuing) && tally >= quota
            })
            .map(|(c, &t)| (c.clone(), t))
            .collect();

        if !qualifying.is_empty() {
            qualifying.sort_by(|(c1, t1), (c2, t2)| {
                t2.cmp(t1).then_with(|| {
                    let winner = tie_breaker.pick_election_winner(&[c1, c2]);
                    if winner == c1 {
                        std::cmp::Ordering::Less
                    } else {
                        std::cmp::Ordering::Greater
                    }
                })
            });

            let mut transfers = Vec::with_capacity(qualifying.len());

            for (candidate, orig_tally) in &qualifying {
                let surplus = orig_tally.checked_sub(quota)?;
                let transfer_val = if surplus.is_zero() {
                    Rational::ZERO
                } else {
                    surplus.checked_div(*orig_tally)?
                };

                for ballot in ballots.iter_mut() {
                    if let Some(pref) = ballot.active_preference(&state.statuses) {
                        if pref == candidate {
                            if let Some(pos) = ballot.active_index_of(candidate) {
                                ballot.weight = ballot.weight.checked_mul(transfer_val)?;
                                ballot.active_index = (pos + 1) as u32;
                            }
                        }
                    }
                }

                state.statuses.insert(candidate.clone(), CandidateStatus::Elected);
                state.quota_elected_count += 1;
                state.elected.push(candidate.clone());

                transfers.push(SurplusTransfer {
                    candidate: candidate.clone(),
                    surplus,
                    transfer_value: transfer_val,
                });
            }

            state.rounds.push(RoundRecord {
                round: state.round_number,
                tallies,
                action: RoundAction::QuotaElection { transfers },
            });
        } else {
            let mut continuing_tallies: Vec<(C, Rational)> = tallies
                .iter()
                .filter(|(candidate, _)| {
                    state.statuses.get(candidate) == Some(&CandidateStatus::Continuing)
                })
                .map(|(c, &t)| (c.clone(), t))
                .collect();

            continuing_tallies.sort_by(|(c1, t1), (c2, t2)| {
                t1.cmp(t2).then_with(|| {
                    let victim = tie_breaker.pick_elimination_victim(&[c1, c2]);
                    if victim == c1 {
                        std::cmp::Ordering::Less
                    } else {
                        std::cmp::Ordering::Greater
                    }
                })
            });

            let (victim, _) = continuing_tallies
                .into_iter()
                .next()
                .expect("continuing candidate must exist");

            state.statuses.insert(victim.clone(), CandidateStatus::Eliminated);
            state.eliminated.push(victim.clone());

            state.rounds.push(RoundRecord {
                round: state.round_number,
                tallies,
                action: RoundAction::Elimination { candidate: victim },
            });
        }

        state.round_number += 1;
    }

    let exhausted_weight = {
        let mut total_exhausted = Rational::ZERO;
        for ballot in ballots.iter() {
            if ballot.active_preference(&state.statuses).is_none() {
                total_exhausted = total_exhausted.checked_add(ballot.weight)?;
            }
        }
        total_exhausted
    };

    Ok(ElectionResult {
        seats,
        quota,
        total_ballots,
        elected: state.elected,
        eliminated: state.eliminated,
        rounds: state.rounds,
        exhausted_weight,
    })
}
