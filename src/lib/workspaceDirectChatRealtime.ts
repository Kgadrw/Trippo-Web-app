import { normalizeChatPoll } from "@/lib/workspaceChatRealtime";

export const WORKSPACE_DM_MESSAGE_EVENT = "workspace-dm:message";
export const WORKSPACE_DM_READ_EVENT = "workspace-dm:read";
export const WORKSPACE_DM_EDIT_EVENT = "workspace-dm:edit";
export const WORKSPACE_DM_DELETE_EVENT = "workspace-dm:delete";
export const WORKSPACE_DM_TYPING_EVENT = "workspace-dm:typing";
export const WORKSPACE_DM_SETTINGS_EVENT = "workspace-dm:settings";
export const WORKSPACE_DM_REACTION_EVENT = "workspace-dm:reaction";

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
  /** Voice-note length in seconds. */
  duration?: number;
  /** Normalized 0–1 peak heights for waveform UI. */
  waveform?: number[];
}

export interface DirectChatPollOption {
  text: string;
  voteCount: number;
  voterIds: string[];
}

export interface DirectChatPoll {
  question: string;
  options: DirectChatPollOption[];
}

export interface DirectChatReaction {
  emoji: string;
  userIds: string[];
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
  /** Client-generated id so optimistic rows reconcile with HTTP/WS echoes. */
  clientMessageId?: string;
  replyTo?: DirectChatReplyTo | null;
  attachments?: DirectChatAttachment[];
  poll?: DirectChatPoll | null;
  reactions?: DirectChatReaction[];
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  expiresAt?: string | null;
  systemType?: "disappearing" | string | null;
  systemPayload?: { durationSec?: number } | null;
  readBy?: DirectChatReceipt[];
}

export interface DirectChatPeer {
  userId: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
  /** ISO timestamp of last app presence. */
  lastSeenAt?: string | null;
  nickname?: string | null;
  displayName?: string | null;
}

export interface DirectChatThread {
  conversationId: string | null;
  workspaceId: string;
  workspaceName?: string;
  otherUser: DirectChatPeer;
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  lastSenderUserId: string | null;
  unreadCount: number;
  disappearingDurationSec?: number;
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

function isPendingMessageId(id: string) {
  return id.startsWith("pending-");
}

function pendingMatchesIncoming(
  pending: DirectChatMessage,
  incoming: DirectChatMessage,
): boolean {
  if (
    pending.clientMessageId &&
    incoming.clientMessageId &&
    String(pending.clientMessageId) === String(incoming.clientMessageId)
  ) {
    return true;
  }
  if (String(pending.senderUserId) !== String(incoming.senderUserId)) return false;
  const pendingBody = (pending.body || "").trim();
  const incomingBody = (incoming.body || "").trim();
  if (pendingBody || incomingBody) return pendingBody === incomingBody;
  const pendingAttachments = pending.attachments?.length || 0;
  const incomingAttachments = incoming.attachments?.length || 0;
  if (pendingAttachments > 0 && incomingAttachments > 0) return true;
  return Boolean(pending.poll && incoming.poll);
}

export function sortDirectMessagesByTime(messages: DirectChatMessage[]) {
  return [...messages].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime() || 0;
    const tb = new Date(b.createdAt).getTime() || 0;
    if (ta !== tb) return ta - tb;
    return directMessageId(a).localeCompare(directMessageId(b));
  });
}

/** Merge a server snapshot into live state without dropping optimistic / websocket rows. */
export function reconcileDirectMessagesAfterFetch(
  prev: DirectChatMessage[],
  loaded: DirectChatMessage[],
): DirectChatMessage[] {
  let next = prev;
  for (const message of loaded) {
    next = mergeDirectMessages(next, message);
  }
  return sortDirectMessagesByTime(next);
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
    clientMessageId: incoming.clientMessageId ? String(incoming.clientMessageId) : undefined,
    replyTo: incomingReply,
    poll: normalizeChatPoll(incoming.poll),
    reactions: (incoming.reactions || []).map((reaction) => ({
      emoji: String(reaction.emoji),
      userIds: (reaction.userIds || []).map(String),
    })),
  };
  const id = directMessageId(normalized);
  const index = prev.findIndex((row) => directMessageId(row) === id);
  if (index === -1) {
    // Replace optimistic bubble instead of appending (avoids WS echo duplicates).
    if (!isPendingMessageId(id)) {
      const pendingIndex = prev.findIndex(
        (row) =>
          isPendingMessageId(directMessageId(row)) && pendingMatchesIncoming(row, normalized),
      );
      if (pendingIndex !== -1) {
        const existing = prev[pendingIndex];
        const next = [...prev];
        next[pendingIndex] = {
          ...existing,
          ...normalized,
          clientMessageId: normalized.clientMessageId || existing.clientMessageId,
          replyTo: normalized.replyTo?.messageId
            ? normalized.replyTo
            : existing.replyTo?.messageId
              ? existing.replyTo
              : normalized.replyTo || null,
          // Keep local blob URL until upload UI swaps if needed
          attachments:
            normalized.attachments?.length
              ? normalized.attachments
              : existing.attachments || [],
        };
        return next;
      }
    }
    return [...prev, normalized];
  }
  const existing = prev[index];
  const next = [...prev];
  next[index] = {
    ...existing,
    ...normalized,
    clientMessageId: normalized.clientMessageId || existing.clientMessageId,
    // Never drop an existing quote if the incoming payload omitted it.
    replyTo: normalized.replyTo?.messageId
      ? normalized.replyTo
      : existing.replyTo?.messageId
        ? existing.replyTo
        : normalized.replyTo || null,
  };
  return next;
}
