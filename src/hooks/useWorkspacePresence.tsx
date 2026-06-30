import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceActiveUsers } from "@/hooks/useWorkspaceActiveUsers";

type WorkspacePresenceContextValue = {
  activeUsers: ReturnType<typeof useWorkspaceActiveUsers>["activeUsers"];
  activeCount: number;
};

const WorkspacePresenceContext = createContext<WorkspacePresenceContextValue>({
  activeUsers: [],
  activeCount: 0,
});

export function WorkspacePresenceProvider({ children }: { children: ReactNode }) {
  const { mode, activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id || "";
  const enabled = mode === "workspace" && Boolean(workspaceId);
  const { activeUsers, activeCount } = useWorkspaceActiveUsers(workspaceId, enabled);

  const value = useMemo(
    () => ({ activeUsers, activeCount }),
    [activeUsers, activeCount],
  );

  return (
    <WorkspacePresenceContext.Provider value={value}>
      {children}
    </WorkspacePresenceContext.Provider>
  );
}

export function useWorkspacePresence() {
  return useContext(WorkspacePresenceContext);
}
