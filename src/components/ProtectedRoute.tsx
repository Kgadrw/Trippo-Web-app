import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSubdomain, getSubdomainUrl } from "@/hooks/useSubdomain";
import { getAuthValue } from "@/lib/authStorage";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const location = useLocation();
  const subdomain = useSubdomain();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check authentication status - run on every location change
    const checkAuth = () => {
      // Use cross-subdomain auth storage (cookie for subdomains, localStorage as fallback)
      const userId = getAuthValue("profit-pilot-user-id");
      const authenticated = getAuthValue("profit-pilot-authenticated") === "true";
      const adminStatus = getAuthValue("profit-pilot-is-admin") === "true";

      // For admin routes, check admin status instead of regular userId
      if (requireAdmin) {
        if (adminStatus && authenticated && userId === "admin") {
          setIsAuthenticated(true);
          setIsAdmin(true);
          setIsChecking(false);
          return;
        } else {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsChecking(false);
          return;
        }
      }

      // For regular routes, require userId and authentication
      if (!userId || !authenticated) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      setIsAuthenticated(true);
      setIsAdmin(adminStatus);
      setIsChecking(false);
    };

    // Check immediately on mount and location change
    checkAuth();

    // Listen for authentication changes
    const handleAuthChange = () => {
      checkAuth();
    };

    // Listen for storage changes (logout from another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "profit-pilot-user-id" || e.key === "profit-pilot-authenticated") {
        checkAuth();
      }
    };

    window.addEventListener("pin-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("pin-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [requireAdmin, location.pathname]); // Re-check on route change

  // Prevent back button navigation to protected routes without authentication
  useEffect(() => {
    const handlePopState = () => {
      // Small delay to allow location to update
      setTimeout(() => {
        const userId = getAuthValue("profit-pilot-user-id");
        const authenticated = getAuthValue("profit-pilot-authenticated") === "true";
        const currentPath = window.location.pathname;
        const protectedRoutes = ['/dashboard', '/products', '/sales', '/reports', '/settings', '/admin-dashboard'];
        const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));

        if (isProtectedRoute && (!userId || !authenticated)) {
          // User is not authenticated but trying to access protected route via back button
          // Replace current history entry and redirect to home
          window.history.replaceState(null, "", "/");
          window.location.replace("/");
        }
      }, 0);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Always redirect to main domain home page for login
    const homeUrl = getSubdomainUrl(null);
    const currentHost = window.location.hostname;
    const homeHost = new URL(homeUrl).hostname;
    
    // Only redirect if we're on a subdomain
    if (currentHost !== homeHost && (currentHost.includes('admin.') || currentHost.includes('dashboard.'))) {
      // Redirect to main domain and stay there (no redirect loop)
      window.location.replace(homeUrl);
      return null;
    }
    
    // If already on main domain, show home page
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin) {
    // User is not admin, redirect to main domain home page
    const homeUrl = getSubdomainUrl(null);
    const currentHost = window.location.hostname;
    const homeHost = new URL(homeUrl).hostname;
    
    // Only redirect if we're on a subdomain
    if (currentHost !== homeHost && (currentHost.includes('admin.') || currentHost.includes('dashboard.'))) {
      window.location.replace(homeUrl);
      return null;
    }
    
    // If already on main domain, show home page
    return <Navigate to="/" replace />;
  }

  // Check if user is on wrong subdomain
  if (requireAdmin && subdomain !== 'admin') {
    // Admin should be on admin subdomain
    const adminUrl = getSubdomainUrl('admin');
    window.location.href = adminUrl;
    return null;
  }

  if (!requireAdmin && subdomain === 'admin') {
    // Regular user should not be on admin subdomain, redirect to dashboard
    const dashboardUrl = getSubdomainUrl('dashboard');
    window.location.href = dashboardUrl;
    return null;
  }

  return <>{children}</>;
}
