import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";

export function AppShell() {
  return (
    <>
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
