import { useMemo } from 'react';

export type Subdomain = 'admin' | 'bookfy' | null;

const LEGACY_APP_SUBDOMAIN = 'dashboard';

function resolveAppSubdomainLabel(hostname: string): 'bookfy' | null {
  const cleanHostname = hostname.replace(/^www\./, '');
  const parts = cleanHostname.split('.');

  if (parts.length >= 3 && parts[parts.length - 2] === 'trippo' && parts[parts.length - 1] === 'rw') {
    if (parts[0] === 'bookfy' || parts[0] === LEGACY_APP_SUBDOMAIN) return 'bookfy';
  }

  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    if (parts[0] === 'bookfy' || parts[0] === LEGACY_APP_SUBDOMAIN) return 'bookfy';
  }

  return null;
}

/**
 * Hook to detect the current subdomain from the hostname
 * Returns 'admin' for admin.trippo.rw, 'bookfy' for bookfy.trippo.rw, or null for trippo.rw
 */
export function useSubdomain(): Subdomain {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const hostname = window.location.hostname;

    if (hostname.replace(/^www\./, '') === 'trippo.rw' || hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }

    if (hostname.replace(/^www\./, '').split('.')[0] === 'admin') {
      return 'admin';
    }

    if (resolveAppSubdomainLabel(hostname)) {
      return 'bookfy';
    }

    return null;
  }, []);
}

/** Redirect dashboard.* hostnames to bookfy.* (legacy bookmarks). */
export function redirectLegacyDashboardHost(): void {
  if (typeof window === 'undefined') return;

  const hostname = window.location.hostname;
  if (!hostname.startsWith(`${LEGACY_APP_SUBDOMAIN}.`)) return;

  const url = new URL(window.location.href);
  url.hostname = hostname.replace(/^dashboard\./, 'bookfy.');
  window.location.replace(url.toString());
}

/**
 * Get the full subdomain URL for navigation
 */
export function getSubdomainUrl(subdomain: 'admin' | 'bookfy' | null, path: string = ''): string {
  if (typeof window === 'undefined') {
    return path;
  }

  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';

  if (subdomain === 'admin') {
    if (window.location.hostname.includes('trippo.rw')) {
      return `${protocol}//admin.trippo.rw${port}${path}`;
    }
    return `${protocol}//admin.localhost${port}${path}`;
  }

  if (subdomain === 'bookfy') {
    if (window.location.hostname.includes('trippo.rw')) {
      return `${protocol}//bookfy.trippo.rw${port}${path}`;
    }
    return `${protocol}//bookfy.localhost${port}${path}`;
  }

  if (window.location.hostname.includes('trippo.rw')) {
    return `${protocol}//trippo.rw${port}${path}`;
  }
  return `${protocol}//localhost${port}${path}`;
}

export function isBookfySubdomainHost(hostname: string = window.location.hostname): boolean {
  return resolveAppSubdomainLabel(hostname) === 'bookfy';
}
