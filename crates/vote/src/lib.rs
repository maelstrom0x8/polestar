pub mod error;
pub mod policy;
pub mod types;
pub(crate) mod tally;
pub mod engine;

pub use error::VoteError;
pub use policy::{DroopQuota, LexicographicTieBreaker, QuotaRule, TieBreaker};
pub use types::{Ballot, CandidateStatus, ElectionResult, RoundAction, RoundRecord, SurplusTransfer};
pub use engine::{count_votes, count_votes_default};
pub use math::{Rational, RationalError};

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_droop_quota() {
        let q = DroopQuota;
        assert_eq!(q.calculate_quota(100, 3).unwrap(), Rational::from_u128(26));
        assert_eq!(q.calculate_quota(99, 3).unwrap(), Rational::from_u128(25));
        assert_eq!(q.calculate_quota(7, 3).unwrap(), Rational::from_u128(2));
        assert_eq!(q.calculate_quota(1, 1).unwrap(), Rational::from_u128(1));
        assert!(matches!(q.calculate_quota(5, 0), Err(VoteError::ZeroSeats)));
    }

    #[test]
    fn test_compile_time_generic_with_static_str() {
        let candidates = ["alice", "bob"];
        let mut ballots = [
            Ballot::new("voter1", vec!["alice", "bob"]),
        ];
        let r = count_votes_default(&candidates, &mut ballots, 2).unwrap();
        assert_eq!(r.elected.len(), 2);
        assert!(r.elected.contains(&"alice"));
        assert!(r.elected.contains(&"bob"));
        assert!(matches!(r.rounds[0].action, RoundAction::UncontestedElection { .. }));
    }

    #[test]
    fn test_clear_quota_winner() {
        let candidates = vec!["alice".to_string(), "bob".to_string(), "carol".to_string()];
        let mut ballots = vec![
            Ballot::new("v1".to_string(), vec!["alice".to_string()]),
            Ballot::new("v2".to_string(), vec!["alice".to_string()]),
            Ballot::new("v3".to_string(), vec!["alice".to_string()]),
            Ballot::new("v4".to_string(), vec!["bob".to_string()]),
            Ballot::new("v5".to_string(), vec!["carol".to_string()]),
        ];
        let r = count_votes_default(&candidates, &mut ballots, 1).unwrap();
        assert_eq!(r.quota, Rational::from_u128(3));
        assert_eq!(r.elected, vec!["alice".to_string()]);
    }

    #[test]
    fn test_surplus_transfer_exact_weights() {
        let candidates = vec!["alice".to_string(), "bob".to_string(), "carol".to_string()];
        let mut ballots = vec![
            Ballot::new("v1".to_string(), vec!["alice".to_string(), "bob".to_string()]),
            Ballot::new("v2".to_string(), vec!["alice".to_string(), "bob".to_string()]),
            Ballot::new("v3".to_string(), vec!["alice".to_string(), "carol".to_string()]),
            Ballot::new("v4".to_string(), vec!["alice".to_string(), "carol".to_string()]),
            Ballot::new("v5".to_string(), vec!["bob".to_string()]),
        ];
        let r = count_votes_default(&candidates, &mut ballots, 2).unwrap();
        assert_eq!(r.elected.len(), 2);
        assert_eq!(r.elected[0], "alice");
        assert_eq!(r.elected[1], "bob");

        let t1 = match &r.rounds[0].action {
            RoundAction::QuotaElection { transfers } => &transfers[0],
            _ => panic!("expected QuotaElection in round 1"),
        };
        assert_eq!(t1.candidate, "alice");
        assert_eq!(t1.surplus, Rational::new(2, 1).unwrap());
        assert_eq!(t1.transfer_value, Rational::new(1, 2).unwrap());
    }

    #[test]
    fn test_elimination_tiebreak_policy() {
        let candidates = vec!["alice".to_string(), "bob".to_string(), "carol".to_string()];
        let mut ballots = vec![
            Ballot::new("v1".to_string(), vec!["alice".to_string()]),
            Ballot::new("v2".to_string(), vec!["bob".to_string()]),
            Ballot::new("v3".to_string(), vec!["carol".to_string()]),
        ];
        let r = count_votes_default(&candidates, &mut ballots, 2).unwrap();
        let first_victim = match &r.rounds[0].action {
            RoundAction::Elimination { candidate } => candidate.as_str(),
            _ => panic!("expected Elimination in round 1"),
        };
        assert_eq!(first_victim, "carol");
        assert!(!r.eliminated.contains(&"alice".to_string()));
    }

    #[test]
    fn test_gate_1_100_ballots_6_candidates_3_seats() {
        let candidates = vec![
            "cand_a".to_string(),
            "cand_b".to_string(),
            "cand_c".to_string(),
            "cand_d".to_string(),
            "cand_e".to_string(),
            "cand_f".to_string(),
        ];
        let mut ballots = Vec::with_capacity(100);
        for i in 0..28 {
            ballots.push(Ballot::new(format!("v_{i}"), vec!["cand_a".to_string(), "cand_b".to_string(), "cand_c".to_string()]));
        }
        for i in 28..52 {
            ballots.push(Ballot::new(format!("v_{i}"), vec!["cand_b".to_string(), "cand_c".to_string(), "cand_d".to_string()]));
        }
        for i in 52..70 {
            ballots.push(Ballot::new(format!("v_{i}"), vec!["cand_c".to_string(), "cand_d".to_string(), "cand_e".to_string()]));
        }
        for i in 70..84 {
            ballots.push(Ballot::new(format!("v_{i}"), vec!["cand_d".to_string(), "cand_e".to_string(), "cand_f".to_string()]));
        }
        for i in 84..94 {
            ballots.push(Ballot::new(format!("v_{i}"), vec!["cand_e".to_string(), "cand_f".to_string(), "cand_a".to_string()]));
        }
        for i in 94..100 {
            ballots.push(Ballot::new(format!("v_{i}"), vec!["cand_f".to_string(), "cand_a".to_string(), "cand_b".to_string()]));
        }

        let res = count_votes_default(&candidates, &mut ballots, 3).unwrap();
        assert_eq!(res.seats, 3);
        assert_eq!(res.total_ballots, 100);
        assert_eq!(res.quota, Rational::from_u128(26));
        assert_eq!(res.elected.len(), 3);
        assert_eq!(res.elected[0], "cand_a");
        assert!(res.rounds.len() <= 6);
    }

    #[test]
    fn test_rejects_insufficient_candidates() {
        let candidates = vec!["alice".to_string()];
        let mut ballots = vec![Ballot::new("v1".to_string(), vec!["alice".to_string()])];
        assert!(matches!(
            count_votes_default(&candidates, &mut ballots, 2),
            Err(VoteError::InsufficientCandidates { candidates: 1, seats: 2 })
        ));
    }

    #[test]
    fn test_rejects_duplicate_preference() {
        let candidates = vec!["alice".to_string(), "bob".to_string()];
        let mut ballots = vec![
            Ballot::new("v1".to_string(), vec!["alice".to_string(), "alice".to_string()]),
        ];
        assert_eq!(
            count_votes_default(&candidates, &mut ballots, 1),
            Err(VoteError::DuplicatePreference)
        );
    }

    #[test]
    fn test_rejects_unrecognized_candidate() {
        let candidates = vec!["alice".to_string()];
        let mut ballots = vec![
            Ballot::new("v1".to_string(), vec!["unknown".to_string()]),
        ];
        assert_eq!(
            count_votes_default(&candidates, &mut ballots, 1),
            Err(VoteError::UnrecognizedCandidate("unknown".to_string()))
        );
    }

    proptest! {
        #[test]
        fn prop_seat_invariant_and_conservation(
            v1 in 1u32..5u32,
            v2 in 1u32..5u32,
            v3 in 1u32..5u32,
            v4 in 1u32..5u32,
        ) {
            let candidates = vec!["a".to_string(), "b".to_string(), "c".to_string(), "d".to_string()];
            let mut ballots = Vec::new();
            let mut id = 0;
            for _ in 0..v1 {
                ballots.push(Ballot::new(format!("v{id}"), vec!["a".to_string(), "b".to_string()]));
                id += 1;
            }
            for _ in 0..v2 {
                ballots.push(Ballot::new(format!("v{id}"), vec!["b".to_string(), "c".to_string()]));
                id += 1;
            }
            for _ in 0..v3 {
                ballots.push(Ballot::new(format!("v{id}"), vec!["c".to_string(), "d".to_string()]));
                id += 1;
            }
            for _ in 0..v4 {
                ballots.push(Ballot::new(format!("v{id}"), vec!["d".to_string(), "a".to_string()]));
                id += 1;
            }
            let res = count_votes_default(&candidates, &mut ballots, 2);
            prop_assert!(res.is_ok());
            let r = res.unwrap();
            prop_assert_eq!(r.elected.len(), 2);
        }
    }
}
