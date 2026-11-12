import { Route, Routes } from "react-router-dom";
import { ScrollManager } from "./components/ScrollManager";
import { AppShell } from "./components/layout/AppShell";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { AboutPage } from "./pages/AboutPage";
import { AccountPage } from "./pages/AccountPage";
import { FaqPage } from "./pages/FaqPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ProposalsPage } from "./pages/ProposalsPage";
import { ProposePage } from "./pages/ProposePage";
import { ProposeProjectPage } from "./pages/ProposeProjectPage";
import { RoundPage } from "./pages/RoundPage";
import { RoundsPage } from "./pages/RoundsPage";
import { SignInPage } from "./pages/SignInPage";

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/proposals" element={<ProposalsPage />} />
          <Route path="/rounds" element={<RoundsPage />} />
          <Route path="/rounds/:roundId" element={<RoundPage />} />
          <Route path="/propose" element={<ProposePage />} />
          <Route path="/rounds/:roundId/propose" element={<ProposeProjectPage />} />
          <Route path="/rounds/:roundId/projects/:projectId" element={<ProjectPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
