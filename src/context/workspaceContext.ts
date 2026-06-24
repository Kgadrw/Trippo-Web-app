import { createContext } from 'react';
import {
  canAccessPage,
  getStoredWorkspaceMode,
  WORKSPACE_PAGES,
  type WorkspacePageKey,
  type WorkspaceMode,
  type WorkspaceSummary,
} from '@/lib/workspace';

export type WorkspaceContextValue = {
  mode: WorkspaceMode;
  activeWorkspace: WorkspaceSummary | null;
  workspaces: WorkspaceSummary[];
  loading: boolean;
  isWorkspaceAdmin: boolean;
  switchToPersonal: () => void;
  switchToWorkspace: (workspace: WorkspaceSummary) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<WorkspaceSummary>;
  canAccessPage: (pageKey: WorkspacePageKey) => boolean;
  pages: typeof WORKSPACE_PAGES;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function createFallbackWorkspaceValue(): WorkspaceContextValue {
  const mode = getStoredWorkspaceMode();
  return {
    mode,
    activeWorkspace: null,
    workspaces: [],
    loading: true,
    isWorkspaceAdmin: false,
    switchToPersonal: () => undefined,
    switchToWorkspace: () => undefined,
    refreshWorkspaces: async () => undefined,
    createWorkspace: async () => {
      throw new Error('Workspace is not ready yet');
    },
    canAccessPage: (pageKey) => canAccessPage(mode, null, [], pageKey),
    pages: WORKSPACE_PAGES,
  };
}
