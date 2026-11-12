import { Link } from "react-router-dom";
import { LINKS } from "../../lib/links";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <span>© 2026 Polestar</span>
      <span className="app-footer__links">
        <Link to="/about">About</Link>
        <Link to="/faq">FAQ</Link>
        <a href={LINKS.docs} target="_blank" rel="noreferrer">
          Docs
        </a>
        <a href={LINKS.repo} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </span>
    </footer>
  );
}
