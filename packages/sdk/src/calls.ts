import { toId, toU128 } from "./serialization.js";
import type { Transaction } from "./types.js";
import { TGAS } from "./units.js";

export const DEFAULT_COUNTING_STEPS = 100;

export interface RegisterProjectInput {
  roundId: number;
  recipient: string;
  title: string;
  summary: string;
  milestones: bigint[];
  deposit: bigint;
}

export function polestarCalls(contractId: string) {
  const call = (method: string, args: Record<string, unknown>, gas: bigint, deposit = 0n): Transaction => ({
    receiverId: contractId,
    method,
    args,
    deposit,
    gas,
  });
  const round = (roundId: number) => ({ round_id: toId(roundId, "round id") });

  return {
    registerVoter: () => call("register_voter", {}, 30n * TGAS),

    registerProject(input: RegisterProjectInput): Transaction {
      if (input.milestones.length === 0) throw new RangeError("a project needs at least one milestone");
      const amounts = input.milestones.map((m) => toU128(m));
      const cost = toU128(amounts.reduce((sum, m) => sum + m, 0n));
      return call(
        "register_project",
        {
          ...round(input.roundId),
          recipient: input.recipient,
          title: input.title,
          summary: input.summary,
          cost: cost.toString(),
          milestone_amounts: amounts.map((m) => m.toString()),
        },
        100n * TGAS,
        toU128(input.deposit),
      );
    },

    submitBallot(roundId: number, projectIds: number[]): Transaction {
      const approved = [...new Set(projectIds.map((id) => toId(id, "project id")))].sort((a, b) => a - b);
      return call("submit_ballot", { ...round(roundId), approved }, 50n * TGAS);
    },

    startVoting: (roundId: number) => call("open_declaration", round(roundId), 30n * TGAS),

    endVoting: (roundId: number) => call("close_declaration", round(roundId), 300n * TGAS),

    processAllocationStep: (roundId: number) => call("process_allocation_step", round(roundId), 300n * TGAS),

    processAllocationSteps(roundId: number, maxSteps = DEFAULT_COUNTING_STEPS): Transaction {
      if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 0xffff_ffff) {
        throw new RangeError("maxSteps must be an integer between 1 and 2^32 - 1");
      }
      return call("process_allocation_steps", { ...round(roundId), max_steps: maxSteps }, 300n * TGAS);
    },
  };
}

export type PolestarCalls = ReturnType<typeof polestarCalls>;
