import { useReducedMotion } from "motion/react";
import { Fragment, useEffect, useMemo, useState } from "react";

type Phase = "waiting" | "typing" | "idle" | "done";

interface TypewriterProps {
  text: string;
  className?: string;
  msPerChar?: number;
  startDelayMs?: number;
  lingerMs?: number;
}

export function Typewriter({ text, className, msPerChar = 42, startDelayMs = 350, lingerMs = 2400 }: TypewriterProps) {
  const reduce = useReducedMotion();
  const chars = useMemo(() => Array.from(text), [text]);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    if (reduce) return;
    let shown = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      shown += 1;
      setCount(shown);
      if (shown >= chars.length) {
        setPhase("idle");
        timer = setTimeout(() => setPhase("done"), lingerMs);
        return;
      }
      const typed = chars[shown - 1];
      const pause = typed === "," ? 280 : typed === " " ? msPerChar * 0.5 : 0;
      timer = setTimeout(step, msPerChar + (Math.random() - 0.5) * 26 + pause);
    };
    setCount(0);
    setPhase("waiting");
    timer = setTimeout(() => {
      setPhase("typing");
      step();
    }, startDelayMs);
    return () => clearTimeout(timer);
  }, [chars, reduce, msPerChar, startDelayMs, lingerMs]);

  if (reduce)
    return (
      <span className={className} aria-hidden="true">
        {text}
      </span>
    );

  const caret = <span className={`typewriter__caret typewriter__caret--${phase}`} />;

  return (
    <span className={`typewriter${className ? ` ${className}` : ""}`} aria-hidden="true">
      {chars.map((char, index) => (
        <Fragment key={index}>
          {index === count && caret}
          <span className={index < count ? "typewriter__char typewriter__char--on" : "typewriter__char"}>{char}</span>
        </Fragment>
      ))}
      {count >= chars.length && caret}
    </span>
  );
}
