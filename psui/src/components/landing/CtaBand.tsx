import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LINKS } from "../../lib/links";
import { Reveal } from "./Reveal";

export function CtaBand() {
  return (
    <section className="cta" aria-labelledby="cta-title">
      <Reveal className="cta__inner">
        <h2 id="cta-title" className="h2 cta__title">
          Run your community's next round.
        </h2>
        <p className="cta__body">Fund it from your DAO, open it to your members, and pay teams as they deliver.</p>
        <div className="cta__actions">
          <Link to="/rounds" className="btn btn-primary btn-arrow">
            Get started <ArrowRight aria-hidden size={18} />
          </Link>
          <a href={LINKS.docs} target="_blank" rel="noreferrer" className="btn btn-ghost btn-arrow">
            Read the docs <ArrowUpRight aria-hidden size={18} />
          </a>
        </div>
      </Reveal>
    </section>
  );
}
