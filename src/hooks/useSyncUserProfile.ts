import { useEffect, useRef } from "react";
import { authApi } from "@/lib/api";

/** Pull latest profile fields (including picture URL) from the API once per session. */
export function useSyncUserProfile() {
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;

    const userId = localStorage.getItem("profit-pilot-user-id");
    const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";
    const isAdmin = localStorage.getItem("profit-pilot-is-admin") === "true";

    if (!userId || !authenticated || isAdmin || userId === "admin") {
      return;
    }

    syncedRef.current = true;
    void authApi.getCurrentUser(true).catch(() => {
      syncedRef.current = false;
    });
  }, []);
}
