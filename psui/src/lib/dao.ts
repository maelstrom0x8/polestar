import { useQuery } from "@tanstack/react-query";
import {
  approvalCount,
  canSubmit,
  canVote,
  decodeProposalAction,
  type DaoPolicy,
  type DaoProposal,
  type ProposalKind,
} from "@ezeonlabs/polestar";
import { formatNear } from "./format";
import { polestar } from "./polestar";

export { canSubmit, canVote };
export type { DaoPolicy, DaoProposal, ProposalKind };
export const approvals = approvalCount;

export function useDaoPolicy() {
  return useQuery({
    queryKey: ["daoPolicy"],
    queryFn: () => polestar.governance.getPolicy(),
    staleTime: 5 * 60_000,
  });
}

export function useOpenProposals() {
  return useQuery({
    queryKey: ["daoProposals"],
    queryFn: () => polestar.governance.getOpenProposals(),
    refetchInterval: 15_000,
  });
}

export function describeProposal(p: DaoProposal): { title: string; detail: string } {
  const action = decodeProposalAction(p);
  const args = action?.args ?? null;
  if (action?.method === "fund_round" && args) {
    const config = args.config as { budget: string | number } | undefined;
    const members = typeof args.voter_namespace === "string" ? ` · voting open to members of ${args.voter_namespace}` : "";
    return { title: "Fund a new round", detail: config ? `Budget ${formatNear(String(config.budget))}${members}` : "" };
  }
  if (action?.method === "attest_milestone" && args) {
    return {
      title: "Pay a milestone",
      detail: `Round ${String(args.round_id)}, project #${String(args.project_id)}, milestone ${Number(args.milestone_index) + 1}`,
    };
  }
  if (action?.method === "return_remaining" && args) {
    return { title: "Return unspent budget", detail: `Round ${String(args.round_id)}` };
  }
  return { title: p.description || "Proposal", detail: action?.method ?? "" };
}
