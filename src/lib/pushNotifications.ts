import { pushApi } from "@/lib/api";

const SYNCED_ENDPOINT_KEY = "trippo-push-synced-endpoint";
const SYNCED_VAPID_KEY = "trippo-push-synced-vapid";

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

/** True when the site is running as an installed Home Screen / PWA app. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

/**
 * Register (or refresh) a Web Push subscription with the backend.
 * Required for chat notifications when the PWA/mobile app is closed or inactive.
 */
export async function registerWebPushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return false;
  }

  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId || userId === "admin") {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const keyResponse = (await pushApi.getVapidPublicKey()) as {
      publicKey?: string;
      data?: { publicKey?: string };
      error?: string;
    };
    const publicKey = keyResponse.publicKey || keyResponse.data?.publicKey;
    if (!publicKey) {
      console.warn("[Push] VAPID public key unavailable:", keyResponse.error || "missing key");
      return false;
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const lastVapid = localStorage.getItem(SYNCED_VAPID_KEY);
    let subscription = await registration.pushManager.getSubscription();

    // If VAPID keys rotated, drop the old browser subscription and recreate.
    if (subscription && lastVapid && lastVapid !== publicKey) {
      try {
        await subscription.unsubscribe();
      } catch {
        /* ignore */
      }
      subscription = null;
      localStorage.removeItem(SYNCED_ENDPOINT_KEY);
    }

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

    const lastSynced = localStorage.getItem(SYNCED_ENDPOINT_KEY);
    if (
      lastSynced === json.endpoint &&
      lastVapid === publicKey &&
      subscriptionMatches(subscription, payload.endpoint, payload.keys)
    ) {
      return true;
    }

    await pushApi.subscribe(payload);
    localStorage.setItem(SYNCED_ENDPOINT_KEY, json.endpoint);
    localStorage.setItem(SYNCED_VAPID_KEY, publicKey);
    return true;
  } catch (error) {
    console.warn("[Push] Failed to register subscription:", error);
    return false;
  }
}

export async function unregisterWebPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    localStorage.removeItem(SYNCED_ENDPOINT_KEY);
    localStorage.removeItem(SYNCED_VAPID_KEY);
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      try {
        await pushApi.unsubscribe(endpoint);
      } catch {
        /* still drop local subscription */
      }
      await subscription.unsubscribe();
    } else {
      try {
        await pushApi.unsubscribe();
      } catch {
        /* ignore */
      }
    }
  } catch (error) {
    console.warn("[Push] Failed to unregister subscription:", error);
  } finally {
    localStorage.removeItem(SYNCED_ENDPOINT_KEY);
    localStorage.removeItem(SYNCED_VAPID_KEY);
  }
}
