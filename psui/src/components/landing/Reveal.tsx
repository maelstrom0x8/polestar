import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

export const EASE = [0.16, 1, 0.3, 1] as const;

const VIEWPORT = { once: true, amount: 0.2 } as const;

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}

export function Reveal({ children, className, delay = 0, id }: Props) {
  return (
    <motion.div
      id={id}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{
        hidden: item.hidden,
        show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className, gap = 0.09 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
