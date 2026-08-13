import { notificationService } from "@/lib/notifications";
import { initAudio, playChatMessageBeep } from "@/lib/sound";
import { pushChatIncomingPopup } from "@/lib/chatIncomingPopupStore";
import { WORKSPACE_GROUP_CHAT_PATH } from "@/lib/workspaceGroupChat";

const notifiedMessageIds = new Set<string>();
const MAX_BODY_LENGTH = 140;

type ChatNotificationClickHandler = (href: string) => void;
let onChatNotificationClick: ChatNotificationClickHandler | null = null;

export function setWorkspaceChatNotificationClickHandler(
  handler: ChatNotificationClickHandler | null,
) {
  onChatNotificationClick = handler;
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
 * Incoming chat alert:
 * - Bottom-right in-app popup while the site tab is visible
 * - Browser/OS notification when the tab is hidden (away from the page)
 * - Server web-push still covers fully closed / background app cases
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
  const body = `${replyPrefix}${truncateBody(input.body)}`;
  const icon = resolveIconUrl(input.iconUrl);
  const tabHidden = typeof document !== "undefined" && document.hidden;

  // In-app bottom-right popup while using the website.
  if (!tabHidden) {
    pushChatIncomingPopup({
      id: messageId,
      title,
      body,
      iconUrl: icon,
      href: input.href || WORKSPACE_GROUP_CHAT_PATH,
    });
    return;
  }

  // Tab is in the background — use browser/OS notification.
  // When the site is fully closed, server web-push still delivers.
  await notificationService.showEphemeralNotification({
    title,
    body,
    icon,
    badge: "/chat.png",
    tag:
      input.action === "open_direct_chat"
        ? `workspace-dm-${messageId}`
        : `workspace-chat-${messageId}`,
    silent: true,
    requireInteraction: false,
    data: {
      action: input.action,
      workspaceId: input.workspaceId,
      messageId,
      otherUserId: input.otherUserId,
      conversationId: input.conversationId,
      href: input.href,
    },
    onClick: () => onChatNotificationClick?.(input.href),
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
