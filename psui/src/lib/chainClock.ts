import { useQuery } from "@tanstack/react-query";
import { getBlock } from "./near";

const SAMPLE_SPAN = 1_000;

export interface ChainClock {
  height: number;
  timestampMs: number;
  msPerBlock: number | null;
}

async function fetchClock(): Promise<ChainClock> {
  const head = await getBlock("final");
  // Block time is measured, not assumed: average over the last SAMPLE_SPAN
  // blocks. If that older header isn't available, durations aren't shown.
  const past = await getBlock(head.height - SAMPLE_SPAN).catch(() => null);
  const msPerBlock = past ? (head.timestampMs - past.timestampMs) / (head.height - past.height) : null;
  return { ...head, msPerBlock: msPerBlock && msPerBlock > 0 ? msPerBlock : null };
}

export function useChainClock() {
  return useQuery({
    queryKey: ["chainClock"],
    queryFn: fetchClock,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  return `${Math.round(hours / 24)} days`;
}

export function formatBlock(height: number): string {
  return height.toLocaleString("en-US");
}

/**
 * "≈ 2 h 10 min" / "≈ 3 days ago" for a block height, or null when the
 * clock or its block time isn't known yet (callers then show the height alone).
 */
export function blockDistance(target: number, clock: ChainClock | undefined): string | null {
  if (!clock || clock.msPerBlock === null) return null;
  const deltaMs = (target - clock.height) * clock.msPerBlock;
  if (Math.abs(deltaMs) < 60_000) return "about now";
  return deltaMs > 0 ? `≈ ${formatDuration(deltaMs)}` : `≈ ${formatDuration(-deltaMs)} ago`;
}

/** "block 1,234,567 (≈ 2 h 10 min)" with the estimate only when one exists. */
export function describeBlock(target: number, clock: ChainClock | undefined): string {
  const distance = blockDistance(target, clock);
  return distance ? `block ${formatBlock(target)} (${distance})` : `block ${formatBlock(target)}`;
}
