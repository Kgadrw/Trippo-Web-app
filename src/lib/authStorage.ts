/**
 * Cross-subdomain authentication storage
 * Uses cookies for subdomain access, localStorage as fallback
 */

const COOKIE_DOMAIN = window.location.hostname.includes('localhost') 
  ? 'localhost' 
  : '.trippo.rw';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Set a value in both cookie (for subdomain access) and localStorage (for same-domain access)
 */
export function setAuthValue(key: string, value: string): void {
  // Set in localStorage (for same-domain)
  localStorage.setItem(key, value);
  
  // Set in cookie (for cross-subdomain access)
  const expires = new Date();
  expires.setTime(expires.getTime() + COOKIE_MAX_AGE * 1000);
  document.cookie = `${key}=${encodeURIComponent(value)}; domain=${COOKIE_DOMAIN}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure=${window.location.protocol === 'https:'}`;
}

/**
 * Get a value from cookie (preferred for subdomains) or localStorage (fallback)
 */
export function getAuthValue(key: string): string | null {
  // First try cookie (works across subdomains)
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [cookieKey, cookieValue] = cookie.trim().split('=');
    if (cookieKey === key) {
      const value = decodeURIComponent(cookieValue);
      // Also sync to localStorage for consistency
      localStorage.setItem(key, value);
      return value;
    }
  }
  
  // Fallback to localStorage
  return localStorage.getItem(key);
}

/**
 * Remove a value from both cookie and localStorage
 */
export function removeAuthValue(key: string): void {
  localStorage.removeItem(key);
  
  // Remove cookie
  document.cookie = `${key}=; domain=${COOKIE_DOMAIN}; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
}

/**
 * Get all auth-related values
 */
export function getAllAuthValues(): {
  userId: string | null;
  isAdmin: boolean;
  authenticated: boolean;
  name: string | null;
  email: string | null;
  businessName: string | null;
} {
  return {
    userId: getAuthValue("profit-pilot-user-id"),
    isAdmin: getAuthValue("profit-pilot-is-admin") === "true",
    authenticated: getAuthValue("profit-pilot-authenticated") === "true",
    name: getAuthValue("profit-pilot-user-name"),
    email: getAuthValue("profit-pilot-user-email"),
    businessName: getAuthValue("profit-pilot-business-name"),
  };
}
