import { useCallback, useEffect, useMemo, useState } from "react";
import { workspaceApi } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WORKSPACE_CHANGED_EVENT, WORKSPACE_META_CHANGED_EVENT } from "@/lib/workspace";

export type WorkspaceMemberAvatar = {
  id: string;
  userId: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
};

const MAX_VISIBLE = 4;

let cachedMembers: WorkspaceMemberAvatar[] = [];
let cachedWorkspaceId: string | null = null;
let membersFetchPromise: Promise<void> | null = null;

export function useWorkspaceMemberAvatars() {
  const { mode, activeWorkspace } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMemberAvatar[]>(() => {
    if (mode === "workspace" && activeWorkspace?.id === cachedWorkspaceId) {
      return cachedMembers;
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(
    async (force = false) => {
      if (mode !== "workspace" || !activeWorkspace?.id) {
        cachedMembers = [];
        cachedWorkspaceId = null;
        setMembers([]);
        return;
      }

      if (!force && activeWorkspace.id === cachedWorkspaceId) {
        setMembers(cachedMembers);
        return;
      }

      if (!force && membersFetchPromise && activeWorkspace.id === cachedWorkspaceId) {
        await membersFetchPromise;
        setMembers(cachedMembers);
        return;
      }

      setLoading(true);
      const workspaceId = activeWorkspace.id;
      membersFetchPromise = (async () => {
        try {
          const response = await workspaceApi.getMembers(workspaceId);
          cachedMembers = (response.members as WorkspaceMemberAvatar[]) || [];
          cachedWorkspaceId = workspaceId;
          setMembers(cachedMembers);
        } catch {
          cachedMembers = [];
          setMembers([]);
        } finally {
          setLoading(false);
          membersFetchPromise = null;
        }
      })();
      await membersFetchPromise;
    },
    [mode, activeWorkspace?.id],
  );

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const onChanged = () => {
      const userId = localStorage.getItem("profit-pilot-user-id");
      if (!userId) {
        cachedMembers = [];
        cachedWorkspaceId = null;
        setMembers([]);
        return;
      }
      void loadMembers(true);
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
    window.addEventListener(WORKSPACE_META_CHANGED_EVENT, onChanged);
    window.addEventListener("user-data-changed", onChanged);
    window.addEventListener("pin-auth-changed", onChanged);
    return () => {
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
      window.removeEventListener(WORKSPACE_META_CHANGED_EVENT, onChanged);
      window.removeEventListener("user-data-changed", onChanged);
      window.removeEventListener("pin-auth-changed", onChanged);
    };
  }, [loadMembers]);

  const currentUserId = localStorage.getItem("profit-pilot-user-id");

  const { visibleMembers, overflowMembers, overflowCount } = useMemo(() => {
    if (!members.length) {
      return { visibleMembers: [], overflowMembers: [], overflowCount: 0 };
    }

    const sorted = [...members].sort((a, b) => {
      if (currentUserId && String(a.userId) === currentUserId) return 1;
      if (currentUserId && String(b.userId) === currentUserId) return -1;
      return a.name.localeCompare(b.name);
    });

    return {
      visibleMembers: sorted.slice(0, MAX_VISIBLE),
      overflowMembers: sorted.slice(MAX_VISIBLE),
      overflowCount: Math.max(0, sorted.length - MAX_VISIBLE),
    };
  }, [members, currentUserId]);

  return {
    members,
    visibleMembers,
    overflowMembers,
    overflowCount,
    totalCount: members.length,
    currentUserId,
    loading,
    isWorkspaceMode: mode === "workspace" && Boolean(activeWorkspace?.id),
  };
}
