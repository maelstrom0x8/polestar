import { base64ToUtf8, contractJson, parsePreservingBigNumbers, toId, toU128, utf8ToBase64 } from "./serialization.js";
import type { Transaction } from "./types.js";
import { TGAS, isValidAccountId } from "./units.js";

export interface PolicyRole {
  name: string;
  kind: "Everyone" | { Group: string[] } | { Member: string };
  permissions: string[];
}

export interface DaoPolicy {
  roles: PolicyRole[];
  proposal_bond: string;
  [field: string]: unknown;
}

export interface ProposalAction {
  method_name: string;
  args: string;
  deposit: string;
  gas: string;
}

export interface ProposalKind {
  FunctionCall?: { receiver_id: string; actions: ProposalAction[] };
  [other: string]: unknown;
}

export type ProposalStatus = "InProgress" | "Approved" | "Rejected" | "Removed" | "Expired" | "Moved" | "Failed";

export interface DaoProposal {
  id: number;
  proposer: string;
  description: string;
  kind: ProposalKind;
  status: ProposalStatus;
  vote_counts: Record<string, string[]>;
  votes: Record<string, string>;
  [field: string]: unknown;
}

export interface DecodedAction {
  receiverId: string;
  method: string;
  args: Record<string, unknown> | null;
  deposit: bigint;
  gas: bigint;
}

export interface FundRoundInput {
  budget: bigint;
  opensAt: number;
  closesAt: number;
  tMin?: number;
  voterNamespace?: string;
}

export interface MilestonePaymentInput {
  roundId: number;
  projectId: number;
  milestoneIndex: number;
}

export interface ProposalOptions {
  description: string;
  bond: bigint;
}

export type VoteAction = "VoteApprove" | "VoteReject" | "VoteRemove";

function allows(role: PolicyRole, accountId: string, action: string): boolean {
  const member =
    role.kind === "Everyone" ||
    ("Group" in role.kind && role.kind.Group.includes(accountId)) ||
    ("Member" in role.kind && role.kind.Member === accountId);
  return member && role.permissions.some((p) => p === `*:${action}` || p === `call:${action}` || p === "*:*");
}

export function canSubmit(policy: DaoPolicy, accountId: string): boolean {
  return policy.roles.some((role) => allows(role, accountId, "AddProposal"));
}

export function canVote(policy: DaoPolicy, accountId: string): boolean {
  return policy.roles.some((role) => allows(role, accountId, "VoteApprove"));
}

export function proposalBond(policy: DaoPolicy): bigint {
  return toU128(policy.proposal_bond);
}

export function approvalCount(proposal: DaoProposal): number {
  return Object.values(proposal.votes).filter((vote) => vote === "Approve").length;
}

export function decodeProposalAction(proposal: DaoProposal): DecodedAction | null {
  const call = proposal.kind.FunctionCall;
  const action = call?.actions[0];
  if (!call || !action) return null;
  let args: Record<string, unknown> | null = null;
  try {
    args = parsePreservingBigNumbers(base64ToUtf8(action.args)) as Record<string, unknown>;
  } catch {
    args = null;
  }
  return {
    receiverId: call.receiver_id,
    method: action.method_name,
    args,
    deposit: toU128(action.deposit),
    gas: BigInt(action.gas),
  };
}

export function governanceCalls(daoId: string, contractId: string) {
  const propose = (action: Transaction, options: ProposalOptions): Transaction => ({
    receiverId: daoId,
    method: "add_proposal",
    args: {
      proposal: {
        description: options.description,
        kind: {
          FunctionCall: {
            receiver_id: action.receiverId,
            actions: [
              {
                method_name: action.method,
                args: utf8ToBase64(contractJson(action.args)),
                deposit: action.deposit.toString(),
                gas: action.gas.toString(),
              },
            ],
          },
        },
      },
    },
    deposit: toU128(options.bond),
    gas: 50n * TGAS,
  });

  const vote = (proposal: DaoProposal, action: VoteAction): Transaction => ({
    receiverId: daoId,
    method: "act_proposal",
    args: { id: toId(proposal.id, "proposal id"), action, proposal: proposal.kind, memo: null },
    deposit: 0n,
    gas: 300n * TGAS,
  });

  return {
    propose,

    proposeFundRound(input: FundRoundInput, options: ProposalOptions): Transaction {
      const budget = toU128(input.budget);
      if (budget === 0n) throw new RangeError("budget must be greater than zero");
      if (input.voterNamespace !== undefined && !isValidAccountId(input.voterNamespace)) {
        throw new RangeError(`${input.voterNamespace} is not a valid NEAR account id`);
      }
      const args: Record<string, unknown> = {
        config: {
          budget,
          opens_at: toId(input.opensAt, "opensAt"),
          closes_at: toId(input.closesAt, "closesAt"),
          t_min: toId(input.tMin ?? 0, "tMin"),
        },
      };
      if (input.voterNamespace !== undefined) args.voter_namespace = input.voterNamespace;
      return propose({ receiverId: contractId, method: "fund_round", args, deposit: budget, gas: 100n * TGAS }, options);
    },

    proposeMilestonePayment(input: MilestonePaymentInput, options: ProposalOptions): Transaction {
      return propose(
        {
          receiverId: contractId,
          method: "attest_milestone",
          args: {
            round_id: toId(input.roundId, "round id"),
            project_id: toId(input.projectId, "project id"),
            milestone_index: toId(input.milestoneIndex, "milestone index"),
          },
          deposit: 0n,
          gas: 150n * TGAS,
        },
        options,
      );
    },

    proposeReturnRemaining(roundId: number, options: ProposalOptions): Transaction {
      return propose(
        { receiverId: contractId, method: "return_remaining", args: { round_id: toId(roundId, "round id") }, deposit: 0n, gas: 50n * TGAS },
        options,
      );
    },

    vote,
    approve: (proposal: DaoProposal) => vote(proposal, "VoteApprove"),
    reject: (proposal: DaoProposal) => vote(proposal, "VoteReject"),
  };
}

export type GovernanceCalls = ReturnType<typeof governanceCalls>;
