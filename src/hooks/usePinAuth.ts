import { useState, useEffect, useCallback } from "react";

const PIN_STORAGE_KEY = "profit-pilot-pin";
const PIN_AUTH_KEY = "profit-pilot-authenticated";

export const usePinAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  // Check if PIN exists and authentication status on mount and when storage changes
  useEffect(() => {
    const checkAuth = () => {
      const pin = localStorage.getItem(PIN_STORAGE_KEY);
      setHasPin(!!pin);
      
      // Check if user is already authenticated in this session
      const authenticated = sessionStorage.getItem(PIN_AUTH_KEY) === "true";
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    // Listen for storage changes (when PIN is verified in another component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PIN_AUTH_KEY) {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event for same-window updates
    const handleAuthChange = () => {
      checkAuth();
    };
    
    window.addEventListener("pin-auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pin-auth-changed", handleAuthChange);
    };
  }, []);

  // Set or update PIN
  const setPin = useCallback((pin: string): boolean => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return false; // Invalid PIN format
    }
    localStorage.setItem(PIN_STORAGE_KEY, pin);
    setHasPin(true);
    return true;
  }, []);

  // Verify PIN
  const verifyPin = useCallback((pin: string): boolean => {
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedPin) {
      return false; // No PIN set
    }
    if (pin === storedPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem(PIN_AUTH_KEY, "true");
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event("pin-auth-changed"));
      return true;
    }
    return false;
  }, []);

  // Clear authentication (logout)
  const clearAuth = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(PIN_AUTH_KEY);
    // Dispatch event to notify other components
    window.dispatchEvent(new Event("pin-auth-changed"));
  }, []);

  // Get PIN (for settings display - should be masked)
  const getPinStatus = useCallback((): { hasPin: boolean; isSet: boolean } => {
    const pin = localStorage.getItem(PIN_STORAGE_KEY);
    return {
      hasPin: !!pin,
      isSet: !!pin,
    };
  }, []);

  // Change PIN (requires old PIN verification)
  const changePin = useCallback((oldPin: string, newPin: string): boolean => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return false; // Invalid new PIN format
    }
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedPin || storedPin !== oldPin) {
      return false; // Old PIN doesn't match
    }
    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    return true;
  }, []);

  return {
    isAuthenticated,
    hasPin,
    setPin,
    verifyPin,
    clearAuth,
    getPinStatus,
    changePin,
  };
};
