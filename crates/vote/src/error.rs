use std::fmt;
use math::Rational;
use math::RationalError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VoteError {
    ZeroSeats,
    InsufficientCandidates {
        candidates: usize,
        seats: u32,
    },
    DuplicateCandidate(String),
    DuplicatePreference,
    UnrecognizedCandidate(String),
    ArithmeticOverflow(RationalError),
    WeightAccountingMismatch {
        round: u32,
        expected: Rational,
        actual: Rational,
    },
}

impl fmt::Display for VoteError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroSeats => write!(f, "Seat allocation must be greater than zero"),
            Self::InsufficientCandidates { candidates, seats } => {
                write!(
                    f,
                    "Candidate count {candidates} is insufficient for {seats} seats"
                )
            }
            Self::DuplicateCandidate(c) => write!(f, "Duplicate registered candidate: {c}"),
            Self::DuplicatePreference => {
                write!(f, "Ballot contains duplicate ranked preferences")
            }
            Self::UnrecognizedCandidate(c) => {
                write!(f, "Ballot references unrecognized candidate: {c}")
            }
            Self::ArithmeticOverflow(e) => write!(f, "Rational arithmetic overflow: {e}"),
            Self::WeightAccountingMismatch {
                round,
                expected,
                actual,
            } => {
                write!(
                    f,
                    "Ballot weight conservation mismatch at round {round}: expected {expected}, found {actual}"
                )
            }
        }
    }
}

impl std::error::Error for VoteError {}

impl From<RationalError> for VoteError {
    fn from(e: RationalError) -> Self {
        Self::ArithmeticOverflow(e)
    }
}
