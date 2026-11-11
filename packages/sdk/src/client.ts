import { DEFAULT_COUNTING_STEPS, polestarCalls, type RegisterProjectInput } from "./calls.js";
import { classifySendError, readOutcome } from "./errors.js";
import {
  canSubmit,
  canVote,
  governanceCalls,
  proposalBond,
  type DaoPolicy,
  type DaoProposal,
  type FundRoundInput,
  type MilestonePaymentInput,
} from "./governance.js";
import { rpcBlock, rpcView, type BlockFn, type ViewFn } from "./rpc.js";
import { contractJson, toId, toU128 } from "./serialization.js";
import type {
  AllocationResult,
  Ballot,
  Block,
  ChainClock,
  FundingStage,
  Project,
  ProjectStatus,
  RawOutcome,
  Round,
  RoundPhase,
  Signer,
  Transaction,
  TransactionOutcome,
} from "./types.js";

export const DEFAULT_TESTNET_RPC = "https://test.rpc.fastnear.com";

export interface PolestarClientOptions {
  contractId: string;
  daoId: string;
  rpcUrl?: string;
  fetch?: typeof fetch;
  view?: ViewFn;
  block?: BlockFn;
}

interface RoundRaw {
  id: number | string;
  config: { budget: string | number; opens_at: number | string; closes_at: number | string; t_min: number | string };
  phase: RoundPhase;
  remaining: string | number;
  remaining_returned?: boolean;
  voter_namespace?: string | null;
  project_count: number | string;
  ballot_count: number | string;
}

interface ProjectRaw {
  id: number | string;
  proposer: string;
  recipient: string;
  title: string;
  summary: string;
  cost: string | number;
  milestones: { amount: string | number; attested: boolean }[];
  status: ProjectStatus;
}

interface AllocationResultRaw {
  budget: string | number;
  funded: { project: number | string; stage: FundingStage; amount: string | number }[];
  unfunded: (number | string)[];
  remaining: string | number;
}

export function mapRound(raw: RoundRaw): Round {
  return {
    id: toId(raw.id, "round id"),
    config: {
      budget: toU128(raw.config.budget),
      opensAt: toId(raw.config.opens_at, "opens_at"),
      closesAt: toId(raw.config.closes_at, "closes_at"),
      tMin: toId(raw.config.t_min, "t_min"),
    },
    phase: raw.phase,
    remaining: toU128(raw.remaining),
    remainingReturned: raw.remaining_returned ?? false,
    voterNamespace: raw.voter_namespace ?? null,
    projectCount: toId(raw.project_count, "project_count"),
    ballotCount: toId(raw.ballot_count, "ballot_count"),
  };
}

export function mapProject(raw: ProjectRaw): Project {
  return {
    id: toId(raw.id, "project id"),
    proposer: raw.proposer,
    recipient: raw.recipient,
    title: raw.title,
    summary: raw.summary,
    cost: toU128(raw.cost),
    milestones: raw.milestones.map((m) => ({ amount: toU128(m.amount), attested: m.attested })),
    status: raw.status,
  };
}

export function mapAllocationResult(raw: AllocationResultRaw): AllocationResult {
  return {
    budget: toU128(raw.budget),
    funded: raw.funded.map((f) => ({ project: toId(f.project, "project id"), stage: f.stage, amount: toU128(f.amount) })),
    unfunded: raw.unfunded.map((id) => toId(id, "project id")),
    remaining: toU128(raw.remaining),
  };
}

export async function sendTransaction(signer: Signer, transaction: Transaction): Promise<TransactionOutcome> {
  let raw: unknown;
  try {
    raw = await signer.signAndSendTransaction({
      receiverId: transaction.receiverId,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: transaction.method,
            args: new TextEncoder().encode(contractJson(transaction.args)),
            gas: transaction.gas.toString(),
            deposit: transaction.deposit.toString(),
          },
        },
      ],
    });
  } catch (error) {
    throw classifySendError(error);
  }
  return readOutcome((raw ?? {}) as RawOutcome);
}

export class PolestarClient {
  readonly contractId: string;
  readonly daoId: string;
  readonly calls: ReturnType<typeof polestarCalls>;
  readonly governance: PolestarGovernanceReader;
  private readonly viewFn: ViewFn;
  private readonly blockFn: BlockFn;

  constructor(options: PolestarClientOptions) {
    const rpcUrl = options.rpcUrl ?? DEFAULT_TESTNET_RPC;
    this.contractId = options.contractId;
    this.daoId = options.daoId;
    this.viewFn = options.view ?? rpcView(rpcUrl, options.fetch);
    this.blockFn = options.block ?? rpcBlock(rpcUrl, options.fetch);
    this.calls = polestarCalls(options.contractId);
    this.governance = new PolestarGovernanceReader(this);
  }

  view<T>(method: string, args: Record<string, unknown> = {}, contractId = this.contractId): Promise<T> {
    return this.viewFn(method, args, contractId) as Promise<T>;
  }

  async getRoundCount(): Promise<number> {
    return toId(await this.view("get_round_count"), "round count");
  }

  async getRound(roundId: number): Promise<Round | null> {
    const raw = await this.view<RoundRaw | null>("get_round", { round_id: toId(roundId, "round id") });
    return raw ? mapRound(raw) : null;
  }

  async getRoundPhase(roundId: number): Promise<RoundPhase | null> {
    return (await this.view<RoundPhase | null>("get_round_phase", { round_id: toId(roundId, "round id") })) ?? null;
  }

  async getProjects(roundId: number): Promise<Project[]> {
    const raw = await this.view<ProjectRaw[]>("get_projects", { round_id: toId(roundId, "round id") });
    return raw.map(mapProject);
  }

  async getProject(roundId: number, projectId: number): Promise<Project | null> {
    const raw = await this.view<ProjectRaw | null>("get_project", {
      round_id: toId(roundId, "round id"),
      project_id: toId(projectId, "project id"),
    });
    return raw ? mapProject(raw) : null;
  }

  async getProjectSupport(roundId: number, projectId: number): Promise<number> {
    const raw = await this.view("get_project_support", {
      round_id: toId(roundId, "round id"),
      project_id: toId(projectId, "project id"),
    });
    return toId(raw, "support count");
  }

  async getBallot(roundId: number, voter: string): Promise<Ballot | null> {
    const raw = await this.view<{ voter: string; approved: (number | string)[] } | null>("get_ballot", {
      round_id: toId(roundId, "round id"),
      voter,
    });
    return raw ? { voter: raw.voter, approved: raw.approved.map((id) => toId(id, "project id")) } : null;
  }

  async getFirstSeen(accountId: string): Promise<number | null> {
    const raw = await this.view<number | string | null>("get_first_seen", { account_id: accountId });
    return raw === null || raw === undefined ? null : toId(raw, "block height");
  }

  async getAllocationResult(roundId: number): Promise<AllocationResult | null> {
    const raw = await this.view<AllocationResultRaw | null>("get_allocation_result", { round_id: toId(roundId, "round id") });
    return raw ? mapAllocationResult(raw) : null;
  }

  async getRemaining(roundId: number): Promise<bigint | null> {
    const raw = await this.view<string | number | null>("get_remaining", { round_id: toId(roundId, "round id") });
    return raw === null || raw === undefined ? null : toU128(raw);
  }

  getBlock(ref: "final" | number = "final"): Promise<Block> {
    return this.blockFn(ref);
  }

  async getChainClock(sampleSpan = 1_000): Promise<ChainClock> {
    const head = await this.blockFn("final");
    const past = await this.blockFn(head.height - sampleSpan).catch(() => null);
    const msPerBlock = past ? (head.timestampMs - past.timestampMs) / (head.height - past.height) : null;
    return { ...head, msPerBlock: msPerBlock && msPerBlock > 0 ? msPerBlock : null };
  }

  withSigner(signer: Signer): PolestarWriter {
    return new PolestarWriter(this, signer);
  }
}

export class PolestarGovernanceReader {
  readonly calls: ReturnType<typeof governanceCalls>;
  private readonly client: PolestarClient;

  constructor(client: PolestarClient) {
    this.client = client;
    this.calls = governanceCalls(client.daoId, client.contractId);
  }

  getPolicy(): Promise<DaoPolicy> {
    return this.client.view<DaoPolicy>("get_policy", {}, this.client.daoId);
  }

  async getOpenProposals(window = 50): Promise<DaoProposal[]> {
    const last = toId(await this.client.view("get_last_proposal_id", {}, this.client.daoId), "proposal id");
    const from = Math.max(0, last - window);
    const proposals = await this.client.view<DaoProposal[]>("get_proposals", { from_index: from, limit: window }, this.client.daoId);
    return proposals
      .filter((p) => p.status === "InProgress" && p.kind.FunctionCall?.receiver_id === this.client.contractId)
      .sort((a, b) => b.id - a.id);
  }

  async canSubmit(accountId: string): Promise<boolean> {
    return canSubmit(await this.getPolicy(), accountId);
  }

  async canVote(accountId: string): Promise<boolean> {
    return canVote(await this.getPolicy(), accountId);
  }
}

export interface CountingProgress {
  transactions: number;
  outcome: TransactionOutcome;
  done: boolean;
}

export interface CountingOptions {
  maxStepsPerTransaction?: number;
  maxTransactions?: number;
  signal?: AbortSignal;
  onProgress?: (progress: CountingProgress) => void;
}

export interface CountingResult {
  done: boolean;
  transactions: number;
  outcomes: TransactionOutcome[];
}

export class PolestarWriter {
  readonly client: PolestarClient;
  readonly signer: Signer;
  readonly governance: PolestarGovernanceWriter;

  constructor(client: PolestarClient, signer: Signer) {
    this.client = client;
    this.signer = signer;
    this.governance = new PolestarGovernanceWriter(this);
  }

  send(transaction: Transaction): Promise<TransactionOutcome> {
    return sendTransaction(this.signer, transaction);
  }

  registerVoter() {
    return this.send(this.client.calls.registerVoter());
  }

  async registerProject(input: RegisterProjectInput): Promise<{ projectId: number; outcome: TransactionOutcome }> {
    const outcome = await this.send(this.client.calls.registerProject(input));
    return { projectId: toId(outcome.value, "project id"), outcome };
  }

  submitBallot(roundId: number, projectIds: number[]) {
    return this.send(this.client.calls.submitBallot(roundId, projectIds));
  }

  startVoting(roundId: number) {
    return this.send(this.client.calls.startVoting(roundId));
  }

  endVoting(roundId: number) {
    return this.send(this.client.calls.endVoting(roundId));
  }

  async processAllocationStep(roundId: number): Promise<{ done: boolean; outcome: TransactionOutcome }> {
    const outcome = await this.send(this.client.calls.processAllocationStep(roundId));
    return { done: outcome.value === true, outcome };
  }

  async processAllocationSteps(
    roundId: number,
    maxSteps = DEFAULT_COUNTING_STEPS,
  ): Promise<{ done: boolean; outcome: TransactionOutcome }> {
    const outcome = await this.send(this.client.calls.processAllocationSteps(roundId, maxSteps));
    return { done: outcome.value === true, outcome };
  }

  async runCounting(roundId: number, options: CountingOptions = {}): Promise<CountingResult> {
    const outcomes: TransactionOutcome[] = [];
    const limit = options.maxTransactions ?? Number.POSITIVE_INFINITY;
    while (outcomes.length < limit) {
      if (options.signal?.aborted) return { done: false, transactions: outcomes.length, outcomes };
      const { done, outcome } = await this.processAllocationSteps(roundId, options.maxStepsPerTransaction);
      outcomes.push(outcome);
      options.onProgress?.({ transactions: outcomes.length, outcome, done });
      if (done) return { done: true, transactions: outcomes.length, outcomes };
    }
    return { done: false, transactions: outcomes.length, outcomes };
  }
}

export class PolestarGovernanceWriter {
  private readonly writer: PolestarWriter;

  constructor(writer: PolestarWriter) {
    this.writer = writer;
  }

  private async options(description: string, bond?: bigint) {
    return { description, bond: bond ?? proposalBond(await this.writer.client.governance.getPolicy()) };
  }

  private get calls() {
    return this.writer.client.governance.calls;
  }

  async proposeFundRound(input: FundRoundInput, options: { description: string; bond?: bigint }) {
    return this.writer.send(this.calls.proposeFundRound(input, await this.options(options.description, options.bond)));
  }

  async proposeMilestonePayment(input: MilestonePaymentInput, options: { description: string; bond?: bigint }) {
    return this.writer.send(this.calls.proposeMilestonePayment(input, await this.options(options.description, options.bond)));
  }

  async proposeReturnRemaining(roundId: number, options: { description: string; bond?: bigint }) {
    return this.writer.send(this.calls.proposeReturnRemaining(roundId, await this.options(options.description, options.bond)));
  }

  approve(proposal: DaoProposal) {
    return this.writer.send(this.calls.approve(proposal));
  }

  reject(proposal: DaoProposal) {
    return this.writer.send(this.calls.reject(proposal));
  }
}
