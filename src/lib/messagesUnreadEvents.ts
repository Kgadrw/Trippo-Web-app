/** Cross-component events so the Messages nav badge updates without waiting for poll. */

export const MESSAGES_UNREAD_BUMP_EVENT = "messages-unread-bump";
export const MESSAGES_UNREAD_REFRESH_EVENT = "messages-unread-refresh";

export function bumpMessagesUnread(delta = 1) {
  if (typeof window === "undefined" || !delta) return;
  window.dispatchEvent(
    new CustomEvent(MESSAGES_UNREAD_BUMP_EVENT, { detail: { delta } }),
  );
}

export function refreshMessagesUnreadBadge() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MESSAGES_UNREAD_REFRESH_EVENT));
}
