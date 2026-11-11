import type { ChainClock } from "@ezeonlabs/polestar";
import { useQuery } from "@tanstack/react-query";
import { polestar } from "./polestar";

export type { ChainClock };

export function useChainClock() {
  return useQuery({
    queryKey: ["chainClock"],
    queryFn: () => polestar.getChainClock(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

function humanDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 2) return "a minute";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  if (hours < 2) return "an hour";
  if (hours < 36) return `${hours} hours`;
  const days = Math.round(hours / 24);
  return days < 2 ? "a day" : `${days} days`;
}

export function formatBlock(height: number): string {
  return height.toLocaleString("en-US");
}

/**
 * "in about 2 hours" / "about 3 days ago" for a block height, or null when
 * the block time isn't known yet (callers then leave the time out).
 */
export function relativeTime(target: number, clock: ChainClock | undefined): string | null {
  if (!clock || clock.msPerBlock === null) return null;
  const deltaMs = (target - clock.height) * clock.msPerBlock;
  if (Math.abs(deltaMs) < 90_000) return "about now";
  return deltaMs > 0 ? `in about ${humanDuration(deltaMs)}` : `about ${humanDuration(-deltaMs)} ago`;
}

/** Block-precise distance, for the DAO helper where block heights are the input. */
export function blockDistance(target: number, clock: ChainClock | undefined): string | null {
  const relative = relativeTime(target, clock);
  if (!relative) return null;
  return relative === "about now" ? "about now" : relative.replace("in about ", "≈ ").replace("about ", "≈ ");
}
