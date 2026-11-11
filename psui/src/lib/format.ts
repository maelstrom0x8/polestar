import { formatNearAmount as formatYocto, parseNear } from "@ezeonlabs/polestar";

export { parseNear };

export function formatNearAmount(yocto: string | number | bigint, exact = false): string {
  return formatYocto(yocto, { exact });
}

export function formatNear(yocto: string | number | bigint, exact = false): string {
  return `${formatNearAmount(yocto, exact)} NEAR`;
}

// Implicit accounts are 64 hex chars; named ones are usually short enough to show whole.
export function truncateAccountId(accountId: string): string {
  return accountId.length <= 24 ? accountId : `${accountId.slice(0, 10)}…${accountId.slice(-8)}`;
}
