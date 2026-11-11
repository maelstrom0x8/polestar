import { base64ToUtf8, parsePreservingBigNumbers } from "./serialization.js";
import type { RawOutcome, TransactionOutcome } from "./types.js";

export class PolestarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ViewError extends PolestarError {}

export class ContractPanicError extends ViewError {
  readonly method: string;
  readonly panic: string;
  readonly code: string | null;

  constructor(method: string, panic: string) {
    super(`${method}: ${panic}`);
    this.method = method;
    this.panic = panic;
    this.code = errorCode(panic);
  }
}

export class TransactionCancelledError extends PolestarError {}

export class ContractError extends PolestarError {
  readonly code: string;
  readonly raw: string;

  constructor(code: string, raw: string) {
    super(`${code}: ${raw}`);
    this.code = code;
    this.raw = raw;
  }
}

export class NetworkError extends PolestarError {}

export class TransactionOutcomeUnknownError extends PolestarError {}

export const ERROR_CODES: Readonly<Record<string, string>> = {
  ERR_NOT_SPUTNIK_DAO: "Only the configured SputnikDAO account can call this; submit it as a DAO proposal.",
  ERR_DEPOSIT_MISMATCH: "fund_round must attach exactly the round's budget.",
  ERR_INVALID_CONFIG: "closes_at must be after opens_at.",
  ERR_ROUND_NOT_FOUND: "No round with this id.",
  ERR_WRONG_PHASE: "The round is not in the stage this call needs.",
  ERR_NO_DEPOSIT: "register_project needs a non-zero deposit.",
  ERR_ZERO_COST: "A project's cost must be greater than zero.",
  ERR_TITLE_TOO_LONG: "Title is longer than 200 bytes.",
  ERR_SUMMARY_TOO_LONG: "Summary is longer than 2000 bytes.",
  ERR_TOO_MANY_PROJECTS: "The round already has the maximum of 50 projects.",
  ERR_MILESTONE_SUM_MISMATCH: "Milestone amounts must add up exactly to the cost.",
  ERR_NO_PROJECTS: "Voting can only start once the round has a project.",
  ERR_DECLARATION_CLOSED: "Voting has closed for this round.",
  ERR_DECLARATION_NOT_YET_CLOSED: "Voting can only be ended after closes_at.",
  ERR_NOT_IN_VOTER_NAMESPACE: "This round only accepts votes from direct sub-accounts of its voter namespace.",
  ERR_ALREADY_VOTED: "This account has already voted in this round.",
  ERR_EMPTY_APPROVAL: "A ballot must approve at least one project.",
  ERR_UNREGISTERED_PROJECT: "A ballot named a project that is not in this round.",
  ERR_NO_PRIOR_INTERACTION: "The account was not registered (register_voter or register_project) before opens_at.",
  ERR_ACCOUNT_TOO_NEW: "The account registered later than opens_at minus t_min.",
  ERR_INVALID_STEP_COUNT: "max_steps must be at least 1.",
  ERR_PROJECT_NOT_FOUND: "No project with this id in the round.",
  ERR_PROJECT_NOT_FUNDED: "Only funded projects have payable milestones.",
  ERR_INVALID_MILESTONE_INDEX: "The project has no milestone at this index.",
  ERR_ALREADY_ATTESTED: "This milestone has already been paid.",
  ERR_ALREADY_RETURNED: "This round's remainder has already been returned.",
  ERR_NOTHING_TO_RETURN: "This round has no unallocated budget.",
  ERR_INSUFFICIENT_BALANCE: "The contract's available balance cannot cover this transfer.",
  ERR_RATIONAL_OVERFLOW: "Allocation arithmetic overflowed; the round cannot be counted by this build.",
  ERR_ALLOCATION_INVARIANT_VIOLATED: "An internal allocation invariant failed; report this.",
};

const CANCEL_PATTERN = /reject|cancel|denied|closed|user (?:closed|abort)/i;

export function errorCode(text: string): string | null {
  return /\b(ERR_[A-Z_]+)\b/.exec(text)?.[1] ?? null;
}

export function classifySendError(error: unknown): PolestarError {
  if (error instanceof PolestarError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const code = errorCode(message);
  if (code) return new ContractError(code, message);
  if (CANCEL_PATTERN.test(message)) return new TransactionCancelledError(message);
  return new TransactionOutcomeUnknownError(message);
}

export function readOutcome(raw: RawOutcome): TransactionOutcome {
  const hash = raw.transaction?.hash ?? raw.transaction_outcome?.id ?? null;
  const logs = (raw.receipts_outcome ?? []).flatMap((receipt) => receipt.outcome?.logs ?? []);
  const status = raw.status;
  if (status && typeof status === "object" && "Failure" in status && status.Failure !== undefined) {
    const text = JSON.stringify(status.Failure);
    throw new ContractError(errorCode(text) ?? "UNKNOWN", text);
  }
  let value: unknown = null;
  const encoded = status && typeof status === "object" ? status.SuccessValue : undefined;
  if (encoded) {
    try {
      value = parsePreservingBigNumbers(base64ToUtf8(encoded));
    } catch {
      value = null;
    }
  }
  return { hash, logs, value };
}
