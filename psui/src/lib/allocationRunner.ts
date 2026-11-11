import { useRef, useState } from "react";
import { noticeFor, type Notice } from "../components/app/TxFlow";
import type { Project } from "../types/domain";
import { readAllocationLogs, useRefreshRound, type StepLogEntry } from "./roundData";
import { polestar } from "./polestar";
import { TxCancelledError, sendCall } from "./tx";

export function countingCall(roundId: string, mode: "one" | "all") {
  return mode === "all" ? polestar.calls.processAllocationSteps(Number(roundId)) : polestar.calls.processAllocationStep(Number(roundId));
}

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
        const outcome = await sendCall(countingCall(roundId, mode));
        done = outcome.value === true;
        const entries = readAllocationLogs(outcome.logs, titleOf);
        setLog((prev) => [
          ...(entries.length ? entries.reverse() : [{ key: `${Date.now()}`, text: "Counting moved to its next stage", tone: "info" as const }]),
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
