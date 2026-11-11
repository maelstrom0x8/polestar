import { useQueries, useQuery } from "@tanstack/react-query";
import type {
  AllocationResult,
  Ballot,
  FundingStage,
  Milestone,
  Project,
  ProjectStatus,
  Round,
  RoundPhase,
} from "../types/domain";
import { ContractPanicError, viewFunction } from "./near";

// Raw wire shapes — field names and number-vs-string split exactly as the
// contract's own JSON serializer sends them (snake_case; ids/counts/block
// heights as plain numbers, u128 amounts as strings — see lib/near.ts for
// why). These are intentionally not exported: everything outside this
// file works with the mapped, camelCase domain types instead.

interface RoundConfigRaw {
  budget: string;
  opens_at: number;
  closes_at: number;
  t_min: number;
}

interface RoundViewRaw {
  id: number;
  config: RoundConfigRaw;
  phase: RoundPhase;
  remaining: string;
  remaining_returned?: boolean;
  project_count: number;
  ballot_count: number;
}

interface ProjectRaw {
  id: number;
  proposer: string;
  recipient: string;
  title: string;
  summary: string;
  cost: string;
  milestones: Milestone[];
  status: ProjectStatus;
}

interface BallotRaw {
  voter: string;
  approved: number[];
}

interface FundingRecordRaw {
  project: number;
  stage: FundingStage;
  amount: string;
}

interface AllocationResultRaw {
  budget: string;
  funded: FundingRecordRaw[];
  unfunded: number[];
  remaining: string;
}

function mapRound(raw: RoundViewRaw): Round {
  return {
    id: String(raw.id),
    config: {
      budget: raw.config.budget,
      opensAt: raw.config.opens_at,
      closesAt: raw.config.closes_at,
      tMin: raw.config.t_min,
    },
    phase: raw.phase,
    remaining: raw.remaining,
    remainingReturned: raw.remaining_returned ?? false,
    projectCount: raw.project_count,
    ballotCount: raw.ballot_count,
  };
}

function mapProject(raw: ProjectRaw): Project {
  return {
    id: String(raw.id),
    proposer: raw.proposer,
    recipient: raw.recipient,
    title: raw.title,
    summary: raw.summary,
    cost: raw.cost,
    milestones: raw.milestones,
    status: raw.status,
  };
}

function mapBallot(raw: BallotRaw): Ballot {
  return { voter: raw.voter, approved: raw.approved.map(String) };
}

function mapAllocationResult(raw: AllocationResultRaw): AllocationResult {
  return {
    budget: raw.budget,
    funded: raw.funded.map((f) => ({ project: String(f.project), stage: f.stage, amount: f.amount })),
    unfunded: raw.unfunded.map(String),
    remaining: raw.remaining,
  };
}

export function useRoundCount() {
  return useQuery({
    queryKey: ["roundCount"],
    queryFn: () => viewFunction<number>("get_round_count"),
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
    queryFn: () => viewFunction<RoundPhase | null>("get_round_phase", { round_id: Number(roundId) }),
    enabled: roundId !== undefined,
  });
}

export function useProjects(roundId: string | undefined) {
  return useQuery({
    queryKey: ["projects", roundId],
    queryFn: async () => {
      const raw = await viewFunction<ProjectRaw[]>("get_projects", { round_id: Number(roundId) });
      return raw.map(mapProject);
    },
    enabled: roundId !== undefined,
  });
}

export async function fetchProject(roundId: string, projectId: string): Promise<Project | null> {
  const raw = await viewFunction<ProjectRaw | null>("get_project", {
    round_id: Number(roundId),
    project_id: Number(projectId),
  });
  return raw ? mapProject(raw) : null;
}

export async function fetchBallot(roundId: string, voter: string): Promise<Ballot | null> {
  const raw = await viewFunction<BallotRaw | null>("get_ballot", { round_id: Number(roundId), voter });
  return raw ? mapBallot(raw) : null;
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
    queryFn: () =>
      viewFunction<number>("get_project_support", {
        round_id: Number(roundId),
        project_id: Number(projectId),
      }),
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

/** null: never interacted. Errors (e.g. a deployment without this view) leave it unknown. */
export function useFirstSeen(accountId: string | null | undefined) {
  return useQuery({
    queryKey: ["firstSeen", accountId],
    queryFn: () => viewFunction<number | null>("get_first_seen", { account_id: accountId }),
    enabled: !!accountId,
    retry: false,
  });
}

export function useAllocationResult(roundId: string | undefined) {
  return useQuery({
    queryKey: ["allocationResult", roundId],
    queryFn: async () => {
      const raw = await viewFunction<AllocationResultRaw | null>("get_allocation_result", {
        round_id: Number(roundId),
      });
      return raw ? mapAllocationResult(raw) : null;
    },
    enabled: roundId !== undefined,
  });
}

export function useRemaining(roundId: string | undefined) {
  return useQuery({
    queryKey: ["remaining", roundId],
    queryFn: async () => {
      const raw = await viewFunction<string | number | null>("get_remaining", { round_id: Number(roundId) });
      return raw === null ? null : String(raw);
    },
    enabled: roundId !== undefined,
  });
}

async function fetchRound(id: string): Promise<Round | null> {
  const raw = await viewFunction<RoundViewRaw | null>("get_round", { round_id: Number(id) });
  return raw ? mapRound(raw) : null;
}

/**
 * Every round, 0..get_round_count(). Shares the ["round", id] key with
 * useRound so a detail page opened from the list hits a warm cache.
 */
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
