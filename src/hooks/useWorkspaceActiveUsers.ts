import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { websocketManager } from "@/lib/websocketManager";
import {
  WORKSPACE_PRESENCE_HEARTBEAT_EVENT,
  WORKSPACE_PRESENCE_JOIN_EVENT,
  WORKSPACE_PRESENCE_LEAVE_EVENT,
  WORKSPACE_PRESENCE_UPDATE_EVENT,
  type WorkspaceActiveUser,
} from "@/lib/workspaceChatRealtime";

const HEARTBEAT_MS = 10_000;
const JOIN_RETRY_MS = 2_000;

export function useWorkspaceActiveUsers(workspaceId: string, enabled: boolean) {
  const { user: currentUser } = useCurrentUser();
  const { members } = useWorkspaceMemberAvatars();
  const [activeUsers, setActiveUsers] = useState<WorkspaceActiveUser[]>([]);

  useEffect(() => {
    if (!enabled || !workspaceId) {
      setActiveUsers([]);
      return;
    }

    const profile = {
      workspaceId,
      userName: currentUser?.name,
      profilePictureUrl: currentUser?.profilePictureUrl,
    };

    const join = () => {
      websocketManager.emit(WORKSPACE_PRESENCE_JOIN_EVENT, profile);
    };

    join();

    const joinRetry = window.setInterval(() => {
      if (!websocketManager.isConnected()) return;
      join();
    }, JOIN_RETRY_MS);

    const heartbeat = window.setInterval(() => {
      websocketManager.emit(WORKSPACE_PRESENCE_HEARTBEAT_EVENT, profile);
    }, HEARTBEAT_MS);

    const onPresenceUpdate = (payload: {
      workspaceId?: string;
      activeUsers?: WorkspaceActiveUser[];
    }) => {
      if (!payload || String(payload.workspaceId) !== String(workspaceId)) return;
      setActiveUsers(payload.activeUsers || []);
    };

    const unsub = websocketManager.subscribe(
      WORKSPACE_PRESENCE_UPDATE_EVENT,
      onPresenceUpdate,
    );

    const onReconnect = () => join();
    window.addEventListener("app-websocket-open", onReconnect);

    const onVisible = () => {
      if (document.visibilityState === "visible") join();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(joinRetry);
      window.clearInterval(heartbeat);
      unsub();
      window.removeEventListener("app-websocket-open", onReconnect);
      document.removeEventListener("visibilitychange", onVisible);
      websocketManager.emit(WORKSPACE_PRESENCE_LEAVE_EVENT, { workspaceId });
      setActiveUsers([]);
    };
  }, [enabled, workspaceId, currentUser?.name, currentUser?.profilePictureUrl]);

  const enrichedActiveUsers = useMemo(() => {
    const memberByUserId = new Map(
      members.map((member) => [String(member.userId), member]),
    );

    return activeUsers.map((user) => {
      const member = memberByUserId.get(String(user.userId));
      return {
        userId: String(user.userId),
        name: user.userName || member?.name || "User",
        profilePictureUrl: user.profilePictureUrl ?? member?.profilePictureUrl ?? null,
      };
    });
  }, [activeUsers, members]);

  return {
    activeUsers: enrichedActiveUsers,
    activeCount: enrichedActiveUsers.length,
  };
}
