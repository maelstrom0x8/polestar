import type { FundingStage, ProjectStatus, RoundPhase } from "../../types/domain";

/** Mock chain head; every fixture height is relative to it. */
export const MOCK_HEAD = 200_000_000;
export const MOCK_MS_PER_BLOCK = 600;
export const MOCK_ACCOUNT = "priya.testnet";
export const COUNCIL_ACCOUNT = "council.testnet";
export const DEMO_MEMBER_ACCOUNT = "lena.testnet";
export const DEMO_OUTSIDER_ACCOUNT = "jordan.testnet";

export interface DemoRole {
  id: string;
  label: string;
  detail: string;
  account: string;
}

/** Demo-mode role roster: each tile signs in as a different sample account. */
export const DEMO_ROLES: DemoRole[] = [
  { id: "council", label: "The council", detail: "Funds rounds, approves payments", account: COUNCIL_ACCOUNT },
  { id: "priya", label: "Priya", detail: "Member, proposes projects", account: MOCK_ACCOUNT },
  { id: "member", label: "Lena", detail: "Member, votes on projects", account: DEMO_MEMBER_ACCOUNT },
  { id: "outsider", label: "Jordan", detail: "Not a member of the co-op", account: DEMO_OUTSIDER_ACCOUNT },
];

const YOCTO_PER_MILLI = 10n ** 21n;

/** "0.30" NEAR -> yoctoNEAR as bigint (3 decimal places is plenty here). */
export function yocto(near: string): bigint {
  const [whole, frac = ""] = near.split(".");
  return BigInt(whole) * 1000n * YOCTO_PER_MILLI + BigInt((frac + "000").slice(0, 3)) * YOCTO_PER_MILLI;
}

export interface MockProject {
  id: number;
  proposer: string;
  recipient: string;
  title: string;
  summary: string;
  cost: bigint;
  milestones: { amount: bigint; attested: boolean }[];
  status: ProjectStatus;
}

export interface MockRound {
  id: number;
  unreadable?: boolean;
  config: { budget: bigint; opens_at: number; closes_at: number; t_min: number };
  phase: RoundPhase;
  remaining: bigint;
  remainingReturned?: boolean;
  voterNamespace?: string;
  projects: MockProject[];
  ballots: { voter: string; approved: number[] }[];
  result: null | {
    budget: bigint;
    funded: { project: number; stage: FundingStage; amount: bigint }[];
    unfunded: number[];
    remaining: bigint;
  };
}

function project(
  id: number,
  title: string,
  summary: string,
  proposer: string,
  milestones: [string, boolean][],
  status: ProjectStatus = "Pending",
): MockProject {
  const ms = milestones.map(([amount, attested]) => ({ amount: yocto(amount), attested }));
  return {
    id,
    proposer,
    recipient: proposer,
    title,
    summary,
    cost: ms.reduce((sum, m) => sum + m.amount, 0n),
    milestones: ms,
    status,
  };
}

const H = MOCK_HEAD;

function settledRound(): MockRound {
  const projects = [
    project(0, "Shared validator alerting", "One alerting stack for every member's validator, paging into each operator's on-call rota.", "marcus.testnet", [["0.10", true], ["0.20", true]], "Funded"),
    project(1, "RPC failover pool", "A standby pool that takes over any member's RPC traffic within a minute of an outage.", "lena.testnet", [["0.10", true], ["0.15", false]], "Funded"),
    project(2, "Operator runbooks (ES/PT)", "Incident and upgrade runbooks in Spanish and Portuguese for new operators.", "tomas.testnet", [["0.20", false]], "Funded"),
    project(3, "Monthly operator calls", "A recorded monthly call to review incidents and plan protocol upgrades together.", "ade.testnet", [["0.15", false], ["0.15", false]], "Unfunded"),
    project(4, "Hardware key custody pilot", "Hardware security modules for three members' validator keys, as a pilot.", "kofi.testnet", [["0.35", false]], "Unfunded"),
  ];
  return {
    id: 1,
    config: { budget: yocto("1.00"), opens_at: H - 60_000, closes_at: H - 40_000, t_min: 2_000 },
    phase: "Settlement",
    remaining: yocto("0.25"),
    projects,
    ballots: [
      { voter: "priya.testnet", approved: [0, 2] },
      { voter: "omar.testnet", approved: [0, 1] },
      { voter: "jules.testnet", approved: [1, 3] },
      { voter: "mei.testnet", approved: [0, 1, 4] },
      { voter: "sam.testnet", approved: [2] },
      { voter: "ines.testnet", approved: [1, 2, 3] },
    ],
    result: {
      budget: yocto("1.00"),
      funded: [
        { project: 0, stage: "Mes", amount: yocto("0.30") },
        { project: 1, stage: "Mes", amount: yocto("0.25") },
        { project: 2, stage: "Completion", amount: yocto("0.20") },
      ],
      unfunded: [3, 4],
      remaining: yocto("0.25"),
    },
  };
}

function allocatingRound(): MockRound {
  return {
    id: 2,
    config: { budget: yocto("2.00"), opens_at: H - 30_000, closes_at: H - 8_000, t_min: 2_000 },
    phase: "Allocation",
    remaining: yocto("1.40"),
    projects: [
      project(0, "Indexer for the co-op explorer", "A dedicated indexer so the co-op's explorer no longer shares a database with member nodes.", "lena.testnet", [["0.30", false], ["0.30", false]], "Funded"),
      project(1, "Validator onboarding course", "A six-module course for new member operators, with hands-on labs.", "kofi.testnet", [["0.50", false], ["0.40", false]]),
      project(2, "RPC gateway penetration test", "An external penetration test of the shared RPC gateway, with a fix list.", "marcus.testnet", [["0.45", false]]),
      project(3, "Incident postmortem library", "Write-ups of past outages, searchable by symptom, for every member to learn from.", "mei.testnet", [["0.20", false]]),
    ],
    ballots: Array.from({ length: 9 }, (_, i) => ({ voter: `voter${i + 1}.testnet`, approved: [0, i % 2 ? 1 : 3, 2].slice(0, 1 + (i % 3)) })),
    result: null,
  };
}

function declarationRound(): MockRound {
  return {
    id: 3,
    config: { budget: yocto("1.00"), opens_at: H - 6_000, closes_at: H + 13_000, t_min: 2_000 },
    phase: "Declaration",
    remaining: yocto("1.00"),
    projects: [
      project(0, "Archival snapshot mirror", "Daily archival snapshots so members can bootstrap a new node in hours.", "ade.testnet", [["0.10", false], ["0.20", false]]),
      project(1, "São Paulo RPC endpoint", "A public RPC endpoint in São Paulo for wallets and apps in Latin America.", "tomas.testnet", [["0.50", false]]),
      project(2, "Peer-count monitoring", "Alerts when a member's node drops below a healthy number of peers.", "marcus.testnet", [["0.10", false], ["0.10", false]]),
    ],
    ballots: [
      { voter: "omar.testnet", approved: [0, 2] },
      { voter: "jules.testnet", approved: [1] },
      { voter: "mei.testnet", approved: [0] },
      { voter: "sam.testnet", approved: [0, 1, 2] },
      { voter: "ines.testnet", approved: [2] },
      { voter: "kofi.testnet", approved: [0, 1] },
    ],
    result: null,
  };
}

function registrationRound(): MockRound {
  return {
    id: 4,
    config: { budget: yocto("2.00"), opens_at: H + 20_000, closes_at: H + 60_000, t_min: 5_000 },
    phase: "Registration",
    remaining: yocto("2.00"),
    projects: [
      project(0, "Second public indexer", "A second indexer behind the explorer, so one outage doesn't take it down.", "lena.testnet", [["0.40", false], ["0.20", false]]),
      project(1, "Co-op status page", "A public page showing the health of every member endpoint.", "tomas.testnet", [["0.15", false]]),
      project(2, "Upgrade rehearsal node", "A node that rehearses every protocol upgrade a week before members apply it.", "ade.testnet", [["0.10", false], ["0.10", false]]),
    ],
    ballots: [],
    result: null,
  };
}

function emptyRegistrationRound(): MockRound {
  return {
    id: 5,
    config: { budget: yocto("0.50"), opens_at: H + 40_000, closes_at: H + 80_000, t_min: 5_000 },
    phase: "Registration",
    remaining: yocto("0.50"),
    projects: [],
    ballots: [],
    result: null,
  };
}

function unreadableRound(): MockRound {
  return { ...emptyRegistrationRound(), id: 0, unreadable: true };
}

export function createFixtures(): MockRound[] {
  return [unreadableRound(), settledRound(), allocatingRound(), declarationRound(), registrationRound(), emptyRegistrationRound()];
}
