// Notification Store - Syncs notifications with backend database
// Uses localStorage as a cache; the backend is the source of truth.

import { notificationApi } from './api';

export interface StoredNotification {
  id: string;
  _id?: string; // MongoDB id from backend
  type: 'new_user' | 'low_stock' | 'schedule' | 'new_sale' | 'new_product' | 'general';
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  read: boolean;
  data?: any;
  userId?: string;
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

    // Optimistic local update
    const tempNotification: StoredNotification = {
      ...notification,
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
        data: notification.data,
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
  public async syncFromBackend(): Promise<void> {
    if (!this.isLoggedIn() || this.isSyncing) return;

    const now = Date.now();
    if (now - this.lastSyncTime < this.syncCooldown) return;

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
   * Get all notifications from local cache
   */
  public getAllNotifications(): StoredNotification[] {
    if (!this.isLoggedIn()) return [];
    return this.notifications;
  }

  /**
   * Get unread count from local cache
   */
  public getUnreadCount(): number {
    if (!this.isLoggedIn()) return 0;
    return this.unreadCount;
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

  private mapBackendNotification = (n: any): StoredNotification => ({
    id: n._id || n.id,
    _id: n._id,
    type: n.type || 'general',
    title: n.title,
    body: n.body,
    icon: n.icon,
    timestamp: new Date(n.createdAt || n.timestamp || Date.now()).getTime(),
    read: !!n.read,
    data: n.data,
    userId: n.userId,
  });

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
