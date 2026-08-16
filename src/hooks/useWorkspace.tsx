import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
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
  shouldPreserveWorkspacePicture,
  WORKSPACE_CHANGED_EVENT,
  WORKSPACE_META_CHANGED_EVENT,
  WORKSPACE_PAGES,
  type WorkspaceMetaChangedDetail,
  type WorkspaceMode,
  type WorkspacePageKey,
  type WorkspaceSummary,
} from '@/lib/workspace';
import { normalizeStoredFileUrl } from '@/lib/storedFileUrl';
import { apiCache } from '@/lib/apiCache';
import { clearAllStores } from '@/lib/indexedDB';
import { getWorkspaceScopeKey, STORED_DATA_SCOPE_KEY } from '@/lib/workspace';
import { getDashboardPath } from '@/lib/appRoutes';

function clearDataCaches() {
  apiCache.clear();
  localStorage.setItem(STORED_DATA_SCOPE_KEY, getWorkspaceScopeKey());
  void clearAllStores().catch(() => undefined);
  window.dispatchEvent(new Event('profit-pilot-data-changed'));
  window.dispatchEvent(new Event('force-refresh-data'));
}

/**
 * Soft workspace switch: clear scoped caches and let React remount page content.
 * Avoids a full browser reload. Only falls back to location navigation for
 * cross-subdomain dashboard URLs.
 */
function softRefreshAfterWorkspaceChange(navigate: ReturnType<typeof useNavigate>) {
  clearDataCaches();
  const home = getDashboardPath();
  if (home.startsWith('http://') || home.startsWith('https://')) {
    window.location.assign(home);
    return;
  }
  // Stay on the current route when possible; WorkspacePageGuard redirects if needed.
  // Nudge React Router so listeners re-run even when path is unchanged.
  navigate('.', { replace: true });
}

const WORKSPACE_LIST_MIN_REFRESH_MS = 30_000;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<WorkspaceMode>(() => getStoredWorkspaceMode());
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => getStoredWorkspaceId());
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const lastWorkspaceFetchRef = useRef(0);

  const refreshWorkspaces = useCallback(async (options?: { force?: boolean }) => {
    const userId = localStorage.getItem('profit-pilot-user-id');
    if (!userId) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (!options?.force && now - lastWorkspaceFetchRef.current < WORKSPACE_LIST_MIN_REFRESH_MS) {
      setLoading(false);
      return;
    }
    lastWorkspaceFetchRef.current = now;

    try {
      const response = await workspaceApi.list(options);
      const list = (response.workspaces || []) as WorkspaceSummary[];
      setWorkspaces((prev) => {
        const prevById = new Map(prev.map((workspace) => [String(workspace.id), workspace]));
        return list.map((workspace) => {
          const previous = prevById.get(String(workspace.id));
          const incomingPicture =
            workspace.profilePictureUrl != null && workspace.profilePictureUrl !== ''
              ? normalizeStoredFileUrl(String(workspace.profilePictureUrl))
              : workspace.profilePictureUrl ?? null;
          if (shouldPreserveWorkspacePicture(previous)) {
            return {
              ...workspace,
              profilePictureUrl: previous!.profilePictureUrl,
              profilePictureRevision: previous!.profilePictureRevision,
            };
          }
          return {
            ...workspace,
            profilePictureUrl: incomingPicture,
            profilePictureRevision: previous?.profilePictureRevision,
          };
        });
      });

      if (mode === 'workspace' && activeWorkspaceId) {
        const stillMember = list.some((w) => String(w.id) === String(activeWorkspaceId));
        if (!stillMember) {
          persistWorkspaceContext('personal', null);
          softRefreshAfterWorkspaceChange(navigate);
        }
      }
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [mode, activeWorkspaceId, navigate]);

  useEffect(() => {
    void refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
    const onAuth = () => void refreshWorkspaces();
    window.addEventListener("pin-auth-changed", onAuth);
    return () => window.removeEventListener("pin-auth-changed", onAuth);
  }, [refreshWorkspaces]);

  useEffect(() => {
    const onMetaChanged = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceMetaChangedDetail | undefined>).detail;
      if (detail?.workspaceId) {
        setWorkspaces((prev) =>
          prev.map((w) =>
            String(w.id) === String(detail.workspaceId)
              ? {
                  ...w,
                  ...(detail.name != null ? { name: detail.name } : {}),
                  ...(detail.profilePictureUrl !== undefined
                    ? { profilePictureUrl: detail.profilePictureUrl }
                    : {}),
                  ...(detail.profilePictureRevision != null
                    ? { profilePictureRevision: detail.profilePictureRevision }
                    : {}),
                }
              : w,
          ),
        );
      }

      const pictureOnlyUpdate =
        detail?.workspaceId &&
        detail.profilePictureUrl !== undefined &&
        detail.name == null;

      if (!pictureOnlyUpdate) {
        void refreshWorkspaces({ force: true });
      }
    };
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
    () => workspaces.find((w) => String(w.id) === String(activeWorkspaceId)) || null,
    [workspaces, activeWorkspaceId],
  );

  const switchToPersonal = useCallback(() => {
    if (mode === 'personal' && !activeWorkspaceId) return;
    persistWorkspaceContext('personal', null);
    softRefreshAfterWorkspaceChange(navigate);
  }, [mode, activeWorkspaceId, navigate]);

  const switchToWorkspace = useCallback((workspace: WorkspaceSummary, options?: { remount?: boolean }) => {
    if (mode === 'workspace' && String(activeWorkspaceId) === String(workspace.id)) return;
    persistWorkspaceContext('workspace', workspace.id);
    // Notification clicks pass remount:false so we only switch context + navigate,
    // without an extra hard remount that feels like the page is jamming.
    if (options?.remount === false) return;
    softRefreshAfterWorkspaceChange(navigate);
  }, [mode, activeWorkspaceId, navigate]);

  const createWorkspace = useCallback(async (name: string) => {
    const response = await workspaceApi.create({ name });
    const workspace = response.workspace as WorkspaceSummary;
    await refreshWorkspaces({ force: true });
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
