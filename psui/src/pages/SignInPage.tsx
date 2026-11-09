import type { WalletManifest } from "@hot-labs/near-connect";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { safeReturnPath } from "../lib/returnPath";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import { useWallet } from "../lib/wallet";
import { EVM_WALLET_IDS, HARDWARE_WALLET_IDS, NEAR_WALLET_IDS } from "../lib/walletManifest";

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
      <ul className="wallet-list">
        {members.map((wallet) => {
          const busy = pendingId === wallet.id;
          return (
            <li key={wallet.id}>
              <button
                type="button"
                className="wallet-option"
                onClick={() => onSelect(wallet.id)}
                disabled={pendingId !== null}
                aria-busy={busy}
              >
                <img src={wallet.icon} alt="" className="wallet-option__icon" />
                <span className="wallet-option__text">
                  <span className="wallet-option__name">{wallet.name}</span>
                  <span className="wallet-option__detail">
                    {busy ? "Waiting for your wallet…" : WALLET_DETAIL[wallet.id]}
                  </span>
                </span>
                {wallet.id === lastWalletId && !busy && <span className="wallet-option__tag">Recent</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SignInPage() {
  const { status, accountId, wallets, lastWalletId, signIn, signOut } = useWallet();
  const [params] = useSearchParams();
  const next = safeReturnPath(params.get("next"));
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const showLoading = useDelayedFlag(status === "loading", 500);

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

  async function handleSignOut() {
    setNotice(null);
    try {
      await signOut();
    } catch (error) {
      setNotice({ tone: "error", text: `Couldn't sign out: ${error instanceof Error ? error.message : String(error)}` });
    }
  }

  const groupProps = { wallets, lastWalletId, pendingId, onSelect: handleSelect };

  return (
    <div className="page sign-in-page">
      <h1 className="h1">Sign in</h1>

      {accountId ? (
        <>
          <p className="sign-in-page__lede">
            You're signed in as <strong className="sign-in-page__account">{accountId}</strong>.
          </p>
          <div className="sign-in-page__actions">
            <Link to={next} className="btn btn-primary">
              Continue
            </Link>
            <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="sign-in-page__lede">
            Sign in with your NEAR account to register projects, vote, or help advance a round.
          </p>

          {notice && (
            <p
              className={`sign-in-page__notice sign-in-page__notice--${notice.tone}`}
              role={notice.tone === "error" ? "alert" : "status"}
            >
              {notice.text}
            </p>
          )}

          {status === "error" ? (
            <p className="sign-in-page__notice sign-in-page__notice--error" role="alert">
              Wallet connection couldn't be started. Reload the page to try again.
            </p>
          ) : status === "loading" ? (
            showLoading && <p className="sign-in-page__note">Loading wallets…</p>
          ) : (
            <>
              <WalletGroup title="NEAR wallets" ids={NEAR_WALLET_IDS} {...groupProps} />
              <WalletGroup title="Hardware wallet" ids={HARDWARE_WALLET_IDS} {...groupProps} />
              <WalletGroup title="Ethereum wallets" ids={EVM_WALLET_IDS} {...groupProps} />
            </>
          )}
        </>
      )}
    </div>
  );
}
