use std::cmp::Ordering;
use std::fmt;
use std::ops::{Add, Div, Mul, Sub};

#[cfg(feature = "borsh")]
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
#[cfg(feature = "schemars")]
use schemars::JsonSchema;
#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};

use crate::error::RationalError;
use crate::gcd::gcd;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
#[cfg_attr(
    feature = "borsh",
    derive(BorshSerialize, BorshDeserialize, BorshSchema)
)]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[cfg_attr(feature = "schemars", derive(JsonSchema))]
pub struct Rational {
    num: u128,
    den: u128,
}

impl Rational {
    pub const ZERO: Self = Self { num: 0, den: 1 };
    pub const ONE: Self = Self { num: 1, den: 1 };

    pub fn new(num: u128, den: u128) -> Result<Self, RationalError> {
        if den == 0 {
            return Err(RationalError::ZeroDenominator);
        }
        if num == 0 {
            return Ok(Self::ZERO);
        }
        let g = gcd(num, den);
        Ok(Self {
            num: num / g,
            den: den / g,
        })
    }

    pub const fn from_u128(n: u128) -> Self {
        Self { num: n, den: 1 }
    }

    pub const fn num(&self) -> u128 {
        self.num
    }

    pub const fn den(&self) -> u128 {
        self.den
    }

    pub const fn is_zero(&self) -> bool {
        self.num == 0
    }

    pub const fn is_one(&self) -> bool {
        self.num == 1 && self.den == 1
    }

    pub fn checked_add(self, other: Self) -> Result<Self, RationalError> {
        if self.is_zero() {
            return Ok(other);
        }
        if other.is_zero() {
            return Ok(self);
        }

        if self.den == other.den {
            let sum_num = self
                .num
                .checked_add(other.num)
                .ok_or(RationalError::Overflow)?;
            Self::new(sum_num, self.den)
        } else {
            let g = gcd(self.den, other.den);
            let d1 = self.den / g;
            let d2 = other.den / g;

            let term1 = self.num.checked_mul(d2).ok_or(RationalError::Overflow)?;
            let term2 = other.num.checked_mul(d1).ok_or(RationalError::Overflow)?;
            let sum_num = term1.checked_add(term2).ok_or(RationalError::Overflow)?;

            let common_den = self.den.checked_mul(d2).ok_or(RationalError::Overflow)?;
            Self::new(sum_num, common_den)
        }
    }

    pub fn checked_sub(self, other: Self) -> Result<Self, RationalError> {
        if other.is_zero() {
            return Ok(self);
        }
        if self < other {
            return Err(RationalError::Overflow);
        }
        if self == other {
            return Ok(Self::ZERO);
        }

        if self.den == other.den {
            let diff_num = self
                .num
                .checked_sub(other.num)
                .ok_or(RationalError::Overflow)?;
            Self::new(diff_num, self.den)
        } else {
            let g = gcd(self.den, other.den);
            let d1 = self.den / g;
            let d2 = other.den / g;

            let term1 = self.num.checked_mul(d2).ok_or(RationalError::Overflow)?;
            let term2 = other.num.checked_mul(d1).ok_or(RationalError::Overflow)?;
            let diff_num = term1.checked_sub(term2).ok_or(RationalError::Overflow)?;

            let common_den = self.den.checked_mul(d2).ok_or(RationalError::Overflow)?;
            Self::new(diff_num, common_den)
        }
    }

    pub fn checked_mul(self, other: Self) -> Result<Self, RationalError> {
        if self.is_zero() || other.is_zero() {
            return Ok(Self::ZERO);
        }

        let g1 = gcd(self.num, other.den);
        let g2 = gcd(other.num, self.den);

        let n1 = self.num / g1;
        let d2 = other.den / g1;
        let n2 = other.num / g2;
        let d1 = self.den / g2;

        let num = n1.checked_mul(n2).ok_or(RationalError::Overflow)?;
        let den = d1.checked_mul(d2).ok_or(RationalError::Overflow)?;

        Self::new(num, den)
    }

    pub fn checked_div(self, other: Self) -> Result<Self, RationalError> {
        if other.is_zero() {
            return Err(RationalError::ZeroDenominator);
        }
        if self.is_zero() {
            return Ok(Self::ZERO);
        }

        let reciprocal = Self {
            num: other.den,
            den: other.num,
        };
        self.checked_mul(reciprocal)
    }
}

impl Default for Rational {
    fn default() -> Self {
        Self::ZERO
    }
}

impl From<u128> for Rational {
    fn from(n: u128) -> Self {
        Self::from_u128(n)
    }
}

impl TryFrom<(u128, u128)> for Rational {
    type Error = RationalError;

    fn try_from(pair: (u128, u128)) -> Result<Self, Self::Error> {
        Self::new(pair.0, pair.1)
    }
}

impl Ord for Rational {
    fn cmp(&self, other: &Self) -> Ordering {
        if self.den == other.den {
            return self.num.cmp(&other.num);
        }

        let g_num = gcd(self.num, other.num);
        let g_den = gcd(self.den, other.den);

        let a_red = self.num / g_num.max(1);
        let c_red = other.num / g_num.max(1);
        let b_red = self.den / g_den.max(1);
        let d_red = other.den / g_den.max(1);

        match (a_red.checked_mul(d_red), c_red.checked_mul(b_red)) {
            (Some(lhs), Some(rhs)) => lhs.cmp(&rhs),
            _ => {
                let q1 = self.num / self.den;
                let q2 = other.num / other.den;
                if q1 != q2 {
                    return q1.cmp(&q2);
                }
                let r1 = match Self::new(self.num % self.den, self.den) {
                    Ok(r) => r,
                    Err(_) => Self::ZERO,
                };
                let r2 = match Self::new(other.num % other.den, other.den) {
                    Ok(r) => r,
                    Err(_) => Self::ZERO,
                };
                if r1.is_zero() && r2.is_zero() {
                    Ordering::Equal
                } else if r1.is_zero() {
                    Ordering::Less
                } else if r2.is_zero() {
                    Ordering::Greater
                } else {
                    let inv1 = match Self::new(r1.den, r1.num) {
                        Ok(v) => v,
                        Err(_) => return Ordering::Equal,
                    };
                    let inv2 = match Self::new(r2.den, r2.num) {
                        Ok(v) => v,
                        Err(_) => return Ordering::Equal,
                    };
                    inv2.cmp(&inv1)
                }
            }
        }
    }
}

impl PartialOrd for Rational {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Add for Rational {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        self.checked_add(rhs).expect("Rational addition overflow")
    }
}

impl Sub for Rational {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        self.checked_sub(rhs).expect("Rational subtraction overflow")
    }
}

impl Mul for Rational {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self::Output {
        self.checked_mul(rhs).expect("Rational multiplication overflow")
    }
}

impl Div for Rational {
    type Output = Self;

    fn div(self, rhs: Self) -> Self::Output {
        self.checked_div(rhs).expect("Rational division overflow or zero denominator")
    }
}

impl fmt::Display for Rational {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.den == 1 {
            write!(f, "{}", self.num)
        } else {
            write!(f, "{}/{}", self.num, self.den)
        }
    }
}

impl fmt::Debug for Rational {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Rational({}/{})", self.num, self.den)
    }
}
