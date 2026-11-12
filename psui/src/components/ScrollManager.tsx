import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { resetDocumentTitle } from "../lib/useDocumentTitle";

export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    resetDocumentTitle();
  }, [pathname]);

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let frame = 0;
    const seek = () => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ block: "start" });
        return;
      }
      if (tries++ < 30) frame = requestAnimationFrame(seek);
    };
    seek();
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}
