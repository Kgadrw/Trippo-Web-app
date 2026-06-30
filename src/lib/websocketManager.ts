// WebSocket Manager - Singleton for managing WebSocket connections
import { useWebSocket } from '@/hooks/useWebSocket';

class WebSocketManager {
  private static instance: WebSocketManager;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private ws: ReturnType<typeof useWebSocket> | null = null;
  private pendingEmits: Array<{ eventType: string; data: Record<string, unknown> }> = [];

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  initialize(ws: ReturnType<typeof useWebSocket>) {
    this.ws = ws;
    if (ws.isConnected) {
      this.flushPendingEmits();
    }
  }

  flushPendingEmits() {
    if (!this.ws?.isConnected || !this.pendingEmits.length) return;
    const queue = [...this.pendingEmits];
    this.pendingEmits = [];
    for (const item of queue) {
      this.ws.send({
        type: item.eventType,
        ...item.data,
      });
    }
  }

  // Subscribe to a specific event type
  subscribe(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  // Handle incoming WebSocket messages
  handleMessage(message: { type: string; data?: any }) {
    const callbacks = this.listeners.get(message.type);
    if (callbacks && callbacks.size > 0) {
      callbacks.forEach((callback) => {
        try {
          callback(message.data);
        } catch (error) {
          console.error(`[WebSocketManager] Error in callback for ${message.type}:`, error);
        }
      });
    }
  }

  // Emit event to server (if needed)
  emit(eventType: string, data: Record<string, unknown> = {}) {
    if (this.ws?.isConnected) {
      this.ws.send({
        type: eventType,
        ...data,
      });
      return true;
    }

    this.pendingEmits.push({ eventType, data });
    return false;
  }

  isConnected(): boolean {
    return this.ws?.isConnected || false;
  }
}

export const websocketManager = WebSocketManager.getInstance();
