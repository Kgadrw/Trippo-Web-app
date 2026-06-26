export const WORKSPACE_MODE_KEY = 'profit-pilot-workspace-mode';
export const WORKSPACE_ID_KEY = 'profit-pilot-active-workspace-id';
export const WORKSPACE_CHANGED_EVENT = 'profit-pilot-workspace-changed';
export const WORKSPACE_META_CHANGED_EVENT = 'profit-pilot-workspace-meta-changed';
export const STORED_DATA_SCOPE_KEY = 'profit-pilot-stored-data-scope';

export type WorkspaceMode = 'personal' | 'workspace';

export type WorkspacePageKey =
  | 'dashboard'
  | 'products'
  | 'sales'
  | 'schedules'
  | 'calendar'
  | 'team'
  | 'finance'
  | 'reports'
  | 'documents';

export type WorkspaceSummary = {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  permissions: WorkspacePageKey[];
  ownerId?: string;
  isOwner?: boolean;
};

export type WorkspacePageMeta = {
  key: WorkspacePageKey;
  label: string;
  path: string;
};

export const WORKSPACE_PAGES: WorkspacePageMeta[] = [
  { key: 'dashboard', label: 'Overview', path: '/' },
  { key: 'products', label: 'Products', path: '/products' },
  { key: 'sales', label: 'Sales', path: '/sales' },
  { key: 'schedules', label: 'Automations', path: '/schedules' },
  { key: 'calendar', label: 'Calendar', path: '/calendar' },
  { key: 'team', label: 'Team', path: '/team' },
  { key: 'finance', label: 'Finance', path: '/finance/income' },
  { key: 'reports', label: 'Reports', path: '/reports' },
  { key: 'documents', label: 'Documents', path: '/documents' },
];

export function getStoredWorkspaceMode(): WorkspaceMode {
  const value = localStorage.getItem(WORKSPACE_MODE_KEY);
  return value === 'workspace' ? 'workspace' : 'personal';
}

export function getStoredWorkspaceId(): string | null {
  return localStorage.getItem(WORKSPACE_ID_KEY);
}

/** Stable key for cache/offline scoping: `personal` or `workspace:<id>`. */
export function getWorkspaceScopeKey(): string {
  const mode = getStoredWorkspaceMode();
  if (mode === 'workspace') {
    const id = getStoredWorkspaceId();
    return id ? `workspace:${id}` : 'personal';
  }
  return 'personal';
}

type ScopedRecord = { workspaceId?: string | null };

export function itemBelongsToCurrentScope(item: ScopedRecord): boolean {
  const mode = getStoredWorkspaceMode();
  const activeWorkspaceId = getStoredWorkspaceId();
  const recordWorkspaceId = item.workspaceId ? String(item.workspaceId) : null;

  if (mode === 'workspace') {
    return Boolean(activeWorkspaceId && recordWorkspaceId === activeWorkspaceId);
  }

  return recordWorkspaceId == null;
}

export function filterByCurrentScope<T>(items: T[]): T[] {
  return items.filter((item) => itemBelongsToCurrentScope(item as ScopedRecord));
}

export function persistWorkspaceContext(mode: WorkspaceMode, workspaceId: string | null) {
  localStorage.setItem(WORKSPACE_MODE_KEY, mode);
  if (mode === 'workspace' && workspaceId) {
    localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
  } else {
    localStorage.removeItem(WORKSPACE_ID_KEY);
  }
  window.dispatchEvent(new Event(WORKSPACE_CHANGED_EVENT));
}

/** Optional patch applied immediately before refreshing workspace list from API. */
export type WorkspaceMetaChangedDetail = {
  workspaceId: string;
  name?: string;
};

/** Workspace name, members, or invites changed — refresh header without switching scope. */
export function notifyWorkspaceMetaChanged(detail?: WorkspaceMetaChangedDetail) {
  window.dispatchEvent(new CustomEvent(WORKSPACE_META_CHANGED_EVENT, { detail }));
}

export function canAccessPage(
  mode: WorkspaceMode,
  role: WorkspaceSummary['role'] | null,
  permissions: WorkspacePageKey[],
  pageKey: WorkspacePageKey,
): boolean {
  if (mode === 'personal') return true;
  if (!role) return false;
  if (role === 'owner' || role === 'admin') return true;
  return permissions.includes(pageKey);
}

export function pathToWorkspacePage(pathname: string): WorkspacePageKey | null {
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/team')) return 'team';
  if (pathname.startsWith('/dashboard') || pathname === '/') return 'dashboard';
  for (const page of WORKSPACE_PAGES) {
    if (pathname === page.path || pathname.startsWith(`${page.path}/`)) {
      return page.key;
    }
  }
  return null;
}

const ENDPOINT_PAGE_KEYS: Partial<Record<string, WorkspacePageKey>> = {
  products: 'products',
  sales: 'sales',
  expenses: 'finance',
  incomes: 'finance',
  bills: 'finance',
  payrolls: 'finance',
  taxes: 'finance',
  invoices: 'finance',
  bankDeposits: 'finance',
  loans: 'finance',
  documents: 'documents',
  clients: 'finance',
  vendors: 'finance',
  accounts: 'finance',
  categoryBudgets: 'finance',
  schedules: 'schedules',
  bookings: 'calendar',
};

export function endpointToWorkspacePage(endpoint: string): WorkspacePageKey | null {
  return ENDPOINT_PAGE_KEYS[endpoint] ?? null;
}

export function canAccessEndpointInWorkspace(
  mode: WorkspaceMode,
  role: WorkspaceSummary['role'] | null,
  permissions: WorkspacePageKey[],
  endpoint: string,
): boolean {
  if (mode !== 'workspace') return true;
  const pageKey = endpointToWorkspacePage(endpoint);
  if (!pageKey) return true;
  return canAccessPage(mode, role, permissions, pageKey);
}
