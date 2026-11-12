import { Check, Minus } from "lucide-react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE } from "./Reveal";

type Group = "six" | "four";

interface Project {
  id: string;
  cost: number;
  group: Group;
  supporters: number;
}

const BUDGET = 10;

const PROJECTS: Project[] = [
  { id: "A", cost: 5, group: "six", supporters: 6 },
  { id: "B", cost: 5, group: "six", supporters: 6 },
  { id: "C", cost: 4, group: "four", supporters: 4 },
];

const METHODS = [
  {
    key: "votes",
    title: "Most votes",
    caption: "The most-approved projects win until the money runs out.",
    funded: ["A", "B"],
  },
  {
    key: "shares",
    title: "Equal shares",
    caption: "Each voter holds 1 NEAR. Projects are bought by the people who back them.",
    funded: ["A", "C"],
  },
] as const;

function CountUp({ value, start }: { value: number; start: boolean }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!start || reduce) {
      if (reduce) setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.2,
      ease: EASE,
      delay: 0.5,
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [start, value, reduce]);

  return <span className="figure">{shown}</span>;
}

function Panel({ method, start, index }: { method: (typeof METHODS)[number]; start: boolean; index: number }) {
  const funded = PROJECTS.filter((p) => (method.funded as readonly string[]).includes(p.id));
  const spent = funded.reduce((sum, p) => sum + p.cost, 0);
  const fourGets = funded.filter((p) => p.group === "four").reduce((sum, p) => sum + p.cost, 0);
  let offset = 0;

  return (
    <div className={`split__panel split__panel--${method.key}`}>
      <div className="split__panel-head">
        <span className="label">{method.title}</span>
        <p className="split__caption">{method.caption}</p>
      </div>

      <div className="split__bar" role="img" aria-label={`${method.title}: ${funded.map((p) => `project ${p.id}, ${p.cost} NEAR`).join("; ")}; ${BUDGET - spent} NEAR left over.`}>
        {funded.map((p, i) => {
          const left = (offset / BUDGET) * 100;
          offset += p.cost;
          return (
            <motion.span
              key={p.id}
              className={`split__segment split__segment--${p.group}`}
              style={{ left: `${left}%`, width: `${(p.cost / BUDGET) * 100}%`, originX: 0 }}
              initial={{ scaleX: 0 }}
              animate={start ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.25 + index * 0.15 + i * 0.35 }}
            >
              <span className="split__segment-label">
                {p.id} · {p.cost}
              </span>
            </motion.span>
          );
        })}
        {spent < BUDGET && (
          <motion.span
            className="split__segment split__segment--left"
            style={{ left: `${(spent / BUDGET) * 100}%`, width: `${((BUDGET - spent) / BUDGET) * 100}%` }}
            initial={{ opacity: 0 }}
            animate={start ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 1.3 + index * 0.15 }}
          >
            <span className="split__segment-label">{BUDGET - spent}</span>
          </motion.span>
        )}
      </div>

      <ul className="split__projects">
        {PROJECTS.map((p) => {
          const won = (method.funded as readonly string[]).includes(p.id);
          return (
            <li key={p.id} className={`split__project${won ? " split__project--funded" : ""}`}>
              <span className={`split__dot split__dot--${p.group}`} aria-hidden="true" />
              <span className="split__project-name">Project {p.id}</span>
              <span className="split__project-meta">
                {p.cost} NEAR · {p.supporters} supporters
              </span>
              <span className="split__project-status">
                {won ? <Check aria-hidden size={16} /> : <Minus aria-hidden size={16} />}
                {won ? "Funded" : "Not funded"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="split__result">
        <span className="split__result-figure">
          <CountUp value={fourGets} start={start} />
          <span className="split__result-unit"> of {BUDGET} NEAR</span>
        </span>
        <span className="split__result-label">goes to the four voters who backed C</span>
      </div>
    </div>
  );
}

export function SplitComparison() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  return (
    <div className="split" ref={ref}>
      <div className="split__legend">
        <span>
          <span className="split__dot split__dot--six" aria-hidden="true" /> Six voters back A and B
        </span>
        <span>
          <span className="split__dot split__dot--four" aria-hidden="true" /> Four voters back C
        </span>
        <span>Budget 10 NEAR</span>
      </div>
      <div className="split__panels">
        {METHODS.map((method, index) => (
          <Panel key={method.key} method={method} start={inView} index={index} />
        ))}
      </div>
    </div>
  );
}
