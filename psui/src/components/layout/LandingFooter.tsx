export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__top">
          <div className="landing-footer__brand">
            <span className="landing-footer__brand-mark">POLESTAR</span>
            <p className="landing-footer__meta" style={{ marginTop: 12 }}>
              Community-backed funding for DAO treasuries.
            </p>
          </div>

          {/* Rounds/How it works already live in the nav, visible on every
              scroll position — repeating them here was pure duplication.
              The footer's own job is just the one thing not in the nav. */}
          <div className="landing-footer__grid">
            <div className="landing-footer__column">
              <span className="label">Resources</span>
              <nav>
                <a
                  href="https://github.com/maelstrom0x8/polestar"
                  target="_blank"
                  rel="noreferrer"
                  className="landing-footer__link"
                >
                  GitHub
                </a>
              </nav>
            </div>
            <div className="landing-footer__column">
              <span className="label">Built on</span>
              <nav>
                <a
                  href="https://near.org"
                  target="_blank"
                  rel="noreferrer"
                  className="landing-footer__link"
                >
                  NEAR Protocol
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
