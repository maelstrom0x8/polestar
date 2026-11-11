import { useQuery } from "@tanstack/react-query";
import { formatNear } from "./format";
import { CONTRACT_ID, DAO_ID, parsePreservingBigNumbers, viewFunction } from "./near";
import { TGAS, contractJson, type ContractCall } from "./tx";

// SputnikDAO's own shapes (all numbers arrive as strings).
interface PolicyRole {
  name: string;
  kind: "Everyone" | { Group: string[] } | { Member: string };
  permissions: string[];
}

export interface DaoPolicy {
  roles: PolicyRole[];
  proposal_bond: string;
}

interface ActionCall {
  method_name: string;
  args: string;
  deposit: string;
  gas: string;
}

export interface ProposalKind {
  FunctionCall?: { receiver_id: string; actions: ActionCall[] };
  [other: string]: unknown;
}

export interface DaoProposal {
  id: number;
  proposer: string;
  description: string;
  kind: ProposalKind;
  status: "InProgress" | "Approved" | "Rejected" | "Removed" | "Expired" | "Moved" | "Failed";
  vote_counts: Record<string, string[]>;
  votes: Record<string, string>;
}

function allows(role: PolicyRole, accountId: string, action: string): boolean {
  const member =
    role.kind === "Everyone" ||
    ("Group" in role.kind && role.kind.Group.includes(accountId)) ||
    ("Member" in role.kind && role.kind.Member === accountId);
  // Permission labels are "<proposal kind>:<action>"; a FunctionCall proposal's kind label is "call".
  return member && role.permissions.some((p) => p === `*:${action}` || p === `call:${action}` || p === "*:*");
}

export const canSubmit = (policy: DaoPolicy, accountId: string) => policy.roles.some((r) => allows(r, accountId, "AddProposal"));
export const canVote = (policy: DaoPolicy, accountId: string) => policy.roles.some((r) => allows(r, accountId, "VoteApprove"));

export function useDaoPolicy() {
  return useQuery({
    queryKey: ["daoPolicy"],
    queryFn: () => viewFunction<DaoPolicy>("get_policy", {}, DAO_ID),
    staleTime: 5 * 60_000,
  });
}

/** Open proposals that call this Polestar contract, newest first. */
export function useOpenProposals() {
  return useQuery({
    queryKey: ["daoProposals"],
    queryFn: async () => {
      const last = await viewFunction<number>("get_last_proposal_id", {}, DAO_ID);
      const from = Math.max(0, Number(last) - 50);
      const proposals = await viewFunction<DaoProposal[]>("get_proposals", { from_index: from, limit: 50 }, DAO_ID);
      return proposals
        .filter((p) => p.status === "InProgress" && p.kind.FunctionCall?.receiver_id === CONTRACT_ID)
        .sort((a, b) => b.id - a.id);
    },
    refetchInterval: 15_000,
  });
}

function decodeArgs(args: string): Record<string, unknown> | null {
  try {
    return parsePreservingBigNumbers(atob(args)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** A plain description of what approving a proposal would do. */
export function describeProposal(p: DaoProposal): { title: string; detail: string } {
  const action = p.kind.FunctionCall?.actions[0];
  const args = action ? decodeArgs(action.args) : null;
  if (action?.method_name === "fund_round" && args) {
    const config = args.config as { budget: string | number } | undefined;
    const members = typeof args.voter_namespace === "string" ? ` · voting open to members of ${args.voter_namespace}` : "";
    return { title: "Fund a new round", detail: config ? `Budget ${formatNear(String(config.budget))}${members}` : "" };
  }
  if (action?.method_name === "attest_milestone" && args) {
    return {
      title: "Pay a milestone",
      detail: `Round ${String(args.round_id)}, project #${String(args.project_id)}, milestone ${Number(args.milestone_index) + 1}`,
    };
  }
  if (action?.method_name === "return_remaining" && args) {
    return { title: "Return unspent budget", detail: `Round ${String(args.round_id)}` };
  }
  return { title: p.description || "Proposal", detail: action?.method_name ?? "" };
}

export function approvals(p: DaoProposal): number {
  return Object.values(p.votes).filter((v) => v === "Approve").length;
}

function toBase64(text: string): string {
  let binary = "";
  new TextEncoder().encode(text).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** add_proposal for one FunctionCall to this contract, with the policy's bond attached. */
export function submitCall(
  description: string,
  method: string,
  args: Record<string, unknown>,
  deposit: bigint,
  gas: bigint,
  bond: bigint,
): ContractCall {
  return {
    receiverId: DAO_ID,
    method: "add_proposal",
    args: {
      proposal: {
        description,
        kind: {
          FunctionCall: {
            receiver_id: CONTRACT_ID,
            actions: [{ method_name: method, args: toBase64(contractJson(args)), deposit: deposit.toString(), gas: gas.toString() }],
          },
        },
      },
    },
    deposit: bond,
    gas: 50n * TGAS,
  };
}

/**
 * act_proposal as this DAO's version expects it: the proposal's own kind is
 * echoed back, so a vote can't land on a proposal that changed underneath it.
 */
export function voteCall(p: DaoProposal, action: "VoteApprove" | "VoteReject"): ContractCall {
  return {
    receiverId: DAO_ID,
    method: "act_proposal",
    args: { id: p.id, action, proposal: p.kind, memo: null },
    deposit: 0n,
    gas: 300n * TGAS,
  };
}
