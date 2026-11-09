import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { RoundsPage } from "./pages/RoundsPage";
import { SignInPage } from "./pages/SignInPage";

export default function App() {
  return (
    <Routes>
      {/* The landing page owns its own header (Nav — a fixed, scroll-
          reactive overlay specific to this page) and isn't wrapped in
          AppShell, which would otherwise add a second, conflicting
          header above it. */}
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppShell />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/rounds" element={<RoundsPage />} />
        <Route path="*" element={null} />
      </Route>
    </Routes>
  );
}
