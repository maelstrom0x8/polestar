import { Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <main className="app-main">
      <Outlet />
    </main>
  );
}
