import { Landmark, Layers, UsersRound } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { EASE } from "./Reveal";

const NODES = [
  { Icon: Landmark, title: "Your SputnikDAO", body: "Holds the treasury. Its members vote on every move, under its own rules." },
  { Icon: Layers, title: "Polestar round", body: "Holds one round's budget. Splits it by the community's votes." },
  { Icon: UsersRound, title: "Funded team", body: "Receives each milestone's payment, straight to its account." },
];

const FLOWS = [
  { step: "1", title: "DAO votes to fund a round", body: "The budget moves into the round" },
  { step: "2", title: "DAO votes that a milestone is done", body: "That milestone's payment is released" },
];

function Connector({ index, start }: { index: number; start: boolean }) {
  const reduce = useReducedMotion();
  const flow = FLOWS[index];
  const delay = 0.5 + index * 0.6;

  return (
    <div className="control__flow">
      <svg className="control__line" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true">
        <motion.path
          d="M2 6 H118"
          className="control__path"
          initial={{ pathLength: 0 }}
          animate={start ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay }}
        />
        {start && !reduce && (
          <motion.circle
            r="3.2"
            cy="6"
            className="control__token"
            initial={{ cx: 2, opacity: 0 }}
            animate={{ cx: [2, 118], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, ease: "easeInOut", delay: delay + 0.9, repeat: Infinity, repeatDelay: 1.2 }}
          />
        )}
      </svg>
      <motion.div
        className="control__flow-label"
        initial={{ opacity: 0, y: 8 }}
        animate={start ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.6, ease: EASE, delay: delay + 0.3 }}
      >
        <span className="control__step">{flow.step}</span>
        <span className="control__flow-title">{flow.title}</span>
        <span className="control__flow-body">{flow.body}</span>
      </motion.div>
    </div>
  );
}

export function ControlDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div className="control" ref={ref}>
      {NODES.map((node, index) => (
        <div className="control__cell" key={node.title}>
          <motion.div
            className={`control__node${index === 0 ? " control__node--dao" : ""}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.7, ease: EASE, delay: index * 0.6 }}
          >
            <span className="control__icon">
              <node.Icon aria-hidden size={22} />
            </span>
            <span className="control__node-title">{node.title}</span>
            <span className="control__node-body">{node.body}</span>
          </motion.div>
          {index < FLOWS.length && <Connector index={index} start={inView} />}
        </div>
      ))}
    </div>
  );
}
