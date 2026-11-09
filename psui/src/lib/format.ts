const YOCTO_PER_NEAR = 1_000_000_000_000_000_000_000_000n;

export function formatNear(yocto: string): string {
  const value = BigInt(yocto);
  const whole = value / YOCTO_PER_NEAR;
  const frac = (value % YOCTO_PER_NEAR) * 100n / YOCTO_PER_NEAR;
  const fracStr = frac.toString().padStart(2, "0");
  const wholeStr = whole.toLocaleString("en-US");
  return fracStr === "00" ? `${wholeStr} NEAR` : `${wholeStr}.${fracStr} NEAR`;
}

export function nearToYocto(near: string): string {
  const value = Number(near);
  if (!Number.isFinite(value) || value < 0) return "0";
  return BigInt(Math.round(value * 1_000_000)).toString() + "0".repeat(18);
}

// Implicit accounts are 64 hex chars; named ones are usually short enough to show whole.
export function truncateAccountId(accountId: string): string {
  return accountId.length <= 24 ? accountId : `${accountId.slice(0, 10)}…${accountId.slice(-8)}`;
}
