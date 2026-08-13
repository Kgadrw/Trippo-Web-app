import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { websocketManager } from "@/lib/websocketManager";
import {
  WORKSPACE_PRESENCE_HEARTBEAT_EVENT,
  WORKSPACE_PRESENCE_JOIN_EVENT,
  WORKSPACE_PRESENCE_UPDATE_EVENT,
  type WorkspaceActiveUser,
} from "@/lib/workspaceChatRealtime";

const HEARTBEAT_MS = 10_000;
const JOIN_RETRY_MS = 2_500;

type PresenceUpdatePayload = {
  workspaceId?: string;
  activeUsers?: Array<WorkspaceActiveUser & { lastSeen?: number | string }>;
};

function toMs(value?: number | string | Date | null): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Format WhatsApp-style presence subtitle. */
export function formatChatPresenceLabel(
  isOnline: boolean,
  lastSeenAt?: number | string | Date | null,
  labels?: {
    active?: string;
    activeJustNow?: string;
    activeMinutesAgo?: string;
    activeHoursAgo?: string;
    lastSeen?: string;
    offline?: string;
  },
): string {
  const active = labels?.active || "Active";
  const offline = labels?.offline || "Offline";
  if (isOnline) return active;

  const ms = toMs(lastSeenAt ?? null);
  if (ms == null) return offline;

  const diffMs = Math.max(0, Date.now() - ms);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return labels?.activeJustNow || "Active just now";
  if (minutes < 60) {
    return (labels?.activeMinutesAgo || "Active {n} min ago").replace("{n}", String(minutes));
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return (labels?.activeHoursAgo || "Active {n}h ago").replace("{n}", String(hours));
  }
  const time = new Date(ms).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (labels?.lastSeen || "Last seen {time}").replace("{time}", time);
}

/**
 * Join presence rooms for many workspaces (inbox spans orgs) and expose
 * online + last-seen lookup by user id.
 */
export function useMultiWorkspacePresence(workspaceIds: string[], enabled = true) {
  const { user: currentUser } = useCurrentUser();
  const roomsRef = useRef(new Map<string, Set<string>>());
  const lastSeenRef = useRef(new Map<string, number>());
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());
  const [lastSeenVersion, setLastSeenVersion] = useState(0);

  const uniqueIds = useMemo(() => {
    const set = new Set(
      workspaceIds.map((id) => String(id || "").trim()).filter(Boolean),
    );
    return Array.from(set).sort();
  }, [workspaceIds]);

  const idsKey = uniqueIds.join(",");

  const recomputeOnline = useCallback(() => {
    const next = new Set<string>();
    for (const room of roomsRef.current.values()) {
      for (const userId of room) next.add(userId);
    }
    setOnlineIds(next);
    setLastSeenVersion((v) => v + 1);
  }, []);

  const seedLastSeen = useCallback((userId: string, lastSeenAt?: string | number | Date | null) => {
    const id = String(userId || "");
    const ms = toMs(lastSeenAt ?? null);
    if (!id || ms == null) return;
    const prev = lastSeenRef.current.get(id);
    if (prev != null && prev >= ms) return;
    lastSeenRef.current.set(id, ms);
    setLastSeenVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !idsKey) {
      roomsRef.current.clear();
      setOnlineIds(new Set());
      return;
    }

    const ids = idsKey.split(",").filter(Boolean);
    const profileBase = {
      userName: currentUser?.name,
      profilePictureUrl: currentUser?.profilePictureUrl,
    };

    const joinAll = () => {
      for (const workspaceId of ids) {
        websocketManager.emit(WORKSPACE_PRESENCE_JOIN_EVENT, {
          ...profileBase,
          workspaceId,
        });
      }
    };

    joinAll();

    const joinRetry = window.setInterval(() => {
      if (!websocketManager.isConnected()) return;
      joinAll();
    }, JOIN_RETRY_MS);

    const heartbeat = window.setInterval(() => {
      for (const workspaceId of ids) {
        websocketManager.emit(WORKSPACE_PRESENCE_HEARTBEAT_EVENT, {
          ...profileBase,
          workspaceId,
        });
      }
    }, HEARTBEAT_MS);

    const onPresenceUpdate = (payload: PresenceUpdatePayload) => {
      const workspaceId = String(payload?.workspaceId || "");
      if (!workspaceId || !ids.includes(workspaceId)) return;

      const prev = roomsRef.current.get(workspaceId) || new Set<string>();
      const next = new Set<string>();
      const now = Date.now();

      for (const user of payload.activeUsers || []) {
        const userId = String(user.userId || "");
        if (!userId) continue;
        next.add(userId);
        const seen = toMs(user.lastSeen) ?? now;
        const prevSeen = lastSeenRef.current.get(userId);
        if (prevSeen == null || seen > prevSeen) {
          lastSeenRef.current.set(userId, seen);
        }
      }

      for (const userId of prev) {
        if (!next.has(userId) && !lastSeenRef.current.has(userId)) {
          lastSeenRef.current.set(userId, now);
        } else if (!next.has(userId)) {
          // Keep existing lastSeen; bump if missing freshness.
          const existing = lastSeenRef.current.get(userId);
          if (existing == null || now - existing > 60_000) {
            lastSeenRef.current.set(userId, now);
          }
        }
      }

      roomsRef.current.set(workspaceId, next);
      recomputeOnline();
    };

    const unsub = websocketManager.subscribe(
      WORKSPACE_PRESENCE_UPDATE_EVENT,
      onPresenceUpdate,
    );

    const onReconnect = () => joinAll();
    window.addEventListener("app-websocket-open", onReconnect);

    const onVisible = () => {
      if (document.visibilityState === "visible") joinAll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(joinRetry);
      window.clearInterval(heartbeat);
      unsub();
      window.removeEventListener("app-websocket-open", onReconnect);
      document.removeEventListener("visibilitychange", onVisible);
      // Do not emit leave — AppLayout's WorkspacePresenceProvider may still
      // need the active workspace room; stale TTL clears idle rooms.
      roomsRef.current.clear();
      setOnlineIds(new Set());
    };
  }, [
    enabled,
    idsKey,
    currentUser?.name,
    currentUser?.profilePictureUrl,
    recomputeOnline,
  ]);

  const isOnline = useCallback(
    (userId?: string | null) => {
      if (!userId) return false;
      return onlineIds.has(String(userId));
    },
    [onlineIds],
  );

  const getLastSeenAt = useCallback(
    (userId?: string | null) => {
      if (!userId) return null;
      void lastSeenVersion;
      return lastSeenRef.current.get(String(userId)) ?? null;
    },
    [lastSeenVersion],
  );

  return {
    isOnline,
    getLastSeenAt,
    seedLastSeen,
    onlineIds,
  };
}
