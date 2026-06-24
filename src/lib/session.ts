import { getSubdomainUrl, isBookfySubdomainHost } from "@/hooks/useSubdomain";

const SESSION_KEYS = [
  "profit-pilot-user-id",
  "profit-pilot-user-name",
  "profit-pilot-user-email",
  "profit-pilot-business-name",
  "profit-pilot-profile-picture-url",
  "profit-pilot-is-admin",
  "profit-pilot-authenticated",
] as const;

export function isAppSubdomainHost(hostname: string = window.location.hostname): boolean {
  return hostname.startsWith("admin.") || isBookfySubdomainHost(hostname);
}

/** Clear auth session keys on the current origin. */
export function clearAppSession(): void {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.clear();
}

/**
 * When landing on the main domain with ?logout=1, clear stale session from a prior subdomain login.
 * Call during render (before children) so Home does not redirect back to a subdomain.
 */
export function applyLogoutQueryParamIfPresent(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("logout") !== "1") return false;

  clearAppSession();

  const url = new URL(window.location.href);
  url.searchParams.delete("logout");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

  window.dispatchEvent(new Event("pin-auth-changed"));
  window.dispatchEvent(new Event("user-data-changed"));
  return true;
}

/** Log out on the current origin and land on the main-domain homepage. */
export function logoutAndGoHome(): void {
  clearAppSession();
  window.dispatchEvent(new Event("pin-auth-changed"));
  window.dispatchEvent(new Event("user-data-changed"));

  const homeUrl = getSubdomainUrl(null);
  const currentHost = window.location.hostname;
  const homeHost = new URL(homeUrl).hostname;

  if (currentHost !== homeHost && isAppSubdomainHost(currentHost)) {
    window.location.replace(`${homeUrl}?logout=1`);
    return;
  }

  window.location.replace(homeUrl);
}
