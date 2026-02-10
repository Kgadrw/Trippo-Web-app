import { useMemo } from 'react';

export type Subdomain = 'admin' | 'dashboard' | null;

/**
 * Hook to detect the current subdomain from the hostname
 * Returns 'admin' for admin.trippo.rw, 'dashboard' for dashboard.trippo.rw, or null for trippo.rw
 */
export function useSubdomain(): Subdomain {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const hostname = window.location.hostname;
    
    // Remove 'www.' if present
    const cleanHostname = hostname.replace(/^www\./, '');
    
    // Check if it's a subdomain of trippo.rw
    if (cleanHostname === 'trippo.rw' || cleanHostname === 'localhost' || cleanHostname === '127.0.0.1') {
      return null; // Main domain or localhost
    }
    
    // Extract subdomain
    const parts = cleanHostname.split('.');
    
    // For trippo.rw subdomains: admin.trippo.rw or dashboard.trippo.rw
    if (parts.length >= 3 && parts[parts.length - 2] === 'trippo' && parts[parts.length - 1] === 'rw') {
      const subdomain = parts[0];
      if (subdomain === 'admin') {
        return 'admin';
      }
      if (subdomain === 'dashboard') {
        return 'dashboard';
      }
    }
    
    // For local development: admin.localhost:8080 or dashboard.localhost:8080
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      const subdomain = parts[0];
      if (subdomain === 'admin') {
        return 'admin';
      }
      if (subdomain === 'dashboard') {
        return 'dashboard';
      }
    }
    
    return null;
  }, []);
}

/**
 * Get the full subdomain URL for navigation
 */
export function getSubdomainUrl(subdomain: 'admin' | 'dashboard' | null, path: string = ''): string {
  if (typeof window === 'undefined') {
    return path;
  }

  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';
  
  if (subdomain === 'admin') {
    // Check if we're in production (trippo.rw) or localhost
    if (window.location.hostname.includes('trippo.rw')) {
      return `${protocol}//admin.trippo.rw${port}${path}`;
    } else {
      // Local development
      return `${protocol}//admin.localhost${port}${path}`;
    }
  }
  
  if (subdomain === 'dashboard') {
    if (window.location.hostname.includes('trippo.rw')) {
      return `${protocol}//dashboard.trippo.rw${port}${path}`;
    } else {
      // Local development
      return `${protocol}//dashboard.localhost${port}${path}`;
    }
  }
  
  // Main domain
  if (window.location.hostname.includes('trippo.rw')) {
    return `${protocol}//trippo.rw${port}${path}`;
  } else {
    return `${protocol}//localhost${port}${path}`;
  }
}
