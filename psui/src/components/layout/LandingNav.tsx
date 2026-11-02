import { Link } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle";

export function LandingNav() {
  return (
    <div className="landing-nav-wrap">
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <span className="nav__brand">POLESTAR</span>
          <div className="nav__actions">
            <ThemeToggle />
            <Link to="/rounds" className="btn btn-primary">
              Enter App
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
