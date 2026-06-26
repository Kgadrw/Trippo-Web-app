import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  WorkspaceContext,
  createFallbackWorkspaceValue,
  type WorkspaceContextValue,
} from '@/context/workspaceContext';
import { workspaceApi } from '@/lib/api';
import {
  canAccessPage,
  getStoredWorkspaceId,
  getStoredWorkspaceMode,
  persistWorkspaceContext,
  WORKSPACE_CHANGED_EVENT,
  WORKSPACE_META_CHANGED_EVENT,
  WORKSPACE_PAGES,
  type WorkspaceMode,
  type WorkspacePageKey,
  type WorkspaceSummary,
} from '@/lib/workspace';
import { apiCache } from '@/lib/apiCache';
import { clearAllStores } from '@/lib/indexedDB';
import { getWorkspaceScopeKey, STORED_DATA_SCOPE_KEY } from '@/lib/workspace';

function clearDataCaches() {
  apiCache.clear();
  localStorage.setItem(STORED_DATA_SCOPE_KEY, getWorkspaceScopeKey());
  void clearAllStores().catch(() => undefined);
  window.dispatchEvent(new Event('profit-pilot-data-changed'));
  window.dispatchEvent(new Event('force-refresh-data'));
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WorkspaceMode>(() => getStoredWorkspaceMode());
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => getStoredWorkspaceId());
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    const userId = localStorage.getItem('profit-pilot-user-id');
    if (!userId) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    try {
      const response = await workspaceApi.list();
      const list = (response.workspaces || []) as WorkspaceSummary[];
      setWorkspaces(list);

      if (mode === 'workspace' && activeWorkspaceId) {
        const stillMember = list.some((w) => w.id === activeWorkspaceId);
        if (!stillMember) {
          persistWorkspaceContext('personal', null);
          setMode('personal');
          setActiveWorkspaceId(null);
          clearDataCaches();
        }
      }
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [mode, activeWorkspaceId]);

  useEffect(() => {
    void refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
    const onAuth = () => void refreshWorkspaces();
    window.addEventListener("pin-auth-changed", onAuth);
    return () => window.removeEventListener("pin-auth-changed", onAuth);
  }, [refreshWorkspaces]);

  useEffect(() => {
    const onMetaChanged = () => void refreshWorkspaces();
    window.addEventListener(WORKSPACE_META_CHANGED_EVENT, onMetaChanged);
    return () => window.removeEventListener(WORKSPACE_META_CHANGED_EVENT, onMetaChanged);
  }, [refreshWorkspaces]);

  useEffect(() => {
    const onChanged = () => {
      setMode(getStoredWorkspaceMode());
      setActiveWorkspaceId(getStoredWorkspaceId());
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
  }, []);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || null,
    [workspaces, activeWorkspaceId],
  );

  const switchToPersonal = useCallback(() => {
    persistWorkspaceContext('personal', null);
    setMode('personal');
    setActiveWorkspaceId(null);
    clearDataCaches();
  }, []);

  const switchToWorkspace = useCallback((workspace: WorkspaceSummary) => {
    persistWorkspaceContext('workspace', workspace.id);
    setMode('workspace');
    setActiveWorkspaceId(workspace.id);
    clearDataCaches();
  }, []);

  const createWorkspace = useCallback(async (name: string) => {
    const response = await workspaceApi.create({ name });
    const workspace = response.workspace as WorkspaceSummary;
    await refreshWorkspaces();
    switchToWorkspace(workspace);
    return workspace;
  }, [refreshWorkspaces, switchToWorkspace]);

  const canAccess = useCallback(
    (pageKey: WorkspacePageKey) =>
      canAccessPage(mode, activeWorkspace?.role || null, activeWorkspace?.permissions || [], pageKey),
    [mode, activeWorkspace],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      mode,
      activeWorkspace,
      workspaces,
      loading,
      isWorkspaceAdmin: activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin',
      switchToPersonal,
      switchToWorkspace,
      refreshWorkspaces,
      createWorkspace,
      canAccessPage: canAccess,
      pages: WORKSPACE_PAGES,
    }),
    [
      mode,
      activeWorkspace,
      workspaces,
      loading,
      switchToPersonal,
      switchToWorkspace,
      refreshWorkspaces,
      createWorkspace,
      canAccess,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  return ctx ?? createFallbackWorkspaceValue();
}

export type { WorkspaceContextValue } from '@/context/workspaceContext';
