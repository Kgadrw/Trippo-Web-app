import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isDashboardSubdomain, redirectToHomepage } from "@/utils/subdomain";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check authentication status - run on every location change
    const checkAuth = () => {
      // Check for auth success flag in URL (from login redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const authSuccess = urlParams.get('auth') === 'success';
      
      const performAuthCheck = () => {
        // Try multiple times to read from storage (in case of timing issues)
        let attempts = 0;
        const maxAttempts = authSuccess ? 10 : 1; // More retries for auth success
        
        const tryAuthCheck = () => {
          attempts++;
          const userId = localStorage.getItem("profit-pilot-user-id");
          const authenticated = sessionStorage.getItem("profit-pilot-authenticated") === "true";
          const adminStatus = localStorage.getItem("profit-pilot-is-admin") === "true";

          // Debug logging in development
          if (import.meta.env.DEV && authSuccess && attempts === 1) {
            console.log("ProtectedRoute: Checking auth after login redirect", {
              userId,
              authenticated,
              adminStatus,
              requireAdmin,
              isDashboardSubdomain: isDashboardSubdomain()
            });
          }

          // For admin routes, check admin status instead of regular userId
          if (requireAdmin) {
            if (adminStatus && authenticated && userId === "admin") {
              setIsAuthenticated(true);
              setIsAdmin(true);
              setIsChecking(false);
              return;
            } else if (attempts < maxAttempts && authSuccess) {
              // Retry if we have auth success flag and haven't reached max attempts
              setTimeout(tryAuthCheck, 100);
              return;
            } else {
              if (import.meta.env.DEV) {
                console.warn("ProtectedRoute: Admin auth failed", { attempts, maxAttempts, userId, authenticated, adminStatus });
              }
              setIsAuthenticated(false);
              setIsAdmin(false);
              setIsChecking(false);
              return;
            }
          }

          // For regular routes, require userId and authentication
          if (!userId || !authenticated) {
            if (attempts < maxAttempts && authSuccess) {
              // Retry if we have auth success flag and haven't reached max attempts
              setTimeout(tryAuthCheck, 100);
              return;
            }
            if (import.meta.env.DEV) {
              console.warn("ProtectedRoute: Auth failed", { attempts, maxAttempts, userId, authenticated });
            }
            setIsAuthenticated(false);
            setIsAdmin(false);
            setIsChecking(false);
            return;
          }

          setIsAuthenticated(true);
          setIsAdmin(adminStatus);
          setIsChecking(false);
        };
        
        tryAuthCheck();
      };
      
      // If auth success flag is present, clean up URL and give extra time
      if (authSuccess) {
        // Clean up the URL parameter immediately
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Give more time for storage to be fully accessible after cross-subdomain redirect
        // Also trigger a storage read to ensure it's accessible
        setTimeout(() => {
          // Force a storage read to ensure it's accessible
          try {
            localStorage.getItem("profit-pilot-user-id");
            sessionStorage.getItem("profit-pilot-authenticated");
          } catch (e) {
            console.error("Error accessing storage:", e);
          }
          performAuthCheck();
        }, 200);
      } else {
        performAuthCheck();
      }
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
        const userId = localStorage.getItem("profit-pilot-user-id");
        const authenticated = sessionStorage.getItem("profit-pilot-authenticated") === "true";
        const currentPath = window.location.pathname;
        // On subdomain, dashboard is at root, so check for both / and /dashboard
        const protectedRoutes = ['/dashboard', '/products', '/sales', '/reports', '/settings', '/admin-dashboard'];
        const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route)) || 
                                 (currentPath === '/' && isDashboardSubdomain());

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
    // If on dashboard subdomain, redirect to main domain homepage
    if (isDashboardSubdomain()) {
      redirectToHomepage();
      return null; // Return null while redirecting
    }
    // On main domain, just redirect to home
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin) {
    // If on dashboard subdomain, redirect to main domain homepage
    if (isDashboardSubdomain()) {
      redirectToHomepage();
      return null; // Return null while redirecting
    }
    // On main domain, just redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
