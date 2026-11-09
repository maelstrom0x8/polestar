import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import App from "./App";
import { WalletProvider } from "./lib/wallet";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element #root not found in the document. Check index.html.",
  );
}

// Chain state changes at block-height cadence, not continuously — a
// short staleTime avoids a refetch storm on every mount/focus without
// going stale for the length of a typical page visit.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
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
