import { useMemo } from 'react';

export function useSubdomain() {
  const subdomain = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    const hostname = window.location.hostname;
    
    // Check if we're on dashboard subdomain
    if (hostname.startsWith('dashboard.')) {
      return 'dashboard';
    }
    
    // Check for other subdomains if needed
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      // Has subdomain (e.g., dashboard.trippo.rw)
      return parts[0];
    }
    
    return null;
  }, []);

  const isDashboardSubdomain = subdomain === 'dashboard';
  const isMainDomain = subdomain === null;

  return {
    subdomain,
    isDashboardSubdomain,
    isMainDomain,
  };
}
