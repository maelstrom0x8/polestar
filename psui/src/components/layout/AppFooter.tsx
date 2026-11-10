import { Link } from "react-router-dom";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <span>© 2026 Polestar · Testnet deployment, not audited</span>
      <span className="app-footer__links">
        <Link to="/proposals">Proposals</Link>
        <a href="https://github.com/maelstrom0x8/polestar" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </span>
    </footer>
  );
}
