import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ParticleField } from "../components/ParticleField";
import { Typewriter } from "../components/Typewriter";
import { useMinViewport } from "../lib/useMinViewport";
import { useReducedMotion } from "../lib/useReducedMotion";

const HEADLINE_LINES = ["A DAO's treasury,", "split fairly by the community it funds."];
const SUBHEAD =
  "Polestar runs the Method of Equal Shares on registered projects and community ballots, then pays funded projects in milestone tranches — each one released only when the DAO confirms the work is done.";

export function LandingPage() {
  const reducedMotion = useReducedMotion();
  const isLargeViewport = useMinViewport(960);
  const showParticleField = isLargeViewport && !reducedMotion;
  // The typewriter clips each hardcoded line with white-space: nowrap, so
  // it only fits where the hero's fixed two-line break was chosen for —
  // desktop widths. Below that (and under reduced motion) the headline
  // just renders, same as the particle field's own breakpoint.
  const animateHeadline = isLargeViewport && !reducedMotion;
  const [revealed, setRevealed] = useState(!animateHeadline);

  useEffect(() => {
    if (!animateHeadline) setRevealed(true);
  }, [animateHeadline]);

  return (
    <div className="landing">
      <div className="landing__hero">
        {showParticleField && <ParticleField className="landing__particles" />}
        <div className="landing__hero-content">
          <h1 className="display landing__headline">
            {animateHeadline ? (
              <Typewriter lines={HEADLINE_LINES} onComplete={() => setRevealed(true)} />
            ) : (
              HEADLINE_LINES.join(" ")
            )}
          </h1>
          <div className={`landing__reveal${revealed ? " landing__reveal--shown" : ""}`}>
            <p className="landing__subhead">{SUBHEAD}</p>
            <Link to="/rounds" className="btn btn-primary landing__cta">
              Browse rounds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
