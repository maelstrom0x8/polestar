import { useEffect, useState } from "react";

/**
 * True once any part of the footer is visible: the nav is a fixed
 * overlay with no flow height, so it never naturally scrolls away;
 * without this it stays pinned over the footer once you reach the
 * bottom of the page, reading as a stray pill shape cut into the
 * footer's top edge rather than a floating nav over page content.
 * Triggers on first visibility rather than waiting for the footer to
 * reach the nav's own position: on a page short enough that the
 * footer never scrolls past the viewport's top band (true here), a
 * trigger tied to that band never fires at all.
 */
export function useNearFooter(selector = ".landing-footer"): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = document.querySelector(selector);
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [selector]);

  return near;
}
