use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RationalError {
    ZeroDenominator,
    Overflow,
}

impl fmt::Display for RationalError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroDenominator => write!(f, "Rational error: zero denominator"),
            Self::Overflow => write!(f, "Rational error: 128-bit arithmetic overflow"),
        }
    }
}

impl std::error::Error for RationalError {}
