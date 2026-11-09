import { Wallet } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { truncateAccountId } from "../../lib/format";
import { signInHref } from "../../lib/returnPath";
import { useWallet } from "../../lib/wallet";

export function AccountButton() {
  const { accountId } = useWallet();
  const location = useLocation();

  if (location.pathname === "/sign-in") return null;

  if (accountId) {
    return (
      <Link
        to={signInHref(location)}
        className="btn btn-secondary account-button"
        title={`Signed in as ${accountId}`}
      >
        <Wallet aria-hidden size={16} />
        <span className="account-button__id">{truncateAccountId(accountId)}</span>
      </Link>
    );
  }

  return (
    <Link to={signInHref(location)} className="btn btn-secondary">
      Sign in
    </Link>
  );
}
