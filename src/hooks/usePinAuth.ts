import { useState, useEffect, useCallback } from "react";

const AUTH_KEY = "profit-pilot-authenticated";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(localStorage.getItem(AUTH_KEY) === "true");
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pin-auth-changed", checkAuth);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pin-auth-changed", checkAuth);
    };
  }, []);

  const markAuthenticated = useCallback(() => {
    localStorage.setItem(AUTH_KEY, "true");
    setIsAuthenticated(true);
    window.dispatchEvent(new Event("pin-auth-changed"));
  }, []);

  const clearAuth = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new Event("pin-auth-changed"));
  }, []);

  return {
    isAuthenticated,
    markAuthenticated,
    clearAuth,
  };
};

// Backward-compatible alias used across the app
export const usePinAuth = () => {
  const auth = useAuth();
  return {
    isAuthenticated: auth.isAuthenticated,
    hasPin: auth.isAuthenticated,
    clearAuth: auth.clearAuth,
    setPin: () => true,
    verifyPin: () => auth.isAuthenticated,
    getPinStatus: () => ({ hasPin: false, isSet: false }),
    changePin: () => false,
  };
};
