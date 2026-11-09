import type { FundingStage, ProjectStatus, RoundPhase } from "../../types/domain";

/** Mock chain head; every fixture height is relative to it. */
export const MOCK_HEAD = 200_000_000;
export const MOCK_MS_PER_BLOCK = 600;
export const MOCK_ACCOUNT = "priya.testnet";

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
    project(0, "Community garden irrigation", "Drip irrigation and rain barrels for the shared garden plots behind the library.", "marcus.testnet", [["0.10", true], ["0.20", true]], "Funded"),
    project(1, "Mesh network repair kit", "Spare radios, mounts and a tool kit so volunteers can fix mesh nodes the same day they fail.", "lena.testnet", [["0.10", true], ["0.15", false]], "Funded"),
    project(2, "Docs translation (ES/PT)", "Spanish and Portuguese translations of the onboarding guides.", "tomas.testnet", [["0.20", false]], "Funded"),
    project(3, "Local meetup series", "Six evening meetups with a venue, snacks and recorded talks.", "ade.testnet", [["0.15", false], ["0.15", false]], "Unfunded"),
    project(4, "Hardware wallet workshops", "Hands-on sessions setting up hardware wallets, devices provided.", "kofi.testnet", [["0.35", false]], "Unfunded"),
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
      project(0, "Open-source grant tracker", "A public dashboard of every grant this DAO has made, sourced from chain data.", "lena.testnet", [["0.30", false], ["0.30", false]], "Funded"),
      project(1, "Validator education course", "A free six-module course on running a validator, with labs.", "kofi.testnet", [["0.50", false], ["0.40", false]]),
      project(2, "Accessibility audit of the DAO site", "An external WCAG audit and a fix list.", "marcus.testnet", [["0.45", false]]),
      project(3, "Community call captions", "Live captions and transcripts for the monthly community call.", "mei.testnet", [["0.20", false]]),
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
      project(0, "Neighbourhood repair café", "Monthly repair sessions with tools, parts and volunteer fixers.", "ade.testnet", [["0.10", false], ["0.20", false]]),
      project(1, "Bike lane safety survey", "Volunteer counts and a short report for the city council.", "tomas.testnet", [["0.50", false]]),
      project(2, "School coding club kits", "Microcontroller kits for two after-school clubs.", "marcus.testnet", [["0.10", false], ["0.10", false]]),
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
      project(0, "Food bank delivery bikes", "Two cargo bikes and maintenance for weekly deliveries.", "lena.testnet", [["0.40", false], ["0.20", false]]),
      project(1, "Open data workshop", "A one-day workshop on publishing local open data.", "tomas.testnet", [["0.15", false]]),
      project(2, "Translation sprint", "A weekend sprint translating the governance handbook.", "ade.testnet", [["0.10", false], ["0.10", false]]),
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
