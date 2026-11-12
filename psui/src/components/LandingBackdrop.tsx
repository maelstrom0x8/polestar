import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type Variants } from "motion/react";
import { useEffect } from "react";
import { EASE } from "./landing/Reveal";

const DOTS = [
  { top: "4%", left: "2%" },
  { top: "4%", left: "6%" },
];

const TICKS = [
  { top: "30%", left: "88%" },
  { top: "46%", left: "88%" },
];

const TAGS = [
  { top: "0%", left: "91%", label: "P01" },
  { top: "90%", left: "60%", label: "X03" },
];

const SCATTER = [
  { top: "78%", left: "80%", size: 14, tone: "signal" as const },
  { top: "70%", left: "87%", size: 8, tone: "electric" as const },
  { top: "86%", left: "86%", size: 6, tone: "signal" as const },
  { top: "74%", left: "93%", size: 10, tone: "signal" as const },
  { top: "90%", left: "92%", size: 7, tone: "electric" as const },
];

const HEATMAP_TONES = [
  "electric", "signal", "signal", "muted",
  "signal", "electric", "muted", "signal",
  "muted", "signal", "signal", "electric",
] as const;

const BARS = [22, 40, 16, 34, 48, 12, 28, 44, 18, 36];

const layer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};

const piece: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: (opacity: number = 1) => ({ opacity, scale: 1, transition: { duration: 0.9, ease: EASE } }),
};

function IsometricCube({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className="landing-backdrop__cube-svg">
      <path d="M110,60 L85,103.3 L35,103.3 L10,60 L35,16.7 L85,16.7 Z" />
      <path d="M60,60 L110,60 M60,60 L35,103.3 M60,60 L35,16.7" />
    </svg>
  );
}

export function LandingBackdrop() {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 60, damping: 20 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 20 });
  const farX = useTransform(springX, (v) => v * 8);
  const farY = useTransform(springY, (v) => v * 8);
  const nearX = useTransform(springX, (v) => v * -18);
  const nearY = useTransform(springY, (v) => v * -18);
  const { scrollY } = useScroll();
  const ghostY = useTransform(scrollY, [0, 600], [0, 90]);

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    function onMove(event: PointerEvent) {
      pointerX.set(event.clientX / window.innerWidth - 0.5);
      pointerY.set(event.clientY / window.innerHeight - 0.5);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, pointerX, pointerY]);

  return (
    <div className={`landing-backdrop${reduce ? "" : " landing-backdrop--animated"}`} aria-hidden="true">
      <motion.span className="landing-backdrop__ghost" style={{ y: ghostY }}>
        POLESTAR
      </motion.span>

      <motion.div
        className="landing-backdrop__layer"
        style={{ x: farX, y: farY }}
        variants={layer}
        initial="hidden"
        animate="show"
      >
        <motion.span variants={piece} custom={0.09} className="landing-backdrop__ghost-numeral">
          01
        </motion.span>
        <motion.span variants={piece} className="landing-backdrop__block landing-backdrop__block--a" />
        <motion.span variants={piece} className="landing-backdrop__block landing-backdrop__block--b" />
        <motion.span variants={piece} className="landing-backdrop__hatch" />
        <motion.span variants={piece} custom={0.5} className="landing-backdrop__ribbon" />
        <motion.span variants={piece} className="landing-backdrop__rings" />
      </motion.div>

      <motion.div
        className="landing-backdrop__layer"
        style={{ x: nearX, y: nearY }}
        variants={layer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={piece} className="landing-backdrop__heatmap">
          {HEATMAP_TONES.map((tone, i) => (
            <span
              key={`cell-${i}`}
              className={`landing-backdrop__cell landing-backdrop__cell--${tone}`}
              style={{ animationDelay: `${(i % 4) * 0.35 + Math.floor(i / 4) * 0.5}s` }}
            />
          ))}
        </motion.div>

        <motion.div variants={piece} className="landing-backdrop__barcode">
          {BARS.map((w, i) => (
            <span
              key={`bar-${i}`}
              className="landing-backdrop__bar"
              style={{ width: `${w}px`, animationDelay: `${i * 0.28}s` }}
            />
          ))}
        </motion.div>

        <motion.div variants={piece} className="landing-backdrop__cubes">
          <span className="landing-backdrop__cube landing-backdrop__cube--slow">
            <IsometricCube size={72} />
          </span>
          <span className="landing-backdrop__cube landing-backdrop__cube--fast">
            <IsometricCube size={44} />
          </span>
        </motion.div>

        {SCATTER.map((s, i) => (
          <motion.span
            variants={piece}
            key={`scatter-${i}`}
            className={`landing-backdrop__scatter-dot landing-backdrop__scatter-dot--${s.tone}`}
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: `${i * 0.6}s` }}
          />
        ))}

        {DOTS.map((d, i) => (
          <motion.span variants={piece} key={`dot-${i}`} className="landing-backdrop__dot" style={{ top: d.top, left: d.left }} />
        ))}
        {TICKS.map((t, i) => (
          <motion.span variants={piece} key={`tick-${i}`} className="landing-backdrop__tick" style={{ top: t.top, left: t.left }} />
        ))}
        {TAGS.map((t, i) => (
          <motion.span variants={piece} custom={0.7} key={`tag-${i}`} className="landing-backdrop__tag" style={{ top: t.top, left: t.left }}>
            {t.label}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
