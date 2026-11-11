import { CONTRACT_ID, ContractPanicError, parsePreservingBigNumbers, type BlockRef } from "../near";
import { MOCK_ACCOUNT, MOCK_HEAD, MOCK_MS_PER_BLOCK, createFixtures, type MockRound } from "./fixtures";

// firstSeen: when each mock account first used the contract (voter eligibility).
export const store: { rounds: MockRound[]; firstSeen: Map<string, number> } = {
  rounds: createFixtures(),
  firstSeen: new Map([[MOCK_ACCOUNT, MOCK_HEAD - 50_000]]),
};

const latency = () =>
  new Promise((resolve) => setTimeout(resolve, new URLSearchParams(location.search).has("slow") ? 2500 : 250));

// Serialize the way the contract does (u64/u128 as bare JSON numbers) and
// run the result through the live parser, so mock mode exercises the same
// big-number handling and mappers as the real contract.
function asContractJson(value: unknown): unknown {
  const json = JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? `__big__${v}` : v));
  return parsePreservingBigNumbers(json.replace(/"__big__(\d+)"/g, "$1"));
}

function roundView(round: MockRound) {
  return {
    id: round.id,
    config: round.config,
    phase: round.phase,
    remaining: round.remaining,
    remaining_returned: round.remainingReturned ?? false,
    project_count: round.projects.length,
    ballot_count: round.ballots.length,
  };
}

function find(args: Record<string, unknown>, method: string): MockRound | undefined {
  const round = store.rounds.find((r) => r.id === Number(args.round_id));
  if (round?.unreadable) throw new ContractPanicError(method, "Cannot deserialize value with Borsh");
  return round;
}

export async function mockView(method: string, args: Record<string, unknown>, contractId: string): Promise<unknown> {
  await latency();
  if (contractId !== CONTRACT_ID) {
    const { daoView } = await import("./dao");
    return daoView(method, args);
  }
  const pid = Number(args.project_id);
  switch (method) {
    case "get_round_count":
      return asContractJson(store.rounds.length);
    case "get_round": {
      const round = find(args, method);
      return asContractJson(round ? roundView(round) : null);
    }
    case "get_round_phase":
      return asContractJson(find(args, method)?.phase ?? null);
    case "get_projects":
      return asContractJson(find(args, method)?.projects ?? []);
    case "get_project":
      return asContractJson(find(args, method)?.projects.find((p) => p.id === pid) ?? null);
    case "get_project_support":
      return asContractJson(find(args, method)?.ballots.filter((b) => b.approved.includes(pid)).length ?? 0);
    case "get_ballot":
      return asContractJson(find(args, method)?.ballots.find((b) => b.voter === args.voter) ?? null);
    case "get_allocation_result":
      return asContractJson(find(args, method)?.result ?? null);
    case "get_first_seen":
      return asContractJson(store.firstSeen.get(String(args.account_id)) ?? null);
    case "get_remaining": {
      const round = find(args, method);
      return asContractJson(round ? round.remaining : null);
    }
    default:
      throw new Error(`mock: no view named ${method}`);
  }
}

const loadedAt = Date.now();

export async function mockBlock(ref: "final" | number): Promise<BlockRef> {
  await latency();
  const height = ref === "final" ? MOCK_HEAD : ref;
  return { height, timestampMs: loadedAt - (MOCK_HEAD - height) * MOCK_MS_PER_BLOCK };
}
