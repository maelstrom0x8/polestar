// Mirrors contracts/budgeting/src/types.rs and crates/allocate/src/types.rs.
//
// RoundId/ProjectId are kept as strings here even though the contract's
// wire format sends them as plain numbers (confirmed against the deployed
// testnet contract — see lib/near.ts) — ids are used for routing, Set/Map
// keys and equality checks, not arithmetic, and a string avoids float-vs-
// string key mismatches elsewhere in the app. Amount fields (budget, cost,
// remaining, milestone/funding amounts) are strings because they're u128
// yoctoNEAR values that routinely exceed Number.MAX_SAFE_INTEGER. Counts
// and block heights stay as plain numbers — they're always small in
// practice and are used for arithmetic/display, not as opaque keys.

export type RoundId = string;
export type ProjectId = string;

export type RoundPhase = "Registration" | "Declaration" | "Allocation" | "Settlement";

export interface RoundConfig {
  budget: string;
  opensAt: number;
  closesAt: number;
  tMin: number;
}

export interface Round {
  id: RoundId;
  config: RoundConfig;
  phase: RoundPhase;
  remaining: string;
  projectCount: number;
  ballotCount: number;
}

export type ProjectStatus = "Pending" | "Funded" | "Unfunded";

export interface Milestone {
  amount: string;
  attested: boolean;
}

export interface Project {
  id: ProjectId;
  proposer: string;
  recipient: string;
  title: string;
  summary: string;
  cost: string;
  milestones: Milestone[];
  status: ProjectStatus;
}

export interface Ballot {
  voter: string;
  approved: ProjectId[];
}

export type FundingStage = "Mes" | "Completion";

export interface FundingRecord {
  project: ProjectId;
  stage: FundingStage;
  amount: string;
}

export interface AllocationResult {
  budget: string;
  funded: FundingRecord[];
  unfunded: ProjectId[];
  remaining: string;
}
