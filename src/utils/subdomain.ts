/**
 * Get the dashboard URL based on current domain
 * If on main domain, redirects to dashboard subdomain
 * If on dashboard subdomain, returns current URL
 */
export function getDashboardUrl(path: string = ''): string {
  if (typeof window === 'undefined') {
    return '/dashboard' + path;
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';

  // In development (localhost), use /dashboard path
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/dashboard' + (path || '');
  }

  // Check if we're already on dashboard subdomain
  if (hostname.startsWith('dashboard.')) {
    return path || '/';
  }

  // Extract main domain (e.g., trippo.rw from www.trippo.rw or trippo.rw)
  const parts = hostname.split('.');
  let mainDomain = hostname;
  
  // If has www, remove it
  if (parts[0] === 'www') {
    mainDomain = parts.slice(1).join('.');
  } else if (parts.length === 2) {
    // Already main domain (e.g., trippo.rw)
    mainDomain = hostname;
  } else if (parts.length > 2) {
    // Has subdomain, extract main domain
    mainDomain = parts.slice(-2).join('.');
  }

  // Construct dashboard subdomain URL
  const dashboardUrl = `${protocol}//dashboard.${mainDomain}${port}${path || '/'}`;
  return dashboardUrl;
}

/**
 * Get the main domain homepage URL
 * If on dashboard subdomain, redirects to main domain
 * If on main domain, returns current URL
 */
export function getHomepageUrl(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';

  // In development (localhost), use / path
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/';
  }

  // Check if we're on dashboard subdomain
  if (hostname.startsWith('dashboard.')) {
    // Extract main domain from subdomain
    const parts = hostname.split('.');
    const mainDomain = parts.slice(1).join('.'); // Remove 'dashboard' part
    return `${protocol}//${mainDomain}${port}/`;
  }

  // Already on main domain
  return '/';
}

/**
 * Check if current hostname is dashboard subdomain
 */
export function isDashboardSubdomain(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  
  // In development (localhost), treat /dashboard path as dashboard subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.location.pathname.startsWith('/dashboard');
  }
  
  return hostname.startsWith('dashboard.');
}

/**
 * Redirect to dashboard subdomain if on main domain
 */
export function redirectToDashboardSubdomain(path: string = '') {
  if (typeof window === 'undefined') return;
  
  if (!isDashboardSubdomain()) {
    const dashboardUrl = getDashboardUrl(path);
    window.location.href = dashboardUrl;
  }
}

/**
 * Redirect to main domain homepage
 */
export function redirectToHomepage() {
  if (typeof window === 'undefined') return;
  
  const homepageUrl = getHomepageUrl();
  if (homepageUrl.startsWith('http')) {
    window.location.href = homepageUrl;
  } else {
    window.location.href = '/';
  }
}
