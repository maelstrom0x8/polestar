import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

interface RevealCardProps {
  index: string;
  title: string;
  body: string;
}

export function RevealCard({ index, title, body }: RevealCardProps) {
  return (
    <motion.div className="reveal-card" initial="rest" whileHover="hover" animate="rest">
      <motion.div
        className="reveal-card__panel"
        variants={{ rest: { y: "100%" }, hover: { y: "0%" } }}
        transition={{ duration: 0.4, ease: EASE }}
      />
      <div className="reveal-card__content">
        <span className="label reveal-card__index">{index}</span>
        <h3 className="h3 reveal-card__title">{title}</h3>
        <p className="reveal-card__body">{body}</p>
      </div>
    </motion.div>
  );
}
