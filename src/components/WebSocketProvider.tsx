// WebSocket Provider - Initializes WebSocket connection globally
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { websocketManager } from '@/lib/websocketManager';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const ws = useWebSocket({
    onMessage: (message) => {
      // Route messages to WebSocket manager
      websocketManager.handleMessage(message);
    },
    onOpen: () => {
      console.log('[WebSocketProvider] WebSocket connected');
    },
    onClose: () => {
      console.log('[WebSocketProvider] WebSocket disconnected');
    },
    onError: (error) => {
      console.error('[WebSocketProvider] WebSocket error:', error);
    },
  });

  useEffect(() => {
    // Initialize WebSocket manager with the connection
    websocketManager.initialize(ws);
  }, [ws]);

  return <>{children}</>;
}
