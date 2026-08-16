// Hook to get current logged-in user data
// Fetches user data ONCE and caches it to prevent shaking during other data fetches
import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeStoredFileUrl } from "@/lib/storedFileUrl";

const USER_NAME_KEY = "profit-pilot-user-name";
const USER_EMAIL_KEY = "profit-pilot-user-email";
const BUSINESS_NAME_KEY = "profit-pilot-business-name";
const PROFILE_PICTURE_URL_KEY = "profit-pilot-profile-picture-url";

export interface CurrentUser {
  name: string;
  email?: string;
  businessName?: string;
  profilePictureUrl?: string;
  /** Bumped when the picture changes so avatars refetch even if the URL path is unchanged. */
  profilePictureRevision?: number;
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
  const profilePictureUrlRaw = localStorage.getItem(PROFILE_PICTURE_URL_KEY);
  const profilePictureUrl = profilePictureUrlRaw
    ? normalizeStoredFileUrl(profilePictureUrlRaw)
    : null;
  if (profilePictureUrlRaw && profilePictureUrl && profilePictureUrlRaw !== profilePictureUrl) {
    localStorage.setItem(PROFILE_PICTURE_URL_KEY, profilePictureUrl);
  }

  if (name) {
    globalUserCache = {
      name,
      email: email || undefined,
      businessName: businessName || undefined,
      profilePictureUrl: profilePictureUrl || undefined,
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
    const profilePictureUrlRaw = localStorage.getItem(PROFILE_PICTURE_URL_KEY);
    const profilePictureUrl = profilePictureUrlRaw
      ? normalizeStoredFileUrl(profilePictureUrlRaw)
      : null;

    const pictureChanged = (globalUserCache?.profilePictureUrl || null) !== (profilePictureUrl || null);
    const newUser: CurrentUser | null = name
      ? {
          name,
          email: email || undefined,
          businessName: businessName || undefined,
          profilePictureUrl: profilePictureUrl || undefined,
          profilePictureRevision: pictureChanged
            ? Date.now()
            : globalUserCache?.profilePictureRevision,
        }
      : null;

    setUser((prevUser) => {
      if (
        prevUser?.name === newUser?.name &&
        prevUser?.email === newUser?.email &&
        prevUser?.businessName === newUser?.businessName &&
        prevUser?.profilePictureUrl === newUser?.profilePictureUrl &&
        prevUser?.profilePictureRevision === newUser?.profilePictureRevision
      ) {
        return prevUser;
      }
      globalUserCache = newUser;
      return newUser;
    });
  }, []);

  // Load user on mount (only once)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      if (globalUserCache) {
        setUser(globalUserCache);
      } else {
        loadUser();
      }
      hasLoadedRef.current = true;
    }

    // Cross-tab localStorage updates
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key &&
        event.key !== USER_NAME_KEY &&
        event.key !== USER_EMAIL_KEY &&
        event.key !== BUSINESS_NAME_KEY &&
        event.key !== PROFILE_PICTURE_URL_KEY
      ) {
        return;
      }
      loadUser();
    };

    // Same-window updates: updateUser already wrote globalUserCache (incl. revision).
    const handleUserDataChanged = () => {
      setUser(globalUserCache ? { ...globalUserCache } : null);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("user-data-changed", handleUserDataChanged);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("user-data-changed", handleUserDataChanged);
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
    if (userData.profilePictureUrl !== undefined) {
      if (userData.profilePictureUrl) {
        localStorage.setItem(
          PROFILE_PICTURE_URL_KEY,
          normalizeStoredFileUrl(userData.profilePictureUrl),
        );
      } else {
        localStorage.removeItem(PROFILE_PICTURE_URL_KEY);
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
    const profilePictureUrl = localStorage.getItem(PROFILE_PICTURE_URL_KEY);
    const pictureTouched = userData.profilePictureUrl !== undefined;
    const nextRevision = pictureTouched
      ? Date.now()
      : globalUserCache?.profilePictureRevision;

    const updatedUser: CurrentUser | null = name
      ? {
          name,
          email: email || undefined,
          businessName: businessName || undefined,
          profilePictureUrl: profilePictureUrl || undefined,
          profilePictureRevision: nextRevision,
        }
      : null;

    globalUserCache = updatedUser;

    // Always apply when picture changed (same URL can still mean new bytes).
    setUser((prevUser) => {
      if (
        !pictureTouched &&
        prevUser?.name === updatedUser?.name &&
        prevUser?.email === updatedUser?.email &&
        prevUser?.businessName === updatedUser?.businessName &&
        prevUser?.profilePictureUrl === updatedUser?.profilePictureUrl &&
        prevUser?.profilePictureRevision === updatedUser?.profilePictureRevision
      ) {
        return prevUser;
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
    localStorage.removeItem(PROFILE_PICTURE_URL_KEY);
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
