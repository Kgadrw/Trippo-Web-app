// Service Worker Registration

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // In development, don't register service worker or unregister existing ones
  if (isDevelopment) {
    console.log("Development mode: Unregistering service worker for live updates");
    return navigator.serviceWorker.getRegistrations().then((registrations) => {
      return Promise.all(
        registrations.map((registration) => {
          console.log("Unregistering service worker:", registration.scope);
          return registration.unregister();
        })
      );
    }).then(() => {
      // Clear all caches in development
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log("Deleting cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      });
    }).then(() => {
      console.log("All service workers and caches cleared for development");
      return null;
    }).catch((error) => {
      console.error("Error clearing service workers:", error);
      return null;
    });
  }

  // In production, register service worker normally
  if ("serviceWorker" in navigator) {
    // First, unregister any existing service workers to force update
    return navigator.serviceWorker.getRegistrations().then((registrations) => {
      return Promise.all(
        registrations.map((registration) => registration.unregister())
      );
    }).then(() => {
      // Clear old caches
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      });
    }).then(() => {
      // Register new service worker with cache busting
      const swUrl = `/sw.js?t=${Date.now()}`;
      return navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log("Service Worker registered successfully:", registration.scope);

          // Check for updates but don't reload automatically on update found
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    console.log("New service worker available. Waiting for user to reload...");
                    // Don't automatically reload - let user choose when to reload
                    // Only reload if this is a critical update (you can add conditions here)
                    // For now, we'll just log it
                  } else {
                    console.log("Service Worker installed for the first time");
                  }
                }
              });
            }
          });

          // Remove automatic reload on controller change
          // Only reload if user explicitly wants to update
          const handleControllerChange = () => {
            console.log("Service Worker controller changed");
            // Don't automatically reload - this can cause infinite loops
            // User can manually refresh if needed
          };

          // Use a more controlled approach - only listen once, not continuously
          navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange, { once: true });

          return registration;
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
          return null;
        });
    });
  }
  return Promise.resolve(null);
}

export function unregisterServiceWorker(): Promise<boolean> {
  if ("serviceWorker" in navigator) {
    return navigator.serviceWorker.getRegistrations().then((registrations) => {
      return Promise.all(
        registrations.map((registration) => registration.unregister())
      ).then((results) => {
        const success = results.some((result) => result === true);
        if (success) {
          console.log("All Service Workers unregistered");
        }
        return success;
      });
    });
  }
  return Promise.resolve(false);
}

// Clear all caches and service workers (useful for development)
export async function clearAllCaches(): Promise<void> {
  console.log("Clearing all caches and service workers...");
  
  // Unregister all service workers
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
    console.log(`Unregistered ${registrations.length} service worker(s)`);
  }
  
  // Clear all caches
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => {
    console.log("Deleting cache:", cacheName);
    return caches.delete(cacheName);
  }));
  console.log(`Cleared ${cacheNames.length} cache(s)`);
  
  console.log("All caches and service workers cleared!");
}

// Make it available globally for easy access
if (typeof window !== "undefined") {
  (window as any).clearAllCaches = clearAllCaches;
}
