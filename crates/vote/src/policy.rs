use math::{Rational, RationalError};
use crate::error::VoteError;

pub trait QuotaRule {
    fn calculate_quota(&self, total_ballots: u64, seats: u32) -> Result<Rational, VoteError>;
}

#[derive(Debug, Clone, Copy, Default)]
pub struct DroopQuota;

impl QuotaRule for DroopQuota {
    fn calculate_quota(&self, total_ballots: u64, seats: u32) -> Result<Rational, VoteError> {
        if seats == 0 {
            return Err(VoteError::ZeroSeats);
        }
        let denom = (seats as u128)
            .checked_add(1)
            .ok_or(VoteError::ArithmeticOverflow(RationalError::Overflow))?;
        let q = (total_ballots as u128 / denom)
            .checked_add(1)
            .ok_or(VoteError::ArithmeticOverflow(RationalError::Overflow))?;
        Ok(Rational::from_u128(q))
    }
}

pub trait TieBreaker<C> {
    fn pick_election_winner<'a>(&self, tied: &[&'a C]) -> &'a C;
    fn pick_elimination_victim<'a>(&self, tied: &[&'a C]) -> &'a C;
}

#[derive(Debug, Clone, Copy, Default)]
pub struct LexicographicTieBreaker;

impl<C: Ord> TieBreaker<C> for LexicographicTieBreaker {
    fn pick_election_winner<'a>(&self, tied: &[&'a C]) -> &'a C {
        tied.iter().min().copied().expect("non-empty tied slice")
    }

    fn pick_elimination_victim<'a>(&self, tied: &[&'a C]) -> &'a C {
        tied.iter().max().copied().expect("non-empty tied slice")
    }
}
