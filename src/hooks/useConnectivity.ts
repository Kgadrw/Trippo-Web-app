import { useEffect, useSyncExternalStore } from "react";

type ConnectivityState = {
  online: boolean;
  wasOffline: boolean;
  restoredAt: number | null;
};

let state: ConnectivityState = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  wasOffline: false,
  restoredAt: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function goOffline() {
  if (!state.online) return;
  state = { online: false, wasOffline: true, restoredAt: null };
  emit();
}

function goOnline() {
  if (state.online && !state.wasOffline) return;
  state = { online: true, wasOffline: true, restoredAt: Date.now() };
  emit();
  window.dispatchEvent(new CustomEvent("connectivity-restored"));
}

function clearRestored() {
  if (!state.restoredAt) return;
  state = { ...state, restoredAt: null, wasOffline: false };
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);
}

export function markNetworkError() {
  goOffline();
}

export function markNetworkOk() {
  if (!state.online) goOnline();
}

export function dismissRestoredBanner() {
  clearRestored();
}

export function useConnectivity() {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );

  useEffect(() => {
    if (snap.restoredAt) {
      const timer = window.setTimeout(clearRestored, 4000);
      return () => clearTimeout(timer);
    }
  }, [snap.restoredAt]);

  return snap;
}

export function isCurrentlyOffline() {
  return !state.online;
}
