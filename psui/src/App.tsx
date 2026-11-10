import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { AccountPage } from "./pages/AccountPage";
import { ProposalsPage } from "./pages/ProposalsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ProposePage } from "./pages/ProposePage";
import { ProposeProjectPage } from "./pages/ProposeProjectPage";
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
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/rounds" element={<RoundsPage />} />
        <Route path="/rounds/:roundId" element={<RoundPage />} />
        <Route path="/propose" element={<ProposePage />} />
        <Route path="/rounds/:roundId/propose" element={<ProposeProjectPage />} />
        <Route path="/rounds/:roundId/projects/:projectId" element={<ProjectPage />} />
        <Route path="*" element={null} />
      </Route>
    </Routes>
  );
}
