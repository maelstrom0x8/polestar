use std::fmt;

use math::RationalError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AllocationError {
    DuplicateProject(String),
    ZeroCostProject(String),
    EmptyApprovalSet,
    UnrecognizedProject(String),
    ArithmeticOverflow(RationalError),
    ExhaustivenessViolated {
        remaining: u128,
        cheapest_unfunded_cost: u128,
    },
}

impl fmt::Display for AllocationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::DuplicateProject(id) => write!(f, "Duplicate registered project: {id}"),
            Self::ZeroCostProject(id) => {
                write!(f, "Project {id} has zero cost; model.md §7.1 requires cost > 0")
            }
            Self::EmptyApprovalSet => write!(f, "Ballot's approval set is empty"),
            Self::UnrecognizedProject(id) => {
                write!(f, "Ballot references unrecognized project: {id}")
            }
            Self::ArithmeticOverflow(e) => write!(f, "Rational arithmetic overflow: {e}"),
            Self::ExhaustivenessViolated {
                remaining,
                cheapest_unfunded_cost,
            } => write!(
                f,
                "Completion halted with remaining={remaining} but an unfunded project costs only {cheapest_unfunded_cost}"
            ),
        }
    }
}

impl std::error::Error for AllocationError {}

impl From<RationalError> for AllocationError {
    fn from(e: RationalError) -> Self {
        Self::ArithmeticOverflow(e)
    }
}
