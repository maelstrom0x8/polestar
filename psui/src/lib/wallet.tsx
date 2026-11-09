import type { NearConnector, NearWalletBase, WalletManifest } from "@hot-labs/near-connect";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { RPC_URL } from "./near";
import { WALLET_MANIFEST } from "./walletManifest";

const KNOWN_WALLET_IDS = new Set(WALLET_MANIFEST.wallets.map((wallet) => wallet.id));
const LAST_WALLET_KEY = "psui:last-wallet";

// One connector per page load (StrictMode mounts effects twice). Loaded
// lazily so wallet code stays out of the first-paint bundle.
let connectorPromise: Promise<NearConnector> | null = null;

function getConnector(): Promise<NearConnector> {
  connectorPromise ??= import("@hot-labs/near-connect").then(
    ({ NearConnector }) =>
      new NearConnector({
        network: "testnet",
        manifest: WALLET_MANIFEST,
        providers: { testnet: [RPC_URL] },
        // The connector auto-connects any wallet a parent frame announces
        // via postMessage; nothing here should sign in without a click.
        autoConnect: false,
        footerBranding: null,
      }),
  );
  return connectorPromise;
}

/** The wallet that signs writes; rejects when nobody is signed in. */
export async function getConnectedWallet(): Promise<NearWalletBase> {
  const connector = await getConnector();
  const { wallet } = await connector.getConnectedWallet();
  return wallet;
}

const MOCK_ACCOUNT_KEY = "psui:mock-account";

function readMockAccount(): string | null {
  try {
    return sessionStorage.getItem(MOCK_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function writeMockAccount(accountId: string | null) {
  try {
    if (accountId) sessionStorage.setItem(MOCK_ACCOUNT_KEY, accountId);
    else sessionStorage.removeItem(MOCK_ACCOUNT_KEY);
  } catch {
    // Mock sessions are a convenience; losing one only signs the viewer out.
  }
}

function readLastWallet(): string | null {
  try {
    return localStorage.getItem(LAST_WALLET_KEY);
  } catch {
    return null;
  }
}

function writeLastWallet(walletId: string) {
  try {
    localStorage.setItem(LAST_WALLET_KEY, walletId);
  } catch {
    // Storage unavailable (private mode, blocked): the "recent" hint is optional.
  }
}

type WalletStatus = "loading" | "ready" | "error";

interface WalletContextValue {
  status: WalletStatus;
  accountId: string | null;
  wallets: WalletManifest[];
  lastWalletId: string | null;
  signIn: (walletId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function LiveWalletProvider({ children }: { children: ReactNode }) {
  const [connector, setConnector] = useState<NearConnector | null>(null);
  const [status, setStatus] = useState<WalletStatus>("loading");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletManifest[]>([]);
  const [lastWalletId, setLastWalletId] = useState<string | null>(readLastWallet);

  useEffect(() => {
    let cancelled = false;
    let detach: (() => void) | undefined;

    (async () => {
      const c = await getConnector();
      await c.whenManifestLoaded;
      if (cancelled) return;

      // Only the pinned wallets are ever offered, even if something else
      // registers itself with the connector (e.g. a framing page).
      const refreshWallets = () =>
        setWallets(c.availableWallets.map((w) => w.manifest).filter((m) => KNOWN_WALLET_IDS.has(m.id)));
      const onSignIn = (event: { accounts: { accountId: string }[] }) =>
        setAccountId(event.accounts[0]?.accountId ?? null);
      const onSignOut = () => setAccountId(null);

      c.on("selector:walletsChanged", refreshWallets);
      c.on("wallet:signIn", onSignIn);
      c.on("wallet:signOut", onSignOut);
      detach = () => {
        c.off("selector:walletsChanged", refreshWallets);
        c.off("wallet:signIn", onSignIn);
        c.off("wallet:signOut", onSignOut);
      };

      refreshWallets();
      const restored = await c.getConnectedWallet().catch(() => null);
      if (cancelled) return;
      setAccountId(restored?.accounts[0]?.accountId ?? null);
      setConnector(c);
      setStatus("ready");
    })().catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      detach?.();
    };
  }, []);

  const signIn = useCallback(
    async (walletId: string) => {
      if (!connector) throw new Error("Wallet connection is still starting.");
      if (!KNOWN_WALLET_IDS.has(walletId)) throw new Error("Unknown wallet.");
      await connector.connect({ walletId });
      writeLastWallet(walletId);
      setLastWalletId(walletId);
    },
    [connector],
  );

  const signOut = useCallback(async () => {
    if (!connector) return;
    await connector.disconnect();
  }, [connector]);

  const value = useMemo<WalletContextValue>(
    () => ({ status, accountId, wallets, lastWalletId, signIn, signOut }),
    [status, accountId, wallets, lastWalletId, signIn, signOut],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/**
 * Mock mode: the same wallet list, but choosing any wallet signs in as the
 * sample account instantly, and writes go to the simulated wallet.
 */
function MockWalletProvider({ children }: { children: ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(readMockAccount);
  const [lastWalletId, setLastWalletId] = useState<string | null>(readLastWallet);

  const value = useMemo<WalletContextValue>(
    () => ({
      status: "ready",
      accountId,
      wallets: WALLET_MANIFEST.wallets,
      lastWalletId,
      signIn: async (walletId: string) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const { MOCK_ACCOUNT } = await import("./mock/fixtures");
        writeMockAccount(MOCK_ACCOUNT);
        writeLastWallet(walletId);
        setLastWalletId(walletId);
        setAccountId(MOCK_ACCOUNT);
      },
      signOut: async () => {
        writeMockAccount(null);
        setAccountId(null);
      },
    }),
    [accountId, lastWalletId],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return __MOCK_DATA__ ? <MockWalletProvider>{children}</MockWalletProvider> : <LiveWalletProvider>{children}</LiveWalletProvider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider.");
  return context;
}
