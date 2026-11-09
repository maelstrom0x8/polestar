import type { WalletManifest } from "@hot-labs/near-connect";
import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Callout } from "../components/app/Callout";
import { safeReturnPath } from "../lib/returnPath";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import { useWallet } from "../lib/wallet";
import { EVM_WALLET_IDS, HARDWARE_WALLET_IDS, LOCAL_WALLET_ICONS, NEAR_WALLET_IDS } from "../lib/walletManifest";

type Notice = { tone: "neutral" | "error"; text: string };

const WALLET_DETAIL: Record<string, string> = {
  "meteor-wallet": "Browser extension, web or mobile",
  "intear-wallet": "Web wallet",
  "near-cli": "Confirm in your terminal with near‑cli‑rs",
  ledger: "Hardware wallet over USB or Bluetooth",
  "ethereum-wallets": "MetaMask or WalletConnect",
};

function describeSignInFailure(error: unknown): Notice {
  const message = error instanceof Error ? error.message : String(error);
  if (/clos|reject|cancel|denied/i.test(message)) {
    return { tone: "neutral", text: "Sign-in was cancelled. Choose a wallet to try again." };
  }
  // The connector's own message when a wallet hands back no account —
  // in practice, the wallet's window was closed without choosing one.
  if (message === "Failed to sign in") {
    return { tone: "neutral", text: "Sign-in didn't complete. Choose a wallet to try again." };
  }
  if (/popup.*block|blocked.*popup/i.test(message)) {
    return {
      tone: "error",
      text: "Your browser blocked the wallet's window. Allow pop-ups for this site, then try again.",
    };
  }
  return { tone: "error", text: `Couldn't sign in: ${message}` };
}

interface WalletGroupProps {
  title: string;
  ids: readonly string[];
  wallets: WalletManifest[];
  lastWalletId: string | null;
  pendingId: string | null;
  onSelect: (walletId: string) => void;
}

function WalletGroup({ title, ids, wallets, lastWalletId, pendingId, onSelect }: WalletGroupProps) {
  const members = ids.flatMap((id) => wallets.filter((wallet) => wallet.id === id));
  if (members.length === 0) return null;

  return (
    <section className="wallet-group" aria-label={title}>
      <h2 className="wallet-group__title">{title}</h2>
      <ul className="option-grid">
        {members.map((wallet) => {
          const busy = pendingId === wallet.id;
          return (
            <li key={wallet.id}>
              <button
                type="button"
                className="option-tile"
                onClick={() => onSelect(wallet.id)}
                disabled={pendingId !== null}
                aria-busy={busy}
              >
                <span className="option-tile__top">
                  <img src={LOCAL_WALLET_ICONS[wallet.id] ?? wallet.icon} alt="" className="option-tile__icon" />
                  {wallet.id === lastWalletId && !busy && <span className="option-tile__tag">Recent</span>}
                </span>
                <span className="option-tile__name">{wallet.name}</span>
                <span className="option-tile__detail">{busy ? "Waiting for your wallet…" : WALLET_DETAIL[wallet.id]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SignInPage() {
  const { status, accountId, wallets, lastWalletId, signIn } = useWallet();
  const [params] = useSearchParams();
  const next = safeReturnPath(params.get("next"));
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const showLoading = useDelayedFlag(status === "loading", 500);

  if (accountId && pendingId === null) return <Navigate to={next} replace />;

  async function handleSelect(walletId: string) {
    setPendingId(walletId);
    setNotice(null);
    try {
      await signIn(walletId);
      navigate(next, { replace: true });
    } catch (error) {
      setNotice(describeSignInFailure(error));
    } finally {
      setPendingId(null);
    }
  }

  const groupProps = { wallets, lastWalletId, pendingId, onSelect: handleSelect };

  return (
    <div className="page sign-in">
      <section className="container sign-in__card">
        <div className="container__body">
          <h1 className="sign-in__title">Choose how to sign in</h1>
          <p className="sign-in__lede">
            Sign in with your NEAR account to register projects, vote, or help advance a round.
          </p>

          {notice && (
            <Callout
              tone={notice.tone === "error" ? "error" : "neutral"}
              title={notice.tone === "error" ? "Couldn't connect your wallet" : undefined}
              role={notice.tone === "error" ? "alert" : "status"}
            >
              {notice.text}
            </Callout>
          )}

          {status === "error" ? (
            <Callout tone="error" role="alert" title="Wallet connection couldn't start">
              Reload the page to try again.
            </Callout>
          ) : status === "loading" ? (
            showLoading && <p className="sign-in__lede">Loading wallets…</p>
          ) : (
            <>
              <WalletGroup title="NEAR wallets" ids={NEAR_WALLET_IDS} {...groupProps} />
              <WalletGroup title="Hardware wallet" ids={HARDWARE_WALLET_IDS} {...groupProps} />
              <WalletGroup title="Ethereum wallets" ids={EVM_WALLET_IDS} {...groupProps} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
