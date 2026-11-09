// NEAR account id rules: 2-64 chars of lowercase alphanumerics separated
// by single - _ or . characters; also 64-hex implicit and 0x eth-implicit ids.
const NAMED = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function isValidAccountId(id: string): boolean {
  if (id.length < 2 || id.length > 64) return false;
  return NAMED.test(id) || /^[0-9a-f]{64}$/.test(id) || /^0x[0-9a-f]{40}$/.test(id);
}
