import { useEffect, useState } from "react";

/**
 * ui.md §10.1: show the loading skeleton only after a short delay, so
 * a fast response never flickers one in just to immediately replace
 * it. Returns true only once `active` has been continuously true for
 * `delayMs`, and resets the moment `active` goes false.
 */
export function useDelayedFlag(active: boolean, delayMs = 500): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const timeout = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timeout);
  }, [active, delayMs]);

  return shown;
}
