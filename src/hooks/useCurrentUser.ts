// Hook to get current logged-in user data
// Fetches user data ONCE and caches it to prevent shaking during other data fetches
import { useState, useEffect, useCallback, useRef } from "react";

const USER_NAME_KEY = "profit-pilot-user-name";
const USER_EMAIL_KEY = "profit-pilot-user-email";
const BUSINESS_NAME_KEY = "profit-pilot-business-name";

export interface CurrentUser {
  name: string;
  email?: string;
  businessName?: string;
}

// Global cache for user data - fetched once, shared across all components
let globalUserCache: CurrentUser | null = null;
let isUserDataInitialized = false;

// Initialize user data from localStorage once (called on app startup)
const initializeUserData = (): CurrentUser | null => {
  if (isUserDataInitialized && globalUserCache) {
    return globalUserCache;
  }

  const name = localStorage.getItem(USER_NAME_KEY);
  const email = localStorage.getItem(USER_EMAIL_KEY);
  const businessName = localStorage.getItem(BUSINESS_NAME_KEY);

  if (name) {
    globalUserCache = {
      name,
      email: email || undefined,
      businessName: businessName || undefined,
    };
  } else {
    globalUserCache = null;
  }

  isUserDataInitialized = true;
  return globalUserCache;
};

export const useCurrentUser = () => {
  // Initialize with cached data immediately (no loading state)
  const [user, setUser] = useState<CurrentUser | null>(() => {
    // Initialize from cache on first render
    if (!isUserDataInitialized) {
      return initializeUserData();
    }
    return globalUserCache;
  });

  // Track if we've loaded user data to prevent unnecessary re-reads
  const hasLoadedRef = useRef(false);

  // Load user data from localStorage (only updates if data actually changed)
  const loadUser = useCallback(() => {
    const name = localStorage.getItem(USER_NAME_KEY);
    const email = localStorage.getItem(USER_EMAIL_KEY);
    const businessName = localStorage.getItem(BUSINESS_NAME_KEY);

    const newUser: CurrentUser | null = name ? {
      name,
      email: email || undefined,
      businessName: businessName || undefined,
    } : null;

    // Only update state if user data actually changed (prevents unnecessary re-renders)
    setUser((prevUser) => {
      if (
        prevUser?.name === newUser?.name &&
        prevUser?.email === newUser?.email &&
        prevUser?.businessName === newUser?.businessName
      ) {
        // No change, return previous value to prevent re-render
        return prevUser;
      }
      // Data changed, update cache and return new value
      globalUserCache = newUser;
      return newUser;
    });
  }, []);

  // Load user on mount (only once)
  useEffect(() => {
    // Only load if not already loaded
    if (!hasLoadedRef.current) {
      // Initialize from cache first (instant, no localStorage read)
      if (globalUserCache) {
        setUser(globalUserCache);
      } else {
        // Load from localStorage only if cache is empty
        loadUser();
      }
      hasLoadedRef.current = true;
    }

    // Listen for storage changes (only update when user data actually changes)
    const handleStorageChange = () => {
      // Only reload if user data was actually modified
      const name = localStorage.getItem(USER_NAME_KEY);
      const email = localStorage.getItem(USER_EMAIL_KEY);
      const businessName = localStorage.getItem(BUSINESS_NAME_KEY);
      
      const newUser: CurrentUser | null = name ? {
        name,
        email: email || undefined,
        businessName: businessName || undefined,
      } : null;

      // Only update if data actually changed
      if (
        globalUserCache?.name !== newUser?.name ||
        globalUserCache?.email !== newUser?.email ||
        globalUserCache?.businessName !== newUser?.businessName
      ) {
        globalUserCache = newUser;
        setUser(newUser);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event for same-window updates
    window.addEventListener("user-data-changed", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("user-data-changed", handleStorageChange);
    };
  }, [loadUser]);

  // Update user data (only updates name, email, businessName - never changes userId)
  const updateUser = useCallback((userData: Partial<CurrentUser>) => {
    // Ensure we have a userId before updating user data (prevents switching users)
    const currentUserId = localStorage.getItem("profit-pilot-user-id");
    if (!currentUserId) {
      console.warn("Cannot update user data: No userId found in localStorage");
      return;
    }

    // Update localStorage
    if (userData.name) {
      localStorage.setItem(USER_NAME_KEY, userData.name);
    }
    if (userData.email !== undefined) {
      if (userData.email) {
        localStorage.setItem(USER_EMAIL_KEY, userData.email);
      } else {
        localStorage.removeItem(USER_EMAIL_KEY);
      }
    }
    if (userData.businessName !== undefined) {
      if (userData.businessName) {
        localStorage.setItem(BUSINESS_NAME_KEY, userData.businessName);
      } else {
        localStorage.removeItem(BUSINESS_NAME_KEY);
      }
    }
    
    // Verify userId hasn't changed after update (safety check)
    const userIdAfterUpdate = localStorage.getItem("profit-pilot-user-id");
    if (userIdAfterUpdate !== currentUserId) {
      console.error("User ID changed during update! Restoring original userId.");
      localStorage.setItem("profit-pilot-user-id", currentUserId);
    }
    
    // Update global cache immediately (no localStorage read needed)
    const name = localStorage.getItem(USER_NAME_KEY);
    const email = localStorage.getItem(USER_EMAIL_KEY);
    const businessName = localStorage.getItem(BUSINESS_NAME_KEY);
    
    const updatedUser: CurrentUser | null = name ? {
      name,
      email: email || undefined,
      businessName: businessName || undefined,
    } : null;
    
    globalUserCache = updatedUser;
    
    // Update state only if it changed
    setUser((prevUser) => {
      if (
        prevUser?.name === updatedUser?.name &&
        prevUser?.email === updatedUser?.email &&
        prevUser?.businessName === updatedUser?.businessName
      ) {
        return prevUser; // No change, prevent re-render
      }
      return updatedUser;
    });
    
    // Trigger event to update other components
    window.dispatchEvent(new Event("user-data-changed"));
  }, []);

  // Clear user data
  const clearUser = useCallback(() => {
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(BUSINESS_NAME_KEY);
    globalUserCache = null;
    isUserDataInitialized = false;
    setUser(null);
    window.dispatchEvent(new Event("user-data-changed"));
  }, []);

  return {
    user,
    updateUser,
    clearUser,
    refreshUser: loadUser,
  };
};
