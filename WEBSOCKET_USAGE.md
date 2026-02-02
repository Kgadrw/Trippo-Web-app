# WebSocket Implementation Guide

## Overview
This application now uses native WebSockets (ws) for real-time updates, providing instant synchronization across all connected clients.

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install ws
```

### 2. WebSocket Server
The WebSocket server is initialized in `backend/src/index.js` and available at `/ws`.

### 3. Emitting Events from Controllers
Example from `productController.js`:

```javascript
import { emitToUser } from '../utils/websocket.js';

// After creating a product
emitToUser(userId, 'product:created', product.toObject());

// After updating a product
emitToUser(userId, 'product:updated', product.toObject());

// After deleting a product
emitToUser(userId, 'product:deleted', { _id: product._id });
```

## Frontend Usage

### 1. WebSocket Provider
The `WebSocketProvider` is already added to `App.tsx` and initializes the connection globally.

### 2. Subscribing to Events in Components

```typescript
import { useEffect } from 'react';
import { websocketManager } from '@/lib/websocketManager';

function MyComponent() {
  useEffect(() => {
    // Subscribe to product updates
    const unsubscribe = websocketManager.subscribe('product:updated', (product) => {
      console.log('Product updated:', product);
      // Update your component state here
      // e.g., setProducts(prev => prev.map(p => p._id === product._id ? product : p));
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return <div>...</div>;
}
```

### 3. Available WebSocket Events

- `product:created` - New product created
- `product:updated` - Product updated
- `product:deleted` - Product deleted
- `sale:created` - New sale recorded
- `sale:updated` - Sale updated
- `sale:deleted` - Sale deleted

### 4. Integration with useApi Hook

You can enhance the `useApi` hook to automatically listen to WebSocket events:

```typescript
// In your component
const { items: products, refresh } = useApi<Product>({
  endpoint: 'products',
  defaultValue: [],
});

useEffect(() => {
  const unsubscribe = websocketManager.subscribe('product:updated', (updatedProduct) => {
    // Refresh products list or update specific item
    refresh();
  });

  return unsubscribe;
}, [refresh]);
```

## Benefits

1. **Instant Updates**: Changes appear immediately without polling
2. **Reduced Server Load**: No need for frequent API polling
3. **Better UX**: Real-time synchronization across devices
4. **Efficient**: Only sends updates when data actually changes

## Connection Management

### Data Format
**Yes, all data is sent as JSON!** 
- Backend: Uses `JSON.stringify()` to send messages
- Frontend: Uses `JSON.parse()` to receive messages
- All messages follow this format:
  ```json
  {
    "type": "event-name",
    "data": { /* actual data */ },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### Offline/Online Handling

1. **When User Goes Offline:**
   - WebSocket connection is immediately closed
   - All pending reconnection attempts are cancelled
   - Connection will NOT attempt to reconnect while offline

2. **When User Comes Back Online:**
   - Automatically detects online status via `navigator.onLine` and `online` event
   - Resets reconnection attempts counter
   - Immediately attempts to reconnect
   - Re-establishes connection with authentication

3. **Reconnection Strategy:**
   - Automatic reconnection with exponential backoff (3s, 6s, 12s, 24s...)
   - Maximum 10 reconnection attempts
   - Only reconnects when user is online
   - Ping/pong keepalive every 25 seconds (client) and 30 seconds (server)
   - User-specific rooms for data isolation
   - Graceful handling of connection failures

### Connection Lifecycle

```
User Logs In → WebSocket Connects → Authenticates → Receives Updates
     ↓
User Goes Offline → Connection Closes → Reconnection Cancelled
     ↓
User Comes Back Online → Connection Re-establishes → Continues Receiving Updates
```
