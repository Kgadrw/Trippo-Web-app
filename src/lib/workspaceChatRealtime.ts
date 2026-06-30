export const WORKSPACE_CHAT_EVENT = "workspace-chat:message";
export const WORKSPACE_CHAT_READ_EVENT = "workspace-chat:read";
export const WORKSPACE_PRESENCE_UPDATE_EVENT = "workspace:presence:update";
export const WORKSPACE_PRESENCE_JOIN_EVENT = "workspace:presence:join";
export const WORKSPACE_PRESENCE_HEARTBEAT_EVENT = "workspace:presence:heartbeat";
export const WORKSPACE_PRESENCE_LEAVE_EVENT = "workspace:presence:leave";

export interface WorkspaceActiveUser {
  userId: string;
  userName: string;
  profilePictureUrl?: string | null;
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

export interface WorkspaceChatMessage {
  _id: string;
  workspaceId: string;
  senderUserId: string;
  senderName: string;
  senderProfilePictureUrl?: string | null;
  body: string;
  mentionAll?: boolean;
  mentions?: WorkspaceChatMention[];
  createdAt: string;
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
  const id = chatMessageId(incoming);
  const index = prev.findIndex((row) => chatMessageId(row) === id);
  if (index === -1) {
    return [...prev, incoming];
  }
  const next = [...prev];
  next[index] = { ...next[index], ...incoming };
  return next;
}
