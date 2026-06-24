import { itemBelongsToCurrentScope } from '@/lib/workspace';

export const WORKSPACE_ACTIVITY_EVENT = 'workspace-activity';

export type WorkspaceActivityDetail = {
  action: 'created' | 'updated' | 'deleted';
  resource: 'product' | 'sale' | string;
  actorName: string;
  label?: string;
};

export function matchesRealtimeRecord(record: { workspaceId?: string | null } | null | undefined): boolean {
  if (!record) return false;
  return itemBelongsToCurrentScope(record);
}

export function notifyWorkspaceActivity(detail: WorkspaceActivityDetail) {
  window.dispatchEvent(new CustomEvent(WORKSPACE_ACTIVITY_EVENT, { detail }));
}

export function isRemoteWorkspaceActor(record: { _actorUserId?: string } | null | undefined): boolean {
  if (!record?._actorUserId) return false;
  const currentUserId = localStorage.getItem('profit-pilot-user-id');
  return Boolean(currentUserId && record._actorUserId !== currentUserId);
}
