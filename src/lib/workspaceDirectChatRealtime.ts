export const WORKSPACE_DM_MESSAGE_EVENT = "workspace-dm:message";
export const WORKSPACE_DM_READ_EVENT = "workspace-dm:read";
export const WORKSPACE_DM_EDIT_EVENT = "workspace-dm:edit";
export const WORKSPACE_DM_DELETE_EVENT = "workspace-dm:delete";

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

export interface DirectChatMessage {
  _id: string;
  conversationId: string;
  workspaceId: string;
  senderUserId: string;
  senderName: string;
  senderProfilePictureUrl?: string | null;
  body: string;
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
  const id = directMessageId(incoming);
  const index = prev.findIndex((row) => directMessageId(row) === id);
  if (index === -1) {
    return [...prev, incoming];
  }
  const next = [...prev];
  next[index] = { ...next[index], ...incoming };
  return next;
}
