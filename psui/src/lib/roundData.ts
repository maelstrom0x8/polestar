import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/** Refetch everything a write to this round could have changed. */
export function useRefreshRound(roundId: string) {
  const client = useQueryClient();
  return useCallback(async () => {
    await Promise.all(
      [["round", roundId], ["projects", roundId], ["ballot", roundId], ["allocationResult", roundId], ["project", roundId], ["projectSupport", roundId], ["roundCount"]].map(
        (queryKey) => client.invalidateQueries({ queryKey }),
      ),
    );
  }, [client, roundId]);
}

export const STAGE_LABEL = { Mes: "Method of Equal Shares", Completion: "Remaining-budget allocation" } as const;

export interface StepLogEntry {
  key: string;
  text: string;
  tone: "funded" | "unfunded" | "info";
}

/** Turn the contract's allocation logs into plain-language lines. */
export function readAllocationLogs(logs: string[], titleOf: (projectId: string) => string): StepLogEntry[] {
  return logs.flatMap((line, i): StepLogEntry[] => {
    const funded = /ProjectFunded .*project_id=(\d+) stage=(\w+) amount=(\d+)/.exec(line);
    if (funded) {
      const stage = funded[2] === "Completion" ? STAGE_LABEL.Completion : STAGE_LABEL.Mes;
      return [{ key: `${Date.now()}-${i}`, text: `${titleOf(funded[1])} funded, via ${stage}`, tone: "funded" }];
    }
    const unfunded = /ProjectUnfunded .*project_id=(\d+)/.exec(line);
    if (unfunded) return [{ key: `${Date.now()}-${i}`, text: `${titleOf(unfunded[1])} not funded`, tone: "unfunded" }];
    if (/AllocationFinalized/.test(line)) {
      return [{ key: `${Date.now()}-${i}`, text: "Allocation finished; the round is settled", tone: "info" }];
    }
    return [];
  });
}
