import { notificationService } from "@/lib/notifications";
import { initAudio, playChatMessageBeep } from "@/lib/sound";
import type { WorkspaceChatMessage } from "@/lib/workspaceChatRealtime";

const notifiedMessageIds = new Set<string>();
const MAX_BODY_LENGTH = 140;

type ChatNotificationClickHandler = () => void;
let onChatNotificationClick: ChatNotificationClickHandler | null = null;

export function setWorkspaceChatNotificationClickHandler(
  handler: ChatNotificationClickHandler | null,
) {
  onChatNotificationClick = handler;
}

function truncateBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length <= MAX_BODY_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_BODY_LENGTH - 1)}…`;
}

function resolveIconUrl(profilePictureUrl?: string | null) {
  if (!profilePictureUrl) return "/chat.png";
  if (profilePictureUrl.startsWith("http") || profilePictureUrl.startsWith("/")) {
    return profilePictureUrl;
  }
  return "/chat.png";
}

export type WorkspaceChatNotificationInput = {
  message: WorkspaceChatMessage;
  workspaceName?: string;
  workspaceId: string;
};

/**
 * Play message sound and show a browser notification (no backend notification store).
 * Safe to call when the tab is open but the user is not viewing chat.
 */
export async function notifyNewWorkspaceChatMessage(
  input: WorkspaceChatNotificationInput,
): Promise<void> {
  const messageId = String(input.message._id);
  if (notifiedMessageIds.has(messageId)) return;
  notifiedMessageIds.add(messageId);
  if (notifiedMessageIds.size > 200) {
    const oldest = notifiedMessageIds.values().next().value;
    if (oldest) notifiedMessageIds.delete(oldest);
  }

  initAudio();
  playChatMessageBeep();

  const sender = input.message.senderName?.trim() || "Someone";
  const workspaceLabel = input.workspaceName?.trim();
  const title = workspaceLabel ? `${sender} · ${workspaceLabel}` : sender;
  const body = truncateBody(input.message.body || "");

  await notificationService.showEphemeralNotification({
    title,
    body,
    icon: resolveIconUrl(input.message.senderProfilePictureUrl),
    badge: "/chat.png",
    tag: `workspace-chat-${messageId}`,
    silent: false,
    requireInteraction: false,
    data: {
      action: "open_workspace_chat",
      workspaceId: input.workspaceId,
      messageId,
    },
    onClick: () => onChatNotificationClick?.(),
  });
}
