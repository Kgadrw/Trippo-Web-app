/** Optional email prefill for login (PIN is never stored here). */
export const LOGIN_PREF_SAVED_EMAIL = "profit-pilot-saved-login-email";
export const LOGIN_PREF_REMEMBER = "profit-pilot-remember-login";

export function getSavedLoginEmail(): string {
  if (typeof localStorage === "undefined") return "";
  if (localStorage.getItem(LOGIN_PREF_REMEMBER) === "false") return "";
  return localStorage.getItem(LOGIN_PREF_SAVED_EMAIL)?.trim() || "";
}

export function isRememberLoginEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(LOGIN_PREF_REMEMBER) !== "false";
}

export function setLoginPrefs(email: string | null, remember: boolean): void {
  if (remember && email?.trim()) {
    localStorage.setItem(LOGIN_PREF_SAVED_EMAIL, email.trim().toLowerCase());
    localStorage.setItem(LOGIN_PREF_REMEMBER, "true");
  } else {
    localStorage.removeItem(LOGIN_PREF_SAVED_EMAIL);
    localStorage.setItem(LOGIN_PREF_REMEMBER, "false");
  }
}
