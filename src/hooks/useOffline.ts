// Hook for detecting online/offline status and sync status

import { useState, useEffect } from "react";
import { SyncManager, getSyncStatus } from "@/lib/syncManager";

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const syncManager = SyncManager.getInstance();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncManager.syncAll();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check sync status periodically
    const checkSyncStatus = async () => {
      try {
        const status = await getSyncStatus();
        setPendingSyncs(status.pending);
      } catch (error) {
        console.error("Error checking sync status:", error);
      }
    };

    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    pendingSyncs,
    syncAll: () => syncManager.syncAll(),
  };
};
