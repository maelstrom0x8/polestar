import { useQueries, useQuery } from "@tanstack/react-query";
import type * as Sdk from "@ezeonlabs/polestar";
import type { AllocationResult, Ballot, Project, Round } from "../types/domain";
import { ContractPanicError } from "./near";
import { polestar } from "./polestar";

function toRound(r: Sdk.Round): Round {
  return {
    id: String(r.id),
    config: { budget: r.config.budget.toString(), opensAt: r.config.opensAt, closesAt: r.config.closesAt, tMin: r.config.tMin },
    phase: r.phase,
    remaining: r.remaining.toString(),
    remainingReturned: r.remainingReturned,
    voterNamespace: r.voterNamespace,
    projectCount: r.projectCount,
    ballotCount: r.ballotCount,
  };
}

function toProject(p: Sdk.Project): Project {
  return {
    id: String(p.id),
    proposer: p.proposer,
    recipient: p.recipient,
    title: p.title,
    summary: p.summary,
    cost: p.cost.toString(),
    milestones: p.milestones.map((m) => ({ amount: m.amount.toString(), attested: m.attested })),
    status: p.status,
  };
}

function toBallot(b: Sdk.Ballot): Ballot {
  return { voter: b.voter, approved: b.approved.map(String) };
}

function toAllocationResult(r: Sdk.AllocationResult): AllocationResult {
  return {
    budget: r.budget.toString(),
    funded: r.funded.map((f) => ({ project: String(f.project), stage: f.stage, amount: f.amount.toString() })),
    unfunded: r.unfunded.map(String),
    remaining: r.remaining.toString(),
  };
}

export function useRoundCount() {
  return useQuery({
    queryKey: ["roundCount"],
    queryFn: () => polestar.getRoundCount(),
  });
}

export function useRound(roundId: string | undefined) {
  return useQuery({
    queryKey: ["round", roundId],
    queryFn: () => fetchRound(roundId as string),
    enabled: roundId !== undefined,
  });
}

export function useRoundPhase(roundId: string | undefined) {
  return useQuery({
    queryKey: ["roundPhase", roundId],
    queryFn: () => polestar.getRoundPhase(Number(roundId)),
    enabled: roundId !== undefined,
  });
}

export function useProjects(roundId: string | undefined) {
  return useQuery({
    queryKey: ["projects", roundId],
    queryFn: async () => (await polestar.getProjects(Number(roundId))).map(toProject),
    enabled: roundId !== undefined,
  });
}

export async function fetchProject(roundId: string, projectId: string): Promise<Project | null> {
  const project = await polestar.getProject(Number(roundId), Number(projectId));
  return project ? toProject(project) : null;
}

export async function fetchBallot(roundId: string, voter: string): Promise<Ballot | null> {
  const ballot = await polestar.getBallot(Number(roundId), voter);
  return ballot ? toBallot(ballot) : null;
}

export function useProject(roundId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", roundId, projectId],
    queryFn: () => fetchProject(roundId as string, projectId as string),
    enabled: roundId !== undefined && projectId !== undefined,
  });
}

export function useProjectSupport(roundId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ["projectSupport", roundId, projectId],
    queryFn: () => polestar.getProjectSupport(Number(roundId), Number(projectId)),
    enabled: roundId !== undefined && projectId !== undefined,
  });
}

export function useBallot(roundId: string | undefined, voter: string | undefined) {
  return useQuery({
    queryKey: ["ballot", roundId, voter],
    queryFn: () => fetchBallot(roundId as string, voter as string),
    enabled: roundId !== undefined && voter !== undefined,
  });
}

export function useFirstSeen(accountId: string | null | undefined) {
  return useQuery({
    queryKey: ["firstSeen", accountId],
    queryFn: () => polestar.getFirstSeen(accountId as string),
    enabled: !!accountId,
    retry: false,
  });
}

export function useAllocationResult(roundId: string | undefined) {
  return useQuery({
    queryKey: ["allocationResult", roundId],
    queryFn: async () => {
      const result = await polestar.getAllocationResult(Number(roundId));
      return result ? toAllocationResult(result) : null;
    },
    enabled: roundId !== undefined,
  });
}

export function useRemaining(roundId: string | undefined) {
  return useQuery({
    queryKey: ["remaining", roundId],
    queryFn: async () => (await polestar.getRemaining(Number(roundId)))?.toString() ?? null,
    enabled: roundId !== undefined,
  });
}

async function fetchRound(id: string): Promise<Round | null> {
  const round = await polestar.getRound(Number(id));
  return round ? toRound(round) : null;
}

export function useAllRounds() {
  const countQuery = useRoundCount();
  const count = countQuery.data ?? 0;
  const ids = Array.from({ length: count }, (_, i) => String(i));

  const roundQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["round", id],
      queryFn: () => fetchRound(id),
      enabled: countQuery.isSuccess,
    })),
  });

  // A round the contract panics on (left over from an earlier contract
  // version it can no longer deserialize) is simply left out. A transport
  // failure is a real network error.
  const failedIds = ids.filter((_, i) => {
    const error = roundQueries[i]?.error;
    return error && !(error instanceof ContractPanicError);
  });

  return {
    isLoading: countQuery.isLoading || (countQuery.isSuccess && roundQueries.some((q) => q.isLoading)),
    isError: countQuery.isError,
    rounds: roundQueries.map((q) => q.data).filter((r): r is Round => r != null),
    failedIds,
    refetch: () => {
      void countQuery.refetch();
      roundQueries.forEach((q) => q.isError && !(q.error instanceof ContractPanicError) && void q.refetch());
    },
  };
}
