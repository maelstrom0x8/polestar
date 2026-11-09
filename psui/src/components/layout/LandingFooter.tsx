import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__top">
          <div className="landing-footer__brand">
            <span className="nav__brand">POLESTAR</span>
            <p className="landing-footer__meta" style={{ marginTop: 12 }}>
              Community-backed funding for DAO treasuries.
            </p>
          </div>

          <div className="landing-footer__grid">
            <div className="landing-footer__column">
              <span className="label">Product</span>
              <nav>
                <Link to="/rounds" className="landing-footer__link">
                  Rounds
                </Link>
                <a href="/#how-it-works" className="landing-footer__link">
                  How it works
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="landing-footer__bottom">
          <span className="landing-footer__meta">&copy; 2026 Polestar</span>
          <span className="landing-footer__meta">Testnet deployment &middot; Not audited</span>
        </div>
      </div>
    </footer>
  );
}
