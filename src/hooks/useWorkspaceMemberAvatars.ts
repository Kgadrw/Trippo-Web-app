import { useCallback, useEffect, useMemo, useState } from "react";
import { workspaceApi } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WORKSPACE_CHANGED_EVENT } from "@/lib/workspace";

export type WorkspaceMemberAvatar = {
  id: string;
  userId: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
};

const MAX_VISIBLE = 4;

export function useWorkspaceMemberAvatars() {
  const { mode, activeWorkspace } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMemberAvatar[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (mode !== "workspace" || !activeWorkspace?.id) {
      setMembers([]);
      return;
    }

    setLoading(true);
    try {
      const response = await workspaceApi.getMembers(activeWorkspace.id);
      setMembers((response.members as WorkspaceMemberAvatar[]) || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [mode, activeWorkspace?.id]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const onChanged = () => {
      void loadMembers();
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
    window.addEventListener("user-data-changed", onChanged);
    return () => {
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
      window.removeEventListener("user-data-changed", onChanged);
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
    visibleMembers,
    overflowMembers,
    overflowCount,
    totalCount: members.length,
    currentUserId,
    loading,
    isWorkspaceMode: mode === "workspace" && Boolean(activeWorkspace?.id),
  };
}
