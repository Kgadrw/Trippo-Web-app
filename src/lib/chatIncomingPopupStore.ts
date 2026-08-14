export type ChatIncomingPopupItem = {
  id: string;
  title: string;
  body: string;
  iconUrl?: string | null;
  href: string;
  createdAt: number;
};

type Listener = (items: ChatIncomingPopupItem[]) => void;

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 10000;

let items: ChatIncomingPopupItem[] = [];
const listeners = new Set<Listener>();
const dismissTimers = new Map<string, number>();

function emit() {
  const snapshot = [...items];
  listeners.forEach((listener) => listener(snapshot));
}

function clearTimer(id: string) {
  const timer = dismissTimers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    dismissTimers.delete(id);
  }
}

export function subscribeChatIncomingPopups(listener: Listener) {
  listeners.add(listener);
  listener([...items]);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissChatIncomingPopup(id: string) {
  clearTimer(id);
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export function clearChatIncomingPopups() {
  for (const id of dismissTimers.keys()) clearTimer(id);
  items = [];
  emit();
}

export function pushChatIncomingPopup(
  input: Omit<ChatIncomingPopupItem, "createdAt"> & { createdAt?: number },
) {
  if (typeof window === "undefined") return;

  clearTimer(input.id);
  const entry: ChatIncomingPopupItem = {
    ...input,
    createdAt: input.createdAt ?? Date.now(),
  };

  items = [entry, ...items.filter((item) => item.id !== entry.id)].slice(0, MAX_VISIBLE);
  emit();

  const timer = window.setTimeout(() => {
    dismissChatIncomingPopup(entry.id);
  }, AUTO_DISMISS_MS);
  dismissTimers.set(entry.id, timer);
}
