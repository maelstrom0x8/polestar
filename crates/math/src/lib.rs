pub mod error;
pub mod gcd;
pub mod rational;

pub use error::RationalError;
pub use gcd::gcd;
pub use rational::Rational;

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
