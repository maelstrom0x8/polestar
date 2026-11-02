use std::cmp::Ordering;
use std::fmt;
use std::ops::{Add, Div, Mul, Sub};

#[cfg(feature = "borsh")]
use borsh::{BorshDeserialize, BorshSerialize};
#[cfg(feature = "schemars")]
use schemars::JsonSchema;
#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};

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

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
#[cfg_attr(feature = "borsh", derive(BorshSerialize, BorshDeserialize))]
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

pub fn gcd(mut u: u128, mut v: u128) -> u128 {
    if u == 0 {
        return v;
    }
    if v == 0 {
        return u;
    }

    let shift = (u | v).trailing_zeros();
    u >>= u.trailing_zeros();

    loop {
        v >>= v.trailing_zeros();
        if u > v {
            std::mem::swap(&mut u, &mut v);
        }
        v -= u;
        if v == 0 {
            break;
        }
    }

    u << shift
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_canonical_form() {
        let r1 = Rational::new(6, 8).unwrap();
        assert_eq!(r1.num(), 3);
        assert_eq!(r1.den(), 4);

        let r_zero = Rational::new(0, 100).unwrap();
        assert_eq!(r_zero.num(), 0);
        assert_eq!(r_zero.den(), 1);

        assert_eq!(Rational::new(5, 0), Err(RationalError::ZeroDenominator));
    }

    #[test]
    fn test_checked_add() {
        let a = Rational::new(1, 3).unwrap();
        let b = Rational::new(1, 6).unwrap();
        let c = a.checked_add(b).unwrap();
        assert_eq!(c, Rational::new(1, 2).unwrap());
    }

    #[test]
    fn test_checked_sub() {
        let a = Rational::new(1, 2).unwrap();
        let b = Rational::new(1, 3).unwrap();
        let c = a.checked_sub(b).unwrap();
        assert_eq!(c, Rational::new(1, 6).unwrap());

        assert_eq!(b.checked_sub(a), Err(RationalError::Overflow));
    }

    #[test]
    fn test_checked_mul() {
        let a = Rational::new(2, 3).unwrap();
        let b = Rational::new(3, 4).unwrap();
        let c = a.checked_mul(b).unwrap();
        assert_eq!(c, Rational::new(1, 2).unwrap());
    }

    #[test]
    fn test_checked_div() {
        let a = Rational::new(1, 2).unwrap();
        let b = Rational::new(3, 4).unwrap();
        let c = a.checked_div(b).unwrap();
        assert_eq!(c, Rational::new(2, 3).unwrap());

        assert_eq!(a.checked_div(Rational::ZERO), Err(RationalError::ZeroDenominator));
    }

    #[test]
    fn test_ordering() {
        let a = Rational::new(1, 3).unwrap();
        let b = Rational::new(1, 2).unwrap();
        let c = Rational::new(2, 4).unwrap();

        assert!(a < b);
        assert_eq!(b, c);
        assert!(b > a);
    }

    #[test]
    fn test_trait_conversions() {
        let r = Rational::from(42u128);
        assert_eq!(r, Rational::new(42, 1).unwrap());
        let r2 = Rational::try_from((10u128, 5u128)).unwrap();
        assert_eq!(r2, Rational::new(2, 1).unwrap());
        assert_eq!(Rational::default(), Rational::ZERO);
    }

    #[test]
    fn test_gcd_edge_cases() {
        assert_eq!(gcd(0, 0), 0);
        assert_eq!(gcd(0, 7), 7);
        assert_eq!(gcd(7, 0), 7);
        assert_eq!(gcd(12, 18), 6);
        assert_eq!(gcd(101, 103), 1);
    }

    proptest! {
        #[test]
        fn prop_addition_commutative(
            n1 in 0u64..10000u64,
            d1 in 1u64..10000u64,
            n2 in 0u64..10000u64,
            d2 in 1u64..10000u64,
        ) {
            let r1 = Rational::new(n1 as u128, d1 as u128).unwrap();
            let r2 = Rational::new(n2 as u128, d2 as u128).unwrap();
            let sum1 = r1.checked_add(r2).unwrap();
            let sum2 = r2.checked_add(r1).unwrap();
            prop_assert_eq!(sum1, sum2);
        }

        #[test]
        fn prop_multiplication_commutative(
            n1 in 0u64..10000u64,
            d1 in 1u64..10000u64,
            n2 in 0u64..10000u64,
            d2 in 1u64..10000u64,
        ) {
            let r1 = Rational::new(n1 as u128, d1 as u128).unwrap();
            let r2 = Rational::new(n2 as u128, d2 as u128).unwrap();
            let prod1 = r1.checked_mul(r2).unwrap();
            let prod2 = r2.checked_mul(r1).unwrap();
            prop_assert_eq!(prod1, prod2);
        }

        #[test]
        fn prop_identity_operations(
            n in 0u64..10000u64,
            d in 1u64..10000u64,
        ) {
            let r = Rational::new(n as u128, d as u128).unwrap();
            prop_assert_eq!(r.checked_add(Rational::ZERO).unwrap(), r);
            prop_assert_eq!(r.checked_mul(Rational::ONE).unwrap(), r);
            prop_assert_eq!(r.checked_mul(Rational::ZERO).unwrap(), Rational::ZERO);
        }

        #[test]
        fn prop_ordering_consistency(
            n1 in 0u64..10000u64,
            d1 in 1u64..10000u64,
            n2 in 0u64..10000u64,
            d2 in 1u64..10000u64,
        ) {
            let r1 = Rational::new(n1 as u128, d1 as u128).unwrap();
            let r2 = Rational::new(n2 as u128, d2 as u128).unwrap();
            if r1 < r2 {
                prop_assert!(r2 > r1);
                prop_assert_ne!(r1, r2);
            } else if r1 > r2 {
                prop_assert!(r2 < r1);
                prop_assert_ne!(r1, r2);
            } else {
                prop_assert_eq!(r1, r2);
            }
        }
    }
}
