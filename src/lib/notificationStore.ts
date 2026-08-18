// Notification Store - Syncs notifications with backend database
// Uses localStorage as a cache; the backend is the source of truth.

import { notificationApi } from './api';
import {
  getStoredWorkspaceId,
  getStoredWorkspaceMode,
  itemBelongsToCurrentScope,
} from './workspace';

export interface StoredNotification {
  id: string;
  _id?: string; // MongoDB id from backend
  type: 'new_user' | 'low_stock' | 'schedule' | 'new_sale' | 'new_product' | 'general' | 'workspace_invite' | 'workspace_message' | 'task_completed' | 'task_assigned' | 'leave_request' | 'approval_change_request' | 'reminder';
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  read: boolean;
  data?: any;
  userId?: string;
  workspaceId?: string | null;
}

function asWorkspaceId(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id != null && String(obj._id)) return String(obj._id);
    if (obj.id != null && String(obj.id)) return String(obj.id);
    return null;
  }
  const id = String(value).trim();
  return id || null;
}

export function notificationWorkspaceId(
  notification: Pick<StoredNotification, 'workspaceId' | 'data'>,
): string | null {
  return asWorkspaceId(notification.workspaceId) || asWorkspaceId(notification.data?.workspaceId);
}

/** Invites are not scoped to the current workspace — you need to see them to join. */
function isGlobalNotification(notification: Pick<StoredNotification, 'type'>): boolean {
  return notification.type === 'workspace_invite';
}

export function notificationBelongsToCurrentScope(
  notification: Pick<StoredNotification, 'type' | 'workspaceId' | 'data'>,
): boolean {
  if (isGlobalNotification(notification)) return true;
  return itemBelongsToCurrentScope({ workspaceId: notificationWorkspaceId(notification) });
}

export function attachCurrentWorkspaceData(data?: Record<string, unknown> | null) {
  const next: Record<string, unknown> = { ...(data || {}) };
  if (next.workspaceId) return next;
  if (getStoredWorkspaceMode() !== 'workspace') return next;
  const workspaceId = getStoredWorkspaceId();
  if (workspaceId) next.workspaceId = workspaceId;
  return next;
}

class NotificationStore {
  private static instance: NotificationStore;
  private notifications: StoredNotification[] = [];
  private unreadCount = 0;
  private cacheKey = 'profit-pilot-notifications-cache';
  private isSyncing = false;
  private lastSyncTime = 0;
  private syncCooldown = 2000; // 2 seconds between backend syncs (keeps bell near-real-time)

  private constructor() {
    this.loadCache();
  }

  public static getInstance(): NotificationStore {
    if (!NotificationStore.instance) {
      NotificationStore.instance = new NotificationStore();
    }
    return NotificationStore.instance;
  }

  /**
   * Check if user is logged in
   */
  private isLoggedIn(): boolean {
    const userId = localStorage.getItem('profit-pilot-user-id');
    return !!userId && userId !== 'admin';
  }

  /**
   * Add a notification — saves to backend and updates local cache
   */
  public async addNotification(
    notification: Omit<StoredNotification, 'id' | '_id' | 'timestamp' | 'read' | 'userId'>
  ): Promise<void> {
    if (!this.isLoggedIn()) return;

    const data = attachCurrentWorkspaceData(notification.data);
    const workspaceId = asWorkspaceId(data.workspaceId);

    // Optimistic local update
    const tempNotification: StoredNotification = {
      ...notification,
      data,
      workspaceId,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
      userId: localStorage.getItem('profit-pilot-user-id') || undefined,
    };
    this.notifications.unshift(tempNotification);
    this.unreadCount++;
    this.saveCache();
    window.dispatchEvent(new CustomEvent('notifications-updated'));

    // Persist to backend
    try {
      const response = await notificationApi.create({
        type: notification.type,
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        data,
        workspaceId,
      });

      // Replace temp notification with the real one from backend
      if (response?.data) {
        const backendNotif = this.mapBackendNotification(response.data);
        const idx = this.notifications.findIndex(n => n.id === tempNotification.id);
        if (idx !== -1) {
          this.notifications[idx] = backendNotif;
        }
        this.saveCache();
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
    } catch (error) {
      console.error('[NotificationStore] Failed to save notification to backend:', error);
      // Keep the temp notification in cache so it's still visible
    }
  }

  /**
   * Fetch all notifications from the backend and update local cache
   */
  public async syncFromBackend(options?: { force?: boolean }): Promise<void> {
    if (!this.isLoggedIn() || this.isSyncing) return;

    const now = Date.now();
    if (!options?.force && now - this.lastSyncTime < this.syncCooldown) return;

    this.isSyncing = true;
    this.lastSyncTime = now;

    try {
      const response = await notificationApi.getAll();

      if (response?.data && Array.isArray(response.data)) {
        this.notifications = response.data.map(this.mapBackendNotification);
        this.unreadCount = response.unreadCount ?? this.notifications.filter(n => !n.read).length;
        this.saveCache();
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
    } catch (error) {
      console.error('[NotificationStore] Failed to sync from backend:', error);
      // Fall back to cached data — no action needed
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get notifications for the current workspace (or personal space).
   */
  public getAllNotifications(): StoredNotification[] {
    if (!this.isLoggedIn()) return [];
    return this.notifications.filter((notification) =>
      notificationBelongsToCurrentScope(notification),
    );
  }

  /**
   * Unread count for the current workspace (or personal space).
   */
  public getUnreadCount(): number {
    if (!this.isLoggedIn()) return 0;
    return this.getAllNotifications().filter((notification) => !notification.read).length;
  }

  /**
   * Mark a notification as read (backend + cache)
   */
  public async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId || n._id === notificationId);
    if (!notification || notification.read) return;

    // Optimistic update
    notification.read = true;
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    this.saveCache();
    window.dispatchEvent(new CustomEvent('notifications-updated'));

    // Persist to backend using the MongoDB _id
    const backendId = notification._id || notification.id;
    if (backendId && !backendId.startsWith('temp-')) {
      try {
        await notificationApi.markAsRead(backendId);
      } catch (error) {
        console.error('[NotificationStore] Failed to mark as read on backend:', error);
      }
    }
  }

  /**
   * Mark all notifications as read (backend + cache)
   */
  public async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
    this.saveCache();
    window.dispatchEvent(new CustomEvent('notifications-updated'));

    try {
      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('[NotificationStore] Failed to mark all as read on backend:', error);
    }
  }

  /**
   * Delete a notification (backend + cache)
   */
  public async deleteNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId || n._id === notificationId);
    if (!notification) return;

    const wasUnread = !notification.read;
    this.notifications = this.notifications.filter(n => n.id !== notificationId && n._id !== notificationId);
    if (wasUnread) this.unreadCount = Math.max(0, this.unreadCount - 1);
    this.saveCache();
    window.dispatchEvent(new CustomEvent('notifications-updated'));

    const backendId = notification._id || notification.id;
    if (backendId && !backendId.startsWith('temp-')) {
      try {
        await notificationApi.delete(backendId);
      } catch (error) {
        console.error('[NotificationStore] Failed to delete on backend:', error);
      }
    }
  }

  /**
   * Clear all notifications (backend + cache)
   */
  public async clearAll(): Promise<void> {
    this.notifications = [];
    this.unreadCount = 0;
    this.saveCache();
    window.dispatchEvent(new CustomEvent('notifications-updated'));

    if (this.isLoggedIn()) {
      try {
        await notificationApi.clearAll();
      } catch (error) {
        console.error('[NotificationStore] Failed to clear all on backend:', error);
      }
    }
  }

  /**
   * Clear local cache on user change / logout
   */
  public clearForUser(_userId?: string): void {
    this.notifications = [];
    this.unreadCount = 0;
    this.saveCache();
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }

  // ── Private helpers ──

  private mapBackendNotification = (n: any): StoredNotification => {
    const incomingData = n.data && typeof n.data === 'object' ? { ...n.data } : {};
    const workspaceId =
      asWorkspaceId(n.workspaceId) || asWorkspaceId(incomingData.workspaceId);
    if (workspaceId && !incomingData.workspaceId) {
      incomingData.workspaceId = workspaceId;
    }
    return {
      id: n._id || n.id,
      _id: n._id,
      type: n.type || 'general',
      title: n.title,
      body: n.body,
      icon: n.icon,
      timestamp: new Date(n.createdAt || n.timestamp || Date.now()).getTime(),
      read: !!n.read,
      data: incomingData,
      userId: n.userId,
      workspaceId,
    };
  };

  private saveCache(): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        notifications: this.notifications,
        unreadCount: this.unreadCount,
      }));
    } catch (error) {
      console.error('[NotificationStore] Cache save error:', error);
    }
  }

  private loadCache(): void {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.notifications = parsed.notifications || [];
        this.unreadCount = parsed.unreadCount ?? this.notifications.filter((n: StoredNotification) => !n.read).length;
      }
    } catch (error) {
      console.error('[NotificationStore] Cache load error:', error);
      this.notifications = [];
      this.unreadCount = 0;
    }
  }
}

export const notificationStore = NotificationStore.getInstance();
