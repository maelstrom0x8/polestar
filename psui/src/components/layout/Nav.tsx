import { NavLink } from "react-router-dom";
import { useScrolled } from "../../lib/useScrolled";

export function Nav() {
  const scrolled = useScrolled();

  return (
    <header className={`nav${scrolled ? " nav--scrolled" : ""}`}>
      <div className="nav__inner">
        <NavLink to="/" className="nav__brand">
          POLESTAR
        </NavLink>
        <nav className="nav__links">
        
        </nav>
        <div className="nav__actions">
        </div>
      </div>
    </header>
  );
}
