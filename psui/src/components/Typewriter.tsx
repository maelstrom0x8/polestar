import { useEffect, useRef, useState, type CSSProperties } from "react";

interface TypewriterProps {
  lines: string[];
  className?: string;
  lineClassName?: string;
  msPerChar?: number;
  startDelayMs?: number;
  onComplete?: () => void;
}

export function Typewriter({
  lines,
  className,
  lineClassName,
  msPerChar = 38,
  startDelayMs = 150,
  onComplete,
}: TypewriterProps) {
  const [activeLine, setActiveLine] = useState(reducedMotionActive() ? lines.length : -1);
  const [showCaret, setShowCaret] = useState(!reducedMotionActive());
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reducedMotionActive()) {
      onComplete?.();
      return;
    }
    const timeout = setTimeout(() => setActiveLine(0), startDelayMs);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDelayMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || activeLine < 0 || activeLine >= lines.length) return;
    const current = container.querySelector<HTMLElement>(`[data-line="${activeLine}"]`);
    if (!current) return;
    function handleEnd(event: AnimationEvent) {
      if (event.target !== current) return;
      if (activeLine + 1 < lines.length) {
        setActiveLine(activeLine + 1);
      } else {
        onComplete?.();
        setTimeout(() => setShowCaret(false), 900);
      }
    }
    current.addEventListener("animationend", handleEnd);
    return () => current.removeEventListener("animationend", handleEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLine]);

  return (
    <span ref={containerRef} className={className}>
      {lines.map((line, index) => {
        const started = reducedMotionActive() || index <= activeLine;
        const style = {
          "--typewriter-steps": line.length,
          "--typewriter-duration": `${(line.length * msPerChar) / 1000}s`,
        } as CSSProperties;
        const caret = showCaret && index === activeLine;
        return (
          <span
            key={line}
            data-line={index}
            className={`typewriter-line${started ? " typewriter-line--started" : ""}${caret ? " typewriter-line--caret" : ""}${lineClassName ? ` ${lineClassName}` : ""}`}
            style={style}
          >
            {line}
          </span>
        );
      })}
    </span>
  );
}

function reducedMotionActive(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
