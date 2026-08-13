export const WORKSPACE_CHAT_EVENT = "workspace-chat:message";
export const WORKSPACE_CHAT_READ_EVENT = "workspace-chat:read";
export const WORKSPACE_CHAT_EDIT_EVENT = "workspace-chat:edit";
export const WORKSPACE_CHAT_DELETE_EVENT = "workspace-chat:delete";
export const WORKSPACE_CHAT_TYPING_EVENT = "workspace-chat:typing";
export const WORKSPACE_CHAT_SETTINGS_EVENT = "workspace-chat:settings";
export const WORKSPACE_PRESENCE_UPDATE_EVENT = "workspace:presence:update";
export const WORKSPACE_PRESENCE_JOIN_EVENT = "workspace:presence:join";
export const WORKSPACE_PRESENCE_HEARTBEAT_EVENT = "workspace:presence:heartbeat";
export const WORKSPACE_PRESENCE_LEAVE_EVENT = "workspace:presence:leave";

export interface WorkspaceChatTypingPayload {
  workspaceId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface WorkspaceActiveUser {
  userId: string;
  userName?: string;
  name?: string;
  profilePictureUrl?: string | null;
  /** Epoch ms when last seen in presence (while online). */
  lastSeen?: number;
}

export interface WorkspaceChatReceipt {
  userId: string;
  userName: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface WorkspaceChatMention {
  userId: string;
  userName: string;
}

export interface WorkspaceChatReplyTo {
  messageId: string;
  senderUserId?: string | null;
  senderName?: string;
  body?: string;
  deletedAt?: string | null;
}

export type WorkspaceChatAttachment = {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number;
  duration?: number;
  waveform?: number[];
};

export interface WorkspaceChatMessage {
  _id: string;
  workspaceId: string;
  senderUserId: string;
  senderName: string;
  senderProfilePictureUrl?: string | null;
  body: string;
  attachments?: WorkspaceChatAttachment[];
  replyTo?: WorkspaceChatReplyTo | null;
  mentionAll?: boolean;
  mentions?: WorkspaceChatMention[];
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  expiresAt?: string | null;
  deliveredTo?: WorkspaceChatReceipt[];
  readBy?: WorkspaceChatReceipt[];
}

export function chatMessageId(message: WorkspaceChatMessage) {
  return String(message._id);
}

export function mergeChatMessages(
  prev: WorkspaceChatMessage[],
  incoming: WorkspaceChatMessage,
): WorkspaceChatMessage[] {
  const incomingReply = incoming.replyTo?.messageId
    ? {
        messageId: String(incoming.replyTo.messageId),
        senderUserId: incoming.replyTo.senderUserId
          ? String(incoming.replyTo.senderUserId)
          : null,
        senderName: incoming.replyTo.senderName || "User",
        body: incoming.replyTo.body || "",
        deletedAt: incoming.replyTo.deletedAt || null,
      }
    : null;

  const normalized: WorkspaceChatMessage = {
    ...incoming,
    _id: String(incoming._id),
    workspaceId: String(incoming.workspaceId),
    senderUserId: String(incoming.senderUserId),
    replyTo: incomingReply,
  };
  const id = chatMessageId(normalized);
  const index = prev.findIndex((row) => chatMessageId(row) === id);
  if (index === -1) {
    return [...prev, normalized];
  }
  const existing = prev[index];
  const next = [...prev];
  next[index] = {
    ...existing,
    ...normalized,
    replyTo: normalized.replyTo?.messageId
      ? normalized.replyTo
      : existing.replyTo?.messageId
        ? existing.replyTo
        : normalized.replyTo || null,
  };
  return next;
}
