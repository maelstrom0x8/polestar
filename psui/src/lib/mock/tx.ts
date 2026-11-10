import {
  TxCancelledError,
  TxNetworkError,
  TxRefusedError,
  TxUnknownError,
  type ContractCall,
  type TxOutcome,
} from "../tx";
import { MOCK_ACCOUNT, MOCK_HEAD, type MockRound } from "./fixtures";
import { store } from "./views";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const firstSeen = store.firstSeen;

function refuse(code: string): never {
  throw new TxRefusedError(code, `Smart contract panicked: ${code}`);
}

function roundOf(args: Record<string, unknown>): MockRound {
  const round = store.rounds.find((r) => r.id === Number(args.round_id));
  if (!round || round.unreadable) refuse("ERR_ROUND_NOT_FOUND");
  return round;
}

const utf8Length = (s: string) => new TextEncoder().encode(s).length;

function stepAllocation(round: MockRound): { done: boolean; logs: string[] } {
  if (round.phase !== "Allocation") refuse("ERR_WRONG_PHASE");
  const pending = round.projects.filter((p) => p.status === "Pending").sort((a, b) => a.id - b.id);
  const next = pending.find((p) => p.cost <= round.remaining);
  if (next) {
    next.status = "Funded";
    round.remaining -= next.cost;
    return {
      done: false,
      logs: [`ProjectFunded round_id=${round.id} project_id=${next.id} stage=Mes amount=${next.cost}`],
    };
  }
  const logs: string[] = [];
  for (const p of pending) {
    p.status = "Unfunded";
    logs.push(`ProjectUnfunded round_id=${round.id} project_id=${p.id}`);
  }
  round.phase = "Settlement";
  round.result = {
    budget: round.config.budget,
    funded: round.projects.filter((p) => p.status === "Funded").map((p) => ({ project: p.id, stage: "Mes", amount: p.cost })),
    unfunded: pending.map((p) => p.id),
    remaining: round.remaining,
  };
  logs.push(`AllocationFinalized round_id=${round.id}`);
  return { done: true, logs };
}

function execute(call: ContractCall, signer: string): { value: unknown; logs: string[] } {
  const { args } = call;
  switch (call.method) {
    case "register_voter":
      if (!firstSeen.has(signer)) firstSeen.set(signer, MOCK_HEAD);
      return { value: null, logs: [] };
    case "register_project": {
      const round = roundOf(args);
      if (round.phase !== "Registration") refuse("ERR_WRONG_PHASE");
      if (call.deposit === 0n) refuse("ERR_NO_DEPOSIT");
      const cost = BigInt(args.cost as bigint);
      const amounts = (args.milestone_amounts as bigint[]).map(BigInt);
      if (cost === 0n) refuse("ERR_ZERO_COST");
      if (utf8Length(String(args.title)) > 200) refuse("ERR_TITLE_TOO_LONG");
      if (utf8Length(String(args.summary)) > 2000) refuse("ERR_SUMMARY_TOO_LONG");
      if (round.projects.length >= 50) refuse("ERR_TOO_MANY_PROJECTS");
      if (amounts.reduce((a, b) => a + b, 0n) !== cost) refuse("ERR_MILESTONE_SUM_MISMATCH");
      const id = round.projects.length;
      round.projects.push({
        id,
        proposer: signer,
        recipient: String(args.recipient),
        title: String(args.title),
        summary: String(args.summary),
        cost,
        milestones: amounts.map((amount) => ({ amount, attested: false })),
        status: "Pending",
      });
      if (!firstSeen.has(signer)) firstSeen.set(signer, MOCK_HEAD);
      return { value: id, logs: [`ProjectRegistered round_id=${round.id} project_id=${id}`] };
    }
    case "submit_ballot": {
      const round = roundOf(args);
      if (round.phase !== "Declaration") refuse("ERR_WRONG_PHASE");
      if (MOCK_HEAD > round.config.closes_at) refuse("ERR_DECLARATION_CLOSED");
      if (round.ballots.some((b) => b.voter === signer)) refuse("ERR_ALREADY_VOTED");
      const approved = (args.approved as number[]).map(Number);
      if (approved.length === 0) refuse("ERR_EMPTY_APPROVAL");
      if (approved.some((id) => !round.projects.some((p) => p.id === id))) refuse("ERR_UNREGISTERED_PROJECT");
      const seen = firstSeen.get(signer);
      if (seen === undefined || seen >= round.config.opens_at) refuse("ERR_NO_PRIOR_INTERACTION");
      if (seen + round.config.t_min > round.config.opens_at) refuse("ERR_ACCOUNT_TOO_NEW");
      round.ballots.push({ voter: signer, approved: [...approved].sort((a, b) => a - b) });
      return { value: null, logs: [`BallotSubmitted round_id=${round.id}`] };
    }
    case "open_declaration": {
      const round = roundOf(args);
      if (round.phase !== "Registration") refuse("ERR_WRONG_PHASE");
      if (round.projects.length === 0) refuse("ERR_NO_PROJECTS");
      round.phase = "Declaration";
      return { value: null, logs: [] };
    }
    case "close_declaration": {
      const round = roundOf(args);
      if (round.phase !== "Declaration") refuse("ERR_WRONG_PHASE");
      if (MOCK_HEAD <= round.config.closes_at) refuse("ERR_DECLARATION_NOT_YET_CLOSED");
      round.phase = "Allocation";
      return { value: null, logs: [`DeclarationClosed round_id=${round.id} n=${round.ballots.length}`] };
    }
    case "process_allocation_step": {
      const { done, logs } = stepAllocation(roundOf(args));
      return { value: done, logs };
    }
    default:
      throw new Error(`mock: no change method named ${call.method}`);
  }
}

/**
 * A simulated wallet round trip. `?fail=reject|refuse|network|lost` forces
 * each failure branch so every TxFlow state can be exercised.
 */
export async function mockSend(call: ContractCall): Promise<TxOutcome> {
  const fail = new URLSearchParams(location.search).get("fail");
  await wait(1200);
  if (fail === "reject") throw new TxCancelledError("User rejected the request");
  if (fail === "network") throw new TxNetworkError("Failed to fetch");
  if (fail === "refuse") refuse("ERR_WRONG_PHASE");
  await wait(900);
  if (fail === "lost") throw new TxUnknownError("Request timed out");
  const signer = sessionStorage.getItem("psui:mock-account") ?? MOCK_ACCOUNT;
  const { value, logs } = execute(call, signer);
  const hash = `mock-${Math.random().toString(36).slice(2, 10)}`;
  return { hash, logs, value };
}
