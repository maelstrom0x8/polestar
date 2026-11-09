import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { AccountPage } from "./pages/AccountPage";
import { DaoProposePage } from "./pages/DaoProposePage";
import { ProjectPage } from "./pages/ProjectPage";
import { RegisterProjectPage } from "./pages/RegisterProjectPage";
import { RoundPage } from "./pages/RoundPage";
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
        <Route path="/account" element={<AccountPage />} />
        <Route path="/dao/propose" element={<DaoProposePage />} />
        <Route path="/rounds" element={<RoundsPage />} />
        <Route path="/rounds/:roundId" element={<RoundPage />} />
        <Route path="/rounds/:roundId/register" element={<RegisterProjectPage />} />
        <Route path="/rounds/:roundId/projects/:projectId" element={<ProjectPage />} />
        <Route path="*" element={null} />
      </Route>
    </Routes>
  );
}
