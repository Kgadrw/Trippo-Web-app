// WebSocket hook for real-time updates
import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Get API base URL and userId
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const userId = localStorage.getItem('profit-pilot-user-id');
    
    if (!userId) {
      console.warn('[WebSocket] No userId found, skipping connection');
      return;
    }

    // Convert HTTP URL to WebSocket URL
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws?userId=' + encodeURIComponent(userId);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Authenticate with userId
        ws.send(JSON.stringify({
          type: 'authenticate',
          userId: userId,
        }));

        // Set up ping interval (every 25 seconds)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);

        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle pong responses
          if (message.type === 'pong') {
            return; // Just keep connection alive
          }

          // Handle authentication confirmation
          if (message.type === 'authenticated') {
            console.log('[WebSocket] Authenticated:', message);
            return;
          }

          // Handle connection confirmation
          if (message.type === 'connected') {
            console.log('[WebSocket] Connection confirmed:', message);
            return;
          }

          // Call custom message handler
          onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        onClose?.();

        // Only attempt to reconnect if user is online
        if (navigator.onLine && reconnectAttempts < maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(2, reconnectAttempts); // Exponential backoff
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // Check if still online before reconnecting
            if (navigator.onLine) {
              setReconnectAttempts(prev => prev + 1);
              connect();
            } else {
              console.log('[WebSocket] Still offline, skipping reconnection');
            }
          }, delay);
        } else if (!navigator.onLine) {
          console.log('[WebSocket] User is offline, will reconnect when back online');
        } else {
          console.warn('[WebSocket] Max reconnect attempts reached');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      onError?.(error as Event);
    }
  }, [reconnectAttempts, maxReconnectAttempts, reconnectInterval, onMessage, onOpen, onClose, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('[WebSocket] Cannot send message: not connected');
    return false;
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem('profit-pilot-user-id');
    
    // Check if user is online before connecting
    const handleOnline = () => {
      if (userId && !wsRef.current && navigator.onLine) {
        console.log('[WebSocket] Network online, attempting to connect...');
        setReconnectAttempts(0); // Reset attempts when back online
        connect();
      }
    };

    const handleOffline = () => {
      console.log('[WebSocket] Network offline, closing connection...');
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      disconnect();
    };

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connect if online and user is logged in
    if (userId && navigator.onLine) {
      connect();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - connect/disconnect are stable callbacks

  return {
    isConnected,
    send,
    connect,
    disconnect,
  };
}
