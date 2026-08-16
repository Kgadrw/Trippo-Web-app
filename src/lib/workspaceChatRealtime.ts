export const WORKSPACE_CHAT_EVENT = "workspace-chat:message";
export const WORKSPACE_CHAT_READ_EVENT = "workspace-chat:read";
export const WORKSPACE_CHAT_EDIT_EVENT = "workspace-chat:edit";
export const WORKSPACE_CHAT_DELETE_EVENT = "workspace-chat:delete";
export const WORKSPACE_CHAT_TYPING_EVENT = "workspace-chat:typing";
export const WORKSPACE_CHAT_SETTINGS_EVENT = "workspace-chat:settings";
export const WORKSPACE_CHAT_REACTION_EVENT = "workspace-chat:reaction";
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

export type ChatPollOption = {
  text: string;
  voteCount: number;
  voterIds: string[];
};

export type ChatPoll = {
  question: string;
  options: ChatPollOption[];
};

export type ChatPollInput = {
  question: string;
  options: string[];
};

export function normalizeChatPoll(poll?: ChatPoll | null): ChatPoll | null {
  if (!poll?.question || !Array.isArray(poll.options)) return poll ?? null;
  return {
    question: String(poll.question),
    options: poll.options.map((option) => {
      const voterIds = (option.voterIds || []).map(String);
      return {
        text: String(option.text || ""),
        voterIds,
        voteCount: Number.isFinite(option.voteCount) ? Number(option.voteCount) : voterIds.length,
      };
    }),
  };
}

/** Instantly move `userId`'s vote onto `optionIndex` (WhatsApp-style live poll UI). */
export function applyOptimisticPollVote<T extends { poll?: ChatPoll | null }>(
  message: T,
  userId: string | null | undefined,
  optionIndex: number,
): T {
  if (!userId || !message.poll?.options?.length) return message;
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= message.poll.options.length) {
    return message;
  }
  const uid = String(userId);
  const options = message.poll.options.map((option, index) => {
    const withoutUser = (option.voterIds || []).map(String).filter((id) => id !== uid);
    const voterIds = index === optionIndex ? [...withoutUser, uid] : withoutUser;
    return {
      ...option,
      text: String(option.text || ""),
      voterIds,
      voteCount: voterIds.length,
    };
  });
  return {
    ...message,
    poll: {
      question: String(message.poll.question || ""),
      options,
    },
  };
}

export type ChatReaction = {
  emoji: string;
  userIds: string[];
};

export interface WorkspaceChatMessage {
  _id: string;
  workspaceId: string;
  senderUserId: string;
  senderName: string;
  senderProfilePictureUrl?: string | null;
  body: string;
  attachments?: WorkspaceChatAttachment[];
  poll?: ChatPoll | null;
  reactions?: ChatReaction[];
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

function isPendingChatMessageId(id: string) {
  return id.startsWith("pending-");
}

function pendingChatMatchesIncoming(
  pending: WorkspaceChatMessage,
  incoming: WorkspaceChatMessage,
): boolean {
  if (String(pending.senderUserId) !== String(incoming.senderUserId)) return false;
  const pendingBody = (pending.body || "").trim();
  const incomingBody = (incoming.body || "").trim();
  if (pendingBody || incomingBody) return pendingBody === incomingBody;
  const pendingAttachments = pending.attachments?.length || 0;
  const incomingAttachments = incoming.attachments?.length || 0;
  if (pendingAttachments > 0 && incomingAttachments > 0) return true;
  return Boolean(pending.poll && incoming.poll);
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
    poll: normalizeChatPoll(incoming.poll),
    reactions: (incoming.reactions || []).map((reaction) => ({
      emoji: String(reaction.emoji),
      userIds: (reaction.userIds || []).map(String),
    })),
  };
  const id = chatMessageId(normalized);
  const index = prev.findIndex((row) => chatMessageId(row) === id);
  if (index === -1) {
    // Replace optimistic bubble instead of appending (avoids WS echo duplicates).
    if (!isPendingChatMessageId(id)) {
      const pendingIndex = prev.findIndex(
        (row) =>
          isPendingChatMessageId(chatMessageId(row)) &&
          pendingChatMatchesIncoming(row, normalized),
      );
      if (pendingIndex !== -1) {
        const existing = prev[pendingIndex];
        const next = [...prev];
        next[pendingIndex] = {
          ...existing,
          ...normalized,
          replyTo: normalized.replyTo?.messageId
            ? normalized.replyTo
            : existing.replyTo?.messageId
              ? existing.replyTo
              : normalized.replyTo || null,
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
    replyTo: normalized.replyTo?.messageId
      ? normalized.replyTo
      : existing.replyTo?.messageId
        ? existing.replyTo
        : normalized.replyTo || null,
  };
  return next;
}
