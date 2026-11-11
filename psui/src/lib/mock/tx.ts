import type { ProposalKind as DaoProposalKind } from "../dao";
import {
  TxCancelledError,
  TxNetworkError,
  TxRefusedError,
  TxUnknownError,
  type ContractCall,
  type TxOutcome,
} from "../tx";
import { CONTRACT_ID, DAO_ID } from "../near";
import { daoStore } from "./dao";
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

function executeDao(call: ContractCall, signer: string): { value: unknown; logs: string[] } {
  const { args } = call;
  if (call.method === "add_proposal") {
    if (call.deposit !== BigInt(daoStore.policy.proposal_bond)) throw new TxRefusedError("UNKNOWN", "ERR_MIN_BOND");
    const input = args.proposal as { description: string; kind: DaoProposalKind };
    const id = daoStore.proposals.length;
    daoStore.proposals.push({ id, proposer: signer, description: input.description, kind: input.kind, status: "InProgress", vote_counts: {}, votes: {} });
    return { value: id, logs: [] };
  }
  if (call.method === "act_proposal") {
    const proposal = daoStore.proposals.find((p) => p.id === Number(args.id));
    if (!proposal || proposal.status !== "InProgress") throw new TxRefusedError("UNKNOWN", "ERR_PROPOSAL_NOT_READY_FOR_VOTE");
    const council = daoStore.policy.roles.find((r) => r.name === "council")?.kind as { Group: string[] };
    if (!council.Group.includes(signer)) throw new TxRefusedError("UNKNOWN", "ERR_PERMISSION_DENIED");
    proposal.votes[signer] = args.action === "VoteApprove" ? "Approve" : "Reject";
    const approve = Object.values(proposal.votes).filter((v) => v === "Approve").length;
    const reject = Object.values(proposal.votes).filter((v) => v === "Reject").length;
    // Threshold: half the council (the live DAO's [1, 2] policy).
    if (approve * 2 >= council.Group.length) {
      proposal.status = "Approved";
      const action = proposal.kind.FunctionCall!.actions[0];
      const decoded = JSON.parse(atob(action.args).replace(/(?<=[:,[])(\d{16,})(?=[,}\]])/g, '"$1"')) as Record<string, unknown>;
      return execute({ method: action.method_name, args: decoded, deposit: BigInt(action.deposit), gas: BigInt(action.gas) }, DAO_ID);
    }
    if (reject * 2 >= council.Group.length) proposal.status = "Rejected";
    return { value: null, logs: [] };
  }
  throw new Error(`mock DAO: no change method named ${call.method}`);
}

function execute(call: ContractCall, signer: string): { value: unknown; logs: string[] } {
  const { args } = call;
  switch (call.method) {
    case "fund_round": {
      if (signer !== DAO_ID) refuse("ERR_NOT_SPUTNIK_DAO");
      const config = args.config as { budget: string | number; opens_at: number; closes_at: number; t_min: number };
      if (config.closes_at <= config.opens_at) refuse("ERR_INVALID_CONFIG");
      const budget = BigInt(config.budget);
      if (call.deposit !== budget) refuse("ERR_DEPOSIT_MISMATCH");
      const id = store.rounds.length;
      store.rounds.push({
        id,
        config: { budget, opens_at: config.opens_at, closes_at: config.closes_at, t_min: config.t_min },
        phase: "Registration",
        remaining: budget,
        projects: [],
        ballots: [],
        result: null,
      });
      return { value: id, logs: [`RoundFunded round_id=${id}`] };
    }
    case "attest_milestone": {
      if (signer !== DAO_ID) refuse("ERR_NOT_SPUTNIK_DAO");
      const round = roundOf(args);
      if (round.phase !== "Settlement") refuse("ERR_WRONG_PHASE");
      const project = round.projects.find((p) => p.id === Number(args.project_id));
      if (!project) refuse("ERR_PROJECT_NOT_FOUND");
      if (project.status !== "Funded") refuse("ERR_PROJECT_NOT_FUNDED");
      const milestone = project.milestones[Number(args.milestone_index)];
      if (!milestone) refuse("ERR_INVALID_MILESTONE_INDEX");
      if (milestone.attested) refuse("ERR_ALREADY_ATTESTED");
      milestone.attested = true;
      return { value: null, logs: [`MilestoneAttested round_id=${round.id} project_id=${project.id}`] };
    }
    case "return_remaining": {
      if (signer !== DAO_ID) refuse("ERR_NOT_SPUTNIK_DAO");
      const round = roundOf(args);
      if (round.phase !== "Settlement") refuse("ERR_WRONG_PHASE");
      if (round.remainingReturned) refuse("ERR_ALREADY_RETURNED");
      if (round.remaining === 0n) refuse("ERR_NOTHING_TO_RETURN");
      round.remainingReturned = true;
      return { value: null, logs: [`RemainingReturned round_id=${round.id} amount=${round.remaining}`] };
    }
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
  const { value, logs } = call.receiverId && call.receiverId !== CONTRACT_ID ? executeDao(call, signer) : execute(call, signer);
  const hash = `mock-${Math.random().toString(36).slice(2, 10)}`;
  return { hash, logs, value };
}
