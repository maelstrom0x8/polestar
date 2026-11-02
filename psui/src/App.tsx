import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { RoundsPage } from "./pages/RoundsPage";
import { RoundDetailPage } from "./pages/RoundDetailPage";
import { DesignSystemPage } from "./pages/DesignSystemPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppShell />}>
        <Route path="/rounds" element={<RoundsPage />} />
        <Route path="/rounds/:id" element={<RoundDetailPage />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
      </Route>
    </Routes>
  );
}
