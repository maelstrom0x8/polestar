import { useRef, useState } from "react";
import { noticeFor, type Notice } from "../components/app/TxFlow";
import type { Project } from "../types/domain";
import { readAllocationLogs, useRefreshRound, type StepLogEntry } from "./roundData";
import { TGAS, TxCancelledError, sendCall } from "./tx";

/**
 * Drives process_allocation_step. Each step is its own transaction and
 * its own wallet confirmation; "to completion" just repeats one step at a
 * time until the contract reports it's done or the user stops.
 */
export function useAllocationRunner(roundId: string, projects: Project[]) {
  const refresh = useRefreshRound(roundId);
  const [log, setLog] = useState<StepLogEntry[]>([]);
  const [running, setRunning] = useState<null | { mode: "one" | "all"; step: number }>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [finished, setFinished] = useState(false);
  const stopRef = useRef(false);

  const titleOf = (id: string) => projects.find((p) => p.id === id)?.title ?? `Project #${id}`;

  async function run(mode: "one" | "all") {
    stopRef.current = false;
    setNotice(null);
    let step = 1;
    for (;;) {
      setRunning({ mode, step });
      let done: boolean;
      try {
        const outcome = await sendCall({
          method: "process_allocation_step",
          args: { round_id: Number(roundId) },
          deposit: 0n,
          gas: 300n * TGAS,
        });
        done = outcome.value === true;
        const entries = readAllocationLogs(outcome.logs, titleOf);
        setLog((prev) => [
          ...(entries.length ? entries.reverse() : [{ key: `${Date.now()}`, text: "Allocation moved to its next stage", tone: "info" as const }]),
          ...prev,
        ]);
        await refresh();
      } catch (error) {
        setNotice(noticeFor(error));
        if (!(error instanceof TxCancelledError)) await refresh();
        break;
      }
      if (done) {
        setFinished(true);
        break;
      }
      if (mode === "one" || stopRef.current) break;
      step += 1;
    }
    setRunning(null);
  }

  return {
    log,
    running,
    notice,
    finished,
    advanceOne: () => run("one"),
    advanceAll: () => run("all"),
    stop: () => {
      stopRef.current = true;
    },
  };
}

export type AllocationRunner = ReturnType<typeof useAllocationRunner>;
