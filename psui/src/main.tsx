import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./index.css";
import "./styles/app.css";
import "./styles/marketing.css";
import App from "./App";
import { ContractPanicError } from "./lib/near";
import { WalletProvider } from "./lib/wallet";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element #root not found in the document. Check index.html.",
  );
}

// Chain state changes at block-height cadence, not continuously, so a
// short staleTime avoids a refetch storm on every mount/focus without
// going stale for the length of a typical page visit.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      // A contract panic is deterministic; retrying it only delays the answer.
      retry: (failures, error) => !(error instanceof ContractPanicError) && failures < 1,
    },
  },
});

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <WalletProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WalletProvider>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
