export const NEAR_DECIMALS = 24;
export const YOCTO_PER_NEAR = 10n ** BigInt(NEAR_DECIMALS);
export const TGAS = 10n ** 12n;

const NAMED_ACCOUNT = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function parseNear(input: string): bigint | null {
  const text = input.trim();
  const match = /^(\d+)(?:\.(\d*))?$/.exec(text) ?? /^()\.(\d+)$/.exec(text);
  if (!match) return null;
  const [, whole, frac = ""] = match;
  if (frac.length > NEAR_DECIMALS) return null;
  return BigInt(whole || "0") * YOCTO_PER_NEAR + BigInt(frac.padEnd(NEAR_DECIMALS, "0") || "0");
}

export function formatNearAmount(yocto: bigint | string | number, options: { exact?: boolean } = {}): string {
  const value = typeof yocto === "bigint" ? yocto : BigInt(yocto);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / YOCTO_PER_NEAR;
  const frac = (abs % YOCTO_PER_NEAR)
    .toString()
    .padStart(NEAR_DECIMALS, "0")
    .slice(0, options.exact ? NEAR_DECIMALS : 5);
  const trimmed = frac.replace(/0+$/, "").padEnd(2, "0");
  return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}.${trimmed}`;
}

export function isValidAccountId(id: string): boolean {
  if (id.length < 2 || id.length > 64) return false;
  return NAMED_ACCOUNT.test(id) || /^[0-9a-f]{64}$/.test(id) || /^0x[0-9a-f]{40}$/.test(id);
}
