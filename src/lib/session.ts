import { getDashboardLoginUrl, isBookfySubdomainHost } from "@/hooks/useSubdomain";
import { unregisterWebPushSubscription } from "@/lib/pushNotifications";

/** Auth keys wiped on logout. Login preferences (saved email) are intentionally kept. */
const SESSION_KEYS = [
  "profit-pilot-user-id",
  "profit-pilot-user-name",
  "profit-pilot-user-email",
  "profit-pilot-business-name",
  "profit-pilot-profile-picture-url",
  "profit-pilot-is-admin",
  "profit-pilot-authenticated",
  "profit-pilot-workspace-mode",
  "profit-pilot-active-workspace-id",
] as const;

/** Shared with the pre-React guard in main.tsx — keep the literal in sync. */
export const LOGOUT_MARKER_KEY = "trippo-logged-out-at";

/** Blocks cross-origin #auth= restore and app auto-redirects right after logout. */
const FRESH_LOGOUT_MS = 2 * 60 * 1000;
/** Blocks Google One Tap auto sign-in for longer, so the user can actually stay out. */
const AUTOLOGIN_SUPPRESS_MS = 10 * 60 * 1000;

export function isAppSubdomainHost(hostname: string = window.location.hostname): boolean {
  return hostname.startsWith("admin.") || isBookfySubdomainHost(hostname);
}

/** Device-level preferences, not identity — they survive logout. */
const KEPT_KEYS = new Set<string>([
  "profit-pilot-saved-login-email",
  "profit-pilot-remember-login",
  "profit-pilot-sidebar-collapsed",
  "profit-pilot-notification-permission",
  "profit-pilot-notification-declined",
]);

/** Clear auth session keys on the current origin. */
export function clearAppSession(): void {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));

  // Sweep any other cached identity/workspace state so nothing can rehydrate the session.
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("profit-pilot-") && !KEPT_KEYS.has(key))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }

  // Preserve the logout marker across sessionStorage.clear().
  const marker =
    safeGet(sessionStorage, LOGOUT_MARKER_KEY) || safeGet(localStorage, LOGOUT_MARKER_KEY);
  sessionStorage.clear();
  if (marker) {
    safeSet(sessionStorage, LOGOUT_MARKER_KEY, marker);
    safeSet(localStorage, LOGOUT_MARKER_KEY, marker);
  }
}

function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Record an explicit logout on this origin. */
export function markLoggedOut(): void {
  const now = String(Date.now());
  safeSet(localStorage, LOGOUT_MARKER_KEY, now);
  safeSet(sessionStorage, LOGOUT_MARKER_KEY, now);
  disableGoogleAutoSelect();
}

/**
 * Ask Google Identity Services to forget the auto-select consent, otherwise One Tap
 * signs the user straight back in on the next page load.
 */
export function disableGoogleAutoSelect(): void {
  try {
    (
      window as unknown as {
        google?: { accounts?: { id?: { disableAutoSelect?: () => void } } };
      }
    ).google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    /* ignore */
  }
}

function loggedOutWithin(ms: number): boolean {
  const raw =
    safeGet(sessionStorage, LOGOUT_MARKER_KEY) || safeGet(localStorage, LOGOUT_MARKER_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at < ms;
}

/** True just after logout — skip auto-redirects back into the app. */
export function isFreshLogout(): boolean {
  return loggedOutWithin(FRESH_LOGOUT_MS);
}

/** True for a few minutes after logout — skip Google One Tap auto sign-in. */
export function isLogoutAutoLoginSuppressed(): boolean {
  return loggedOutWithin(AUTOLOGIN_SUPPRESS_MS);
}

/** Clear logout guards after an intentional successful login. */
export function clearLogoutGuards(): void {
  try {
    sessionStorage.removeItem(LOGOUT_MARKER_KEY);
    localStorage.removeItem(LOGOUT_MARKER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * When landing with ?logout=1, clear any stale session for this origin.
 * Call during render (before children) so login/home do not bounce back into the app.
 */
export function applyLogoutQueryParamIfPresent(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("logout") !== "1") return false;

  markLoggedOut();
  clearAppSession();

  const url = new URL(window.location.href);
  url.searchParams.delete("logout");
  // Drop any #auth= payload so it cannot restore the session we just cleared.
  const hash = url.hash.startsWith("#auth=") ? "" : url.hash;
  window.history.replaceState(null, "", `${url.pathname}${url.search}${hash}`);

  window.dispatchEvent(new Event("pin-auth-changed"));
  window.dispatchEvent(new Event("user-data-changed"));
  return true;
}

/**
 * Log out on the current origin and land on the dashboard login page.
 * User must sign in again to reach the app — no homepage / One Tap bounce.
 */
export function logoutAndGoHome(): void {
  // Best-effort push cleanup while userId is still available — never block logout.
  void unregisterWebPushSubscription();

  markLoggedOut();
  clearAppSession();
  window.dispatchEvent(new Event("pin-auth-changed"));
  window.dispatchEvent(new Event("user-data-changed"));

  const loginUrl = getDashboardLoginUrl("/login");
  const sep = loginUrl.includes("?") ? "&" : "?";
  window.location.replace(`${loginUrl}${sep}logout=1`);
}
