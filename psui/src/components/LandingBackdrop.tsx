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

function IsometricCube({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className="landing-backdrop__cube-svg"
    >
      <path d="M110,60 L85,103.3 L35,103.3 L10,60 L35,16.7 L85,16.7 Z" />
      <path d="M60,60 L110,60 M60,60 L35,103.3 M60,60 L35,16.7" />
    </svg>
  );
}

export function LandingBackdrop() {
  return (
    <div className="landing-backdrop" aria-hidden="true">
      <span className="landing-backdrop__ghost">POLESTAR</span>
      <span className="landing-backdrop__ghost-numeral">01</span>

      <span className="landing-backdrop__block landing-backdrop__block--a" />
      <span className="landing-backdrop__block landing-backdrop__block--b" />
      <span className="landing-backdrop__hatch" />
      <span className="landing-backdrop__ribbon" />
      <span className="landing-backdrop__rings" />

      <div className="landing-backdrop__heatmap">
        {HEATMAP_TONES.map((tone, i) => (
          <span key={`cell-${i}`} className={`landing-backdrop__cell landing-backdrop__cell--${tone}`} />
        ))}
      </div>

      <div className="landing-backdrop__barcode">
        {[22, 40, 16, 34, 48, 12, 28, 44, 18, 36].map((w, i) => (
          <span key={`bar-${i}`} className="landing-backdrop__bar" style={{ width: `${w}px` }} />
        ))}
      </div>

      <div className="landing-backdrop__cubes">
        <IsometricCube size={72} />
        <IsometricCube size={44} />
      </div>

      {SCATTER.map((s, i) => (
        <span
          key={`scatter-${i}`}
          className={`landing-backdrop__scatter-dot landing-backdrop__scatter-dot--${s.tone}`}
          style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
        />
      ))}

      {DOTS.map((d, i) => (
        <span
          key={`dot-${i}`}
          className="landing-backdrop__dot"
          style={{ top: d.top, left: d.left }}
        />
      ))}
      {TICKS.map((t, i) => (
        <span
          key={`tick-${i}`}
          className="landing-backdrop__tick"
          style={{ top: t.top, left: t.left }}
        />
      ))}
      {TAGS.map((t, i) => (
        <span
          key={`tag-${i}`}
          className="landing-backdrop__tag"
          style={{ top: t.top, left: t.left }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}
