const NEAR_DECIMALS = 24;
const YOCTO_PER_NEAR = 10n ** BigInt(NEAR_DECIMALS);

function toBigInt(yocto: string | number | bigint): bigint {
  return typeof yocto === "bigint" ? yocto : BigInt(yocto);
}

/**
 * Exact yoctoNEAR -> "1.25" style string: at least two decimals, up to
 * five when the amount needs them, never rounded up.
 */
export function formatNearAmount(yocto: string | number | bigint): string {
  const value = toBigInt(yocto);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / YOCTO_PER_NEAR;
  const frac = (abs % YOCTO_PER_NEAR).toString().padStart(NEAR_DECIMALS, "0").slice(0, 5);
  const trimmed = frac.replace(/0+$/, "").padEnd(2, "0");
  return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}.${trimmed}`;
}

export function formatNear(yocto: string | number | bigint): string {
  return `${formatNearAmount(yocto)} NEAR`;
}

/**
 * Exact decimal NEAR -> yoctoNEAR. Returns null for anything that isn't a
 * plain non-negative decimal with at most 24 fractional digits.
 */
export function parseNear(input: string): bigint | null {
  const text = input.trim();
  const match = /^(\d+)(?:\.(\d*))?$/.exec(text) ?? /^()\.(\d+)$/.exec(text);
  if (!match) return null;
  const [, whole, frac = ""] = match;
  if (frac.length > NEAR_DECIMALS) return null;
  return BigInt(whole || "0") * YOCTO_PER_NEAR + BigInt(frac.padEnd(NEAR_DECIMALS, "0") || "0");
}

// Implicit accounts are 64 hex chars; named ones are usually short enough to show whole.
export function truncateAccountId(accountId: string): string {
  return accountId.length <= 24 ? accountId : `${accountId.slice(0, 10)}…${accountId.slice(-8)}`;
}
