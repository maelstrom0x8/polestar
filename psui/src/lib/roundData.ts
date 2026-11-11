import { parseEvents } from "@ezeonlabs/polestar";
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

export interface StepLogEntry {
  key: string;
  text: string;
  tone: "funded" | "unfunded" | "info";
}

/** Turn the contract's allocation logs into plain-language lines. */
export function readAllocationLogs(logs: string[], titleOf: (projectId: string) => string): StepLogEntry[] {
  return parseEvents(logs).flatMap((event, i): StepLogEntry[] => {
    const key = `${Date.now()}-${i}`;
    if (event.type === "ProjectFunded") return [{ key, text: `${titleOf(event.data.project_id ?? "")} funded`, tone: "funded" }];
    if (event.type === "ProjectUnfunded") return [{ key, text: `${titleOf(event.data.project_id ?? "")} not funded`, tone: "unfunded" }];
    if (event.type === "AllocationFinalized") return [{ key, text: "Counting finished. The results are in.", tone: "info" }];
    return [];
  });
}
