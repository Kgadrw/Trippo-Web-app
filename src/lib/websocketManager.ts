// WebSocket Manager - Singleton for managing WebSocket connections
import { useWebSocket } from '@/hooks/useWebSocket';

class WebSocketManager {
  private static instance: WebSocketManager;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private ws: ReturnType<typeof useWebSocket> | null = null;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  initialize(ws: ReturnType<typeof useWebSocket>) {
    this.ws = ws;
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
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error(`[WebSocketManager] Error in callback for ${message.type}:`, error);
        }
      });
    }
  }

  // Emit event to server (if needed)
  emit(eventType: string, data: any) {
    if (this.ws && this.ws.isConnected) {
      this.ws.send({
        type: eventType,
        data: data,
      });
    }
  }

  isConnected(): boolean {
    return this.ws?.isConnected || false;
  }
}

export const websocketManager = WebSocketManager.getInstance();
