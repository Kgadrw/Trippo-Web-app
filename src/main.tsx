// Parse auth token from URL hash BEFORE React mounts
// Ensures ProtectedRoute sees auth data on first render (avoids race condition)
(function() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#auth=')) {
    try {
      const data = JSON.parse(atob(hash.substring(6)));
      if (data.userId) localStorage.setItem('profit-pilot-user-id', data.userId);
      if (data.authenticated) localStorage.setItem('profit-pilot-authenticated', 'true');
      if (data.isAdmin) localStorage.setItem('profit-pilot-is-admin', String(data.isAdmin));
      if (data.name) localStorage.setItem('profit-pilot-user-name', data.name);
      if (data.email) localStorage.setItem('profit-pilot-user-email', data.email);
      if (data.businessName) localStorage.setItem('profit-pilot-business-name', data.businessName);
      history.replaceState(null, '', window.location.pathname);
    } catch(e) {}
  }
})();

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/globals.css";
import { registerServiceWorker } from "./lib/serviceWorker";
import { initDB } from "./lib/indexedDB";
import { logger } from "./lib/logger";

// Disable all console methods in production for privacy and security
if (import.meta.env.PROD) {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};
  console.table = () => {};
  console.group = () => {};
  console.groupEnd = () => {};
  console.groupCollapsed = () => {};
  console.time = () => {};
  console.timeEnd = () => {};
  console.count = () => {};
  console.clear = () => {};
}

// Initialize IndexedDB and register service worker
// Don't block rendering - initialize in parallel
Promise.all([
  initDB().catch((error) => {
    logger.error("Failed to initialize IndexedDB:", error);
  }),
  registerServiceWorker().catch((error) => {
    logger.error("Failed to register service worker:", error);
  }),
]).then(() => {
  // Render immediately - don't block on cache clearing
  // Use requestAnimationFrame to ensure smooth render
  requestAnimationFrame(() => {
  createRoot(document.getElementById("root")!).render(<App />);
  });
  
  // ✅ Do not wipe IndexedDB on every app open — that caused empty dashboards when the API
  // was briefly unavailable. Use forceRefreshFromBackend() when a full cache reset is needed.
  // (Previously called clearAllCachesAndData() here on every startup.)
});

// Unregister any service workers cached from www.trippo.rw
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}
