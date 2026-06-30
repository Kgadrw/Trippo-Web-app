import { pushApi } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function subscriptionMatches(
  existing: PushSubscription,
  endpoint: string,
  keys: { p256dh: string; auth: string },
) {
  const current = existing.toJSON();
  return (
    current.endpoint === endpoint &&
    current.keys?.p256dh === keys.p256dh &&
    current.keys?.auth === keys.auth
  );
}

/**
 * Register (or refresh) a Web Push subscription with the backend.
 * Required for chat notifications when the PWA/mobile app is closed or inactive.
 */
export async function registerWebPushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const keyResponse = await pushApi.getVapidPublicKey();
    const publicKey = keyResponse.publicKey;
    if (!publicKey) return false;

    let subscription = await registration.pushManager.getSubscription();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return false;
    }

    const payload = {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    };

    const syncedKey = "trippo-push-synced-endpoint";
    const lastSynced = localStorage.getItem(syncedKey);
    if (lastSynced === json.endpoint && subscriptionMatches(subscription, payload.endpoint, payload.keys)) {
      return true;
    }

    await pushApi.subscribe(payload);
    localStorage.setItem(syncedKey, json.endpoint);
    return true;
  } catch (error) {
    console.warn("[Push] Failed to register subscription:", error);
    return false;
  }
}

export async function unregisterWebPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await pushApi.unsubscribe(endpoint);
      localStorage.removeItem("trippo-push-synced-endpoint");
    }
  } catch (error) {
    console.warn("[Push] Failed to unregister subscription:", error);
  }
}
