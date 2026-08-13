export const WORKSPACE_DM_MESSAGE_EVENT = "workspace-dm:message";
export const WORKSPACE_DM_READ_EVENT = "workspace-dm:read";
export const WORKSPACE_DM_EDIT_EVENT = "workspace-dm:edit";
export const WORKSPACE_DM_DELETE_EVENT = "workspace-dm:delete";
export const WORKSPACE_DM_TYPING_EVENT = "workspace-dm:typing";

export interface DirectChatTypingPayload {
  workspaceId: string;
  conversationId?: string | null;
  peerUserId?: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface DirectChatReceipt {
  userId: string;
  userName: string;
  readAt?: string;
}

export interface DirectChatAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

export interface DirectChatReplyTo {
  messageId: string;
  senderUserId?: string | null;
  senderName?: string;
  body?: string;
  deletedAt?: string | null;
}

export interface DirectChatMessage {
  _id: string;
  conversationId: string;
  workspaceId: string;
  senderUserId: string;
  senderName: string;
  senderProfilePictureUrl?: string | null;
  body: string;
  replyTo?: DirectChatReplyTo | null;
  attachments?: DirectChatAttachment[];
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  readBy?: DirectChatReceipt[];
}

export interface DirectChatPeer {
  userId: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
}

export interface DirectChatThread {
  conversationId: string | null;
  otherUser: DirectChatPeer;
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  lastSenderUserId: string | null;
  unreadCount: number;
}

export function isDirectMessageDeleted(message: DirectChatMessage) {
  return Boolean(message.deletedAt);
}

export function canModifyDirectMessage(message: DirectChatMessage, currentUserId: string | null) {
  if (!currentUserId || isDirectMessageDeleted(message)) return false;
  if (String(message._id).startsWith("pending-")) return false;
  return String(message.senderUserId) === currentUserId;
}

export function directMessageId(message: DirectChatMessage) {
  return String(message._id);
}

export function mergeDirectMessages(
  prev: DirectChatMessage[],
  incoming: DirectChatMessage,
): DirectChatMessage[] {
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

  const normalized: DirectChatMessage = {
    ...incoming,
    _id: String(incoming._id),
    conversationId: String(incoming.conversationId),
    workspaceId: String(incoming.workspaceId),
    senderUserId: String(incoming.senderUserId),
    replyTo: incomingReply,
  };
  const id = directMessageId(normalized);
  const index = prev.findIndex((row) => directMessageId(row) === id);
  if (index === -1) {
    return [...prev, normalized];
  }
  const existing = prev[index];
  const next = [...prev];
  next[index] = {
    ...existing,
    ...normalized,
    // Never drop an existing quote if the incoming payload omitted it.
    replyTo: normalized.replyTo?.messageId
      ? normalized.replyTo
      : existing.replyTo?.messageId
        ? existing.replyTo
        : normalized.replyTo || null,
  };
  return next;
}
