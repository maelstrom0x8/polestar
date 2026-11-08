import { Outlet } from "react-router-dom";
import { Nav } from "./Nav";

export function AppShell() {
  return (
    <>
      <Nav />
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
