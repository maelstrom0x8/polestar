const DEFAULT_RETURN_PATH = "/rounds";

/**
 * The return target arrives in a query string anyone can craft, so only a
 * same-origin path is honoured — anything else would make /sign-in an open
 * redirect. Parsing through URL (rather than prefix checks) also catches
 * forms like "//evil.example" and "/\evil.example" that browsers resolve
 * to another host.
 */
export function safeReturnPath(raw: string | null): string {
  if (!raw) return DEFAULT_RETURN_PATH;
  let url: URL;
  try {
    url = new URL(raw, window.location.origin);
  } catch {
    return DEFAULT_RETURN_PATH;
  }
  if (url.origin !== window.location.origin || url.pathname === "/sign-in") return DEFAULT_RETURN_PATH;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function signInHref(location: { pathname: string; search: string; hash: string }): string {
  const here = `${location.pathname}${location.search}${location.hash}`;
  return `/sign-in?next=${encodeURIComponent(here)}`;
}
