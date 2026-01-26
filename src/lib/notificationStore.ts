// Notification Store - Stores all notifications for display in notification center

export interface StoredNotification {
  id: string;
  type: 'new_user' | 'low_stock' | 'schedule' | 'new_sale' | 'new_product' | 'general';
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

class NotificationStore {
  private static instance: NotificationStore;
  private notifications: StoredNotification[] = [];
  private maxNotifications = 100; // Keep last 100 notifications
  private storageKey = 'profit-pilot-notifications';

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): NotificationStore {
    if (!NotificationStore.instance) {
      NotificationStore.instance = new NotificationStore();
    }
    return NotificationStore.instance;
  }

  /**
   * Add a notification to the store
   */
  public addNotification(notification: Omit<StoredNotification, 'id' | 'timestamp' | 'read'>): void {
    const storedNotification: StoredNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    this.notifications.unshift(storedNotification); // Add to beginning

    // Keep only last maxNotifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.saveToStorage();
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }

  /**
   * Get all notifications
   */
  public getAllNotifications(): StoredNotification[] {
    return this.notifications;
  }

  /**
   * Get unread notifications count
   */
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    }
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.saveToStorage();
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }

  /**
   * Delete a notification
   */
  public deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveToStorage();
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }

  /**
   * Clear all notifications
   */
  public clearAll(): void {
    this.notifications = [];
    this.saveToStorage();
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }

  /**
   * Save notifications to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  /**
   * Load notifications from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.notifications = JSON.parse(stored);
        // Clean up old notifications (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        this.notifications = this.notifications.filter(n => n.timestamp > thirtyDaysAgo);
        this.saveToStorage();
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
      this.notifications = [];
    }
  }
}

export const notificationStore = NotificationStore.getInstance();
