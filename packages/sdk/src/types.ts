export type RoundPhase = "Registration" | "Declaration" | "Allocation" | "Settlement";
export type ProjectStatus = "Pending" | "Funded" | "Unfunded";
export type FundingStage = "Mes" | "Completion";

export interface RoundConfig {
  budget: bigint;
  opensAt: number;
  closesAt: number;
  tMin: number;
}

export interface Round {
  id: number;
  config: RoundConfig;
  phase: RoundPhase;
  remaining: bigint;
  remainingReturned: boolean;
  voterNamespace: string | null;
  projectCount: number;
  ballotCount: number;
}

export interface Milestone {
  amount: bigint;
  attested: boolean;
}

export interface Project {
  id: number;
  proposer: string;
  recipient: string;
  title: string;
  summary: string;
  cost: bigint;
  milestones: Milestone[];
  status: ProjectStatus;
}

export interface Ballot {
  voter: string;
  approved: number[];
}

export interface FundingRecord {
  project: number;
  stage: FundingStage;
  amount: bigint;
}

export interface AllocationResult {
  budget: bigint;
  funded: FundingRecord[];
  unfunded: number[];
  remaining: bigint;
}

export interface Block {
  height: number;
  timestampMs: number;
}

export interface ChainClock extends Block {
  msPerBlock: number | null;
}

export interface Transaction {
  receiverId: string;
  method: string;
  args: Record<string, unknown>;
  deposit: bigint;
  gas: bigint;
}

export interface TransactionOutcome {
  hash: string | null;
  logs: string[];
  value: unknown;
}

export interface FunctionCallAction {
  type: "FunctionCall";
  params: {
    methodName: string;
    args: Uint8Array;
    gas: string;
    deposit: string;
  };
}

export interface RawOutcome {
  transaction?: { hash?: string };
  transaction_outcome?: { id?: string };
  receipts_outcome?: { outcome?: { logs?: string[] } }[];
  status?: { SuccessValue?: string; Failure?: unknown } | string;
}

export interface Signer {
  accountId?: string;
  signAndSendTransaction(transaction: { receiverId: string; actions: FunctionCallAction[] }): Promise<unknown>;
}
