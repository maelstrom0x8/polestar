const MAX_U128 = (1n << 128n) - 1n;

export function contractJson(value: unknown, indent?: number): string {
  const json = JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? `__big__${v}` : v), indent);
  return json.replace(/"__big__(-?\d+)"/g, "$1");
}

export function parsePreservingBigNumbers(json: string): unknown {
  const trimmed = json.trim();
  if (/^\d{16,}$/.test(trimmed)) return trimmed;
  return JSON.parse(json.replace(/(?<=[:,[])(\d{16,})(?=[,}\]])/g, '"$1"'));
}

export function utf8ToBase64(text: string): string {
  let binary = "";
  new TextEncoder().encode(text).forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

export function base64ToUtf8(encoded: string): string {
  const binary = atob(encoded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function toU128(value: bigint | string | number): bigint {
  const big = typeof value === "bigint" ? value : BigInt(value);
  if (big < 0n || big > MAX_U128) throw new RangeError(`${value} is outside the u128 range`);
  return big;
}

export function toId(value: unknown, what = "id"): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${what} ${String(value)} is not a safe non-negative integer`);
  return n;
}
