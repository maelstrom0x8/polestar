use std::collections::BTreeMap;

#[cfg(feature = "borsh")]
use borsh::{BorshDeserialize, BorshSerialize};
use math::Rational;
#[cfg(feature = "schemars")]
use schemars::JsonSchema;
#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[cfg_attr(feature = "borsh", derive(BorshSerialize, BorshDeserialize))]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[cfg_attr(feature = "schemars", derive(JsonSchema))]
pub enum CandidateStatus {
    Continuing,
    Elected,
    Eliminated,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "borsh", derive(BorshSerialize, BorshDeserialize))]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[cfg_attr(feature = "schemars", derive(JsonSchema))]
pub struct Ballot<C, V = C> {
    pub voter: V,
    pub preferences: Vec<C>,
    pub weight: Rational,
    pub active_index: u32,
}

impl<C, V> Ballot<C, V> {
    pub fn new(voter: V, preferences: Vec<C>) -> Self {
        Self {
            voter,
            preferences,
            weight: Rational::ONE,
            active_index: 0,
        }
    }

    pub fn active_preference<'a>(&'a self, statuses: &BTreeMap<C, CandidateStatus>) -> Option<&'a C>
    where
        C: Ord,
    {
        (self.active_index as usize..self.preferences.len())
            .map(|i| &self.preferences[i])
            .find(|candidate| statuses.get(*candidate) == Some(&CandidateStatus::Continuing))
    }

    pub fn active_index_of(&self, candidate: &C) -> Option<usize>
    where
        C: PartialEq,
    {
        (self.active_index as usize..self.preferences.len())
            .find(|&i| &self.preferences[i] == candidate)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "borsh", derive(BorshSerialize, BorshDeserialize))]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[cfg_attr(feature = "schemars", derive(JsonSchema))]
pub struct SurplusTransfer<C> {
    pub candidate: C,
    pub surplus: Rational,
    pub transfer_value: Rational,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "borsh", derive(BorshSerialize, BorshDeserialize))]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[cfg_attr(feature = "schemars", derive(JsonSchema))]
pub enum RoundAction<C> {
    QuotaElection { transfers: Vec<SurplusTransfer<C>> },
    Elimination { candidate: C },
    UncontestedElection { candidates: Vec<C> },
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "borsh", derive(BorshSerialize, BorshDeserialize))]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[cfg_attr(feature = "serde", serde(bound(deserialize = "C: Deserialize<'de> + Ord")))]
#[cfg_attr(feature = "schemars", derive(JsonSchema))]
pub struct RoundRecord<C: Ord> {
    pub round: u32,
    pub tallies: BTreeMap<C, Rational>,
    pub action: RoundAction<C>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "borsh", derive(BorshSerialize, BorshDeserialize))]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[cfg_attr(feature = "serde", serde(bound(deserialize = "C: Deserialize<'de> + Ord")))]
#[cfg_attr(feature = "schemars", derive(JsonSchema))]
pub struct ElectionResult<C: Ord> {
    pub seats: u32,
    pub quota: Rational,
    pub total_ballots: u64,
    pub elected: Vec<C>,
    pub eliminated: Vec<C>,
    pub rounds: Vec<RoundRecord<C>>,
    pub exhausted_weight: Rational,
}
