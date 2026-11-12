import { Outlet } from "react-router-dom";
import { LandingFooter } from "./LandingFooter";
import { Nav } from "./Nav";

export function MarketingLayout() {
  return (
    <div className="marketing">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main" className="marketing__main" tabIndex={-1}>
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
}
