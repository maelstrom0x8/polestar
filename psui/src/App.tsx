import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="*" element={null} />
      </Route>
    </Routes>
  );
}
