import { notificationService } from "@/lib/notifications";
import { initAudio, playChatMessageBeep } from "@/lib/sound";
import { pushChatIncomingPopup } from "@/lib/chatIncomingPopupStore";
import { WORKSPACE_GROUP_CHAT_PATH } from "@/lib/workspaceGroupChat";

const notifiedMessageIds = new Set<string>();
const unreadByTag = new Map<string, number>();
const MAX_BODY_LENGTH = 140;

type ChatNotificationClickHandler = (href: string) => void;
let onChatNotificationClick: ChatNotificationClickHandler | null = null;

export function setWorkspaceChatNotificationClickHandler(
  handler: ChatNotificationClickHandler | null,
) {
  onChatNotificationClick = handler;
}

/** Stable OS notification tag per group workspace (replaces previous unread alert). */
export function chatNotificationTagForGroup(workspaceId: string) {
  return `workspace-chat-${String(workspaceId || "group")}`;
}

/** Stable OS notification tag per DM conversation. */
export function chatNotificationTagForDm(conversationId?: string, otherUserId?: string) {
  if (conversationId) return `workspace-dm-${conversationId}`;
  if (otherUserId) return `workspace-dm-user-${otherUserId}`;
  return "workspace-dm";
}

export function resolveChatNotificationTag(input: {
  action: "open_workspace_chat" | "open_direct_chat";
  workspaceId?: string;
  conversationId?: string;
  otherUserId?: string;
}) {
  if (input.action === "open_direct_chat") {
    return chatNotificationTagForDm(input.conversationId, input.otherUserId);
  }
  return chatNotificationTagForGroup(input.workspaceId || "");
}

/** Clear sticky OS chat notification once the thread is opened / marked read. */
export function clearChatOsNotification(tag: string) {
  if (!tag) return;
  unreadByTag.delete(tag);
  notificationService.clearNotifications(tag);
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "CLEAR_NOTIFICATION_TAG",
        tag,
      });
    });
  }
}

export function clearGroupChatOsNotification(workspaceId: string) {
  clearChatOsNotification(chatNotificationTagForGroup(workspaceId));
}

export function clearDirectChatOsNotification(conversationId?: string, otherUserId?: string) {
  clearChatOsNotification(chatNotificationTagForDm(conversationId, otherUserId));
}

function truncateBody(body: string, maxLength = MAX_BODY_LENGTH) {
  const trimmed = String(body || "").trim();
  if (!trimmed) return "New message";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function resolveIconUrl(profilePictureUrl?: string | null) {
  if (!profilePictureUrl) return "/chat.png";
  if (profilePictureUrl.startsWith("http") || profilePictureUrl.startsWith("/")) {
    return profilePictureUrl;
  }
  return "/chat.png";
}

function rememberMessage(messageId: string) {
  if (notifiedMessageIds.has(messageId)) return false;
  notifiedMessageIds.add(messageId);
  if (notifiedMessageIds.size > 200) {
    const oldest = notifiedMessageIds.values().next().value;
    if (oldest) notifiedMessageIds.delete(oldest);
  }
  return true;
}

export type IncomingChatAlertInput = {
  messageId: string;
  senderName: string;
  body: string;
  iconUrl?: string | null;
  workspaceId: string;
  workspaceName?: string;
  /** Where to navigate when the popup / notification is opened. */
  href: string;
  /** Browser notification action payload. */
  action: "open_workspace_chat" | "open_direct_chat";
  otherUserId?: string;
  conversationId?: string;
  replyTo?: {
    senderName?: string;
    body?: string;
  } | null;
  playSound?: boolean;
  /** When true, skip in-app + OS alerts (caller already decided not to alert). */
  suppress?: boolean;
};

/**
 * Incoming chat alert (WhatsApp-style):
 * - Visible tab (any page, including when Messages tab is closed): in-app popup
 * - Background / locked phone: sticky OS notification that stays until the chat is read
 * - App fully closed: server web-push (same conversation tag)
 */
export async function notifyIncomingChatAlert(input: IncomingChatAlertInput): Promise<void> {
  if (input.suppress) return;

  const messageId = String(input.messageId);
  if (!rememberMessage(messageId)) return;

  if (input.playSound !== false) {
    initAudio();
    playChatMessageBeep();
  }

  const sender = input.senderName?.trim() || "Someone";
  const workspaceLabel = input.workspaceName?.trim();
  const title =
    input.action === "open_workspace_chat" && workspaceLabel
      ? `${sender} · ${workspaceLabel}`
      : sender;

  const replyPrefix = input.replyTo
    ? `↩ ${input.replyTo.senderName || "Message"}: ${truncateBody(input.replyTo.body || "", 60)}\n`
    : "";
  const preview = `${replyPrefix}${truncateBody(input.body)}`;
  const icon = resolveIconUrl(input.iconUrl);
  const tag = resolveChatNotificationTag(input);
  const unreadCount = (unreadByTag.get(tag) || 0) + 1;
  unreadByTag.set(tag, unreadCount);
  const body =
    unreadCount > 1 ? `${preview}\n(${unreadCount} unread)` : preview;
  // Desktop: a visible-but-unfocused window (behind another app) still needs OS push.
  const pageActive =
    typeof document !== "undefined" && !document.hidden && document.hasFocus();
  const href = input.href || WORKSPACE_GROUP_CHAT_PATH;
  const notificationData = {
    action: input.action,
    workspaceId: input.workspaceId,
    messageId,
    otherUserId: input.otherUserId,
    conversationId: input.conversationId,
    href,
    tag,
  };

  // Foreground & focused: in-app banner only.
  if (pageActive) {
    pushChatIncomingPopup({
      id: tag,
      title,
      body: preview,
      iconUrl: icon,
      href,
    });
    return;
  }

  // Background / unfocused desktop window / locked phone: sticky OS notification.
  await notificationService.showEphemeralNotification({
    title,
    body,
    icon,
    badge: "/chat.png",
    tag,
    silent: false,
    requireInteraction: true,
    renotify: true,
    data: notificationData,
    onClick: () => {
      clearChatOsNotification(tag);
      onChatNotificationClick?.(href);
    },
  });
}

/** @deprecated Prefer notifyIncomingChatAlert */
export async function notifyNewWorkspaceChatMessage(input: {
  message: {
    _id: string;
    senderName?: string;
    body?: string;
    senderProfilePictureUrl?: string | null;
  };
  workspaceName?: string;
  workspaceId: string;
  playSound?: boolean;
}): Promise<void> {
  await notifyIncomingChatAlert({
    messageId: String(input.message._id),
    senderName: input.message.senderName || "Someone",
    body: input.message.body || "",
    iconUrl: input.message.senderProfilePictureUrl,
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    href: WORKSPACE_GROUP_CHAT_PATH,
    action: "open_workspace_chat",
    playSound: input.playSound,
  });
}
