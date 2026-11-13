import { Outlet } from "react-router-dom";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { MockBanner } from "./MockBanner";

export function AppShell() {
  return (
    <div className="app-shell">
      {__MOCK_DATA__ && !__DEMO_MODE__ && <MockBanner />}
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
