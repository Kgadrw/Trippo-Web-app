import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BarChart3, ChevronDown, Check, CheckCheck, ChevronLeft, Loader2, Pencil, Reply, Search, Send, Trash2 } from "lucide-react";
import { workspaceApi } from "@/lib/api";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  ChatInteractiveBubble,
  useChatBackSwipe,
} from "@/components/workspace/ChatInteractiveBubble";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { PresenceAvatar } from "@/components/workspace/PresenceAvatar";
import { WorkspaceProfileAvatar } from "@/components/workspace/WorkspaceProfileAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatChatPresenceLabel,
  useMultiWorkspacePresence,
} from "@/hooks/useMultiWorkspacePresence";
import { WorkspaceGroupChatPane } from "@/components/workspace/WorkspaceGroupChatPane";
import {
  ChatReplyComposerBar,
  ChatReplyQuote,
  normalizeReplyTo,
  scrollChatToMessage,
  type ChatReplyTo,
} from "@/components/workspace/ChatReplyQuote";
import { ChatComposerInput } from "@/components/workspace/ChatComposerInput";
import { ChatEmojiPicker, insertEmojiInText } from "@/components/workspace/ChatEmojiPicker";
import { ChatEmojiText } from "@/components/workspace/ChatEmojiText";
import { ChatTypingBubble } from "@/components/workspace/ChatTypingBubble";
import {
  ChatMessageAddReaction,
  ChatMessageReactions,
  hasChatReactions,
} from "@/components/workspace/ChatMessageReactions";
import {
  ChatInfoButton,
  ChatInfoSheet,
  DisappearingBanner,
} from "@/components/workspace/ChatInfoSheet";
import { DirectChatMessageAttachments } from "@/components/workspace/DirectChatMessageAttachments";
import { ChatPoll } from "@/components/workspace/ChatPoll";
import { ChatPollCreateDialog } from "@/components/workspace/ChatPollCreateDialog";
import {
  ChatAttachButton,
  ChatPendingAttachments,
  filesToPendingAttachments,
  revokePendingAttachments,
  validateChatAttachmentFiles,
  type PendingChatAttachment,
} from "@/components/workspace/ChatComposerAttach";
import { formatDisappearingLabel, formatDisappearingSystemNotice } from "@/lib/disappearingMessages";
import {
  ChatVoiceRecorderButton,
  type VoiceNoteSendPayload,
} from "@/components/workspace/ChatVoiceNote";
import { uploadDirectChatAttachment, isChatAudioAttachment, prepareChatAttachmentFiles } from "@/lib/chatUpload";
import { cn } from "@/lib/utils";
import { useDirectChatSocket } from "@/hooks/useDirectChatSocket";
import { useWorkspaceChatSocket } from "@/hooks/useWorkspaceChatSocket";
import { useWorkspaceChatPanel } from "@/hooks/useWorkspaceChatPanel";
import {
  WORKSPACE_GROUP_CHAT_PATH,
  isWorkspaceGroupChatSegment,
} from "@/lib/workspaceGroupChat";
import type { WorkspaceChatMessage } from "@/lib/workspaceChatRealtime";
import { clearDirectChatOsNotification } from "@/lib/workspaceChatNotifications";
import {
  mergeDirectMessages,
  canModifyDirectMessage,
  isDirectMessageDeleted,
  WORKSPACE_DM_TYPING_EVENT,
  WORKSPACE_DM_SETTINGS_EVENT,
  type DirectChatMessage,
  type DirectChatThread,
} from "@/lib/workspaceDirectChatRealtime";
import {
  applyOptimisticPollVote,
  type ChatPollInput,
} from "@/lib/workspaceChatRealtime";
import { useTypingEmitter, useTypingListener } from "@/hooks/useChatTyping";
import { refreshMessagesUnreadBadge } from "@/lib/messagesUnreadEvents";
import { websocketManager } from "@/lib/websocketManager";
import { useChatComposerPad } from "@/hooks/useChatComposerPad";
import {
  scheduleJumpToLatest,
  useStickChatListToBottom,
} from "@/hooks/useStickChatListToBottom";

const CHAT_PURPLE = "#5B2EFF";
const CHAT_BG_IMAGE = "/mobile.jpg";
const GROUP_GAP_MS = 5 * 60 * 1000;
const SCROLL_NEAR_BOTTOM_PX = 96;

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatThreadTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messageDay = new Date(date);
  messageDay.setHours(0, 0, 0, 0);
  if (messageDay.getTime() === today.getTime()) {
    return formatMessageTime(value);
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDateDivider(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messageDay = new Date(date);
  messageDay.setHours(0, 0, 0, 0);
  if (messageDay.getTime() === today.getTime()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDay.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isOwnMessage(message: DirectChatMessage, currentUserId: string | null) {
  return Boolean(currentUserId && String(message.senderUserId) === currentUserId);
}

function hasUserRead(message: DirectChatMessage, userId: string | null) {
  if (!userId) return false;
  return (message.readBy || []).some((entry) => String(entry.userId) === userId);
}

function readReceiptState(message: DirectChatMessage, currentUserId: string | null) {
  const readByOther = (message.readBy || []).some(
    (entry) => String(entry.userId) !== String(currentUserId),
  );
  if (readByOther) return "read";
  // Optimistic send: still reaching the server → single tick.
  if (String(message._id).startsWith("pending-")) return "sent";
  // Persisted (and broadcast) → delivered to the peer.
  return "delivered";
}

function shouldShowDateDivider(messages: DirectChatMessage[], index: number) {
  if (index === 0) return true;
  return !isSameDay(messages[index - 1].createdAt, messages[index].createdAt);
}

function shouldGroupWithPrevious(
  messages: DirectChatMessage[],
  index: number,
  currentUserId: string | null,
) {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (String(prev.senderUserId) !== String(curr.senderUserId)) return false;
  if (isDirectMessageDeleted(prev) || isDirectMessageDeleted(curr)) return false;
  const gap = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap <= GROUP_GAP_MS && isSameDay(prev.createdAt, curr.createdAt);
}

function messagePreviewText(message: DirectChatMessage, deletedLabel: string) {
  if (isDirectMessageDeleted(message)) return deletedLabel;
  const body = message.body?.trim() || "";
  if (body) {
    if (!message.replyTo?.messageId) return body;
    const replyName = String(message.replyTo.senderName || "").trim();
    return replyName ? `↩ ${replyName}: ${body}` : `↩ ${body}`;
  }
  const attachments = message.attachments || [];
  if (attachments.length) {
    const first = attachments[0];
    if (isChatAudioAttachment(first.mimeType, first.fileName)) return "🎤 Voice message";
    if (first.mimeType?.startsWith("image/")) return "📷 Photo";
    return `📎 ${first.fileName || "Attachment"}`;
  }
  if (!message.replyTo?.messageId) return "";
  const replyName = String(message.replyTo.senderName || "").trim();
  return replyName ? `↩ ${replyName}` : "↩";
}

function sortDirectThreads(threads: DirectChatThread[]) {
  return [...threads].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.otherUser.name.localeCompare(b.otherUser.name);
  });
}

/** Patch the people list instantly when a DM arrives (preview, order, unread). */
function applyIncomingDirectMessageToThreads(
  prev: DirectChatThread[],
  message: DirectChatMessage,
  currentUserId: string | null,
  activeOtherUserId: string | undefined,
  deletedLabel: string,
): DirectChatThread[] {
  const conversationKey = String(message.conversationId || "");
  const own = isOwnMessage(message, currentUserId);
  const senderId = String(message.senderUserId || "");

  const peerFromConversation = prev.find(
    (thread) =>
      conversationKey &&
      thread.conversationId != null &&
      String(thread.conversationId) === conversationKey,
  )?.otherUser.userId;

  const peerUserId = own
    ? String(peerFromConversation || activeOtherUserId || "")
    : senderId;

  const viewingPeer =
    Boolean(activeOtherUserId) &&
    Boolean(peerUserId) &&
    String(activeOtherUserId) === String(peerUserId);

  const preview = messagePreviewText(message, deletedLabel);
  const shouldIncrementUnread = !own && !viewingPeer && !hasUserRead(message, currentUserId);

  let matched = false;
  const messageWorkspaceId = String(message.workspaceId || "");
  const next = prev.map((thread) => {
    const matchesConversation =
      Boolean(conversationKey) &&
      thread.conversationId != null &&
      String(thread.conversationId) === conversationKey;
    const matchesPeer =
      Boolean(peerUserId) && String(thread.otherUser.userId) === String(peerUserId);
    const matchesWorkspace =
      !messageWorkspaceId || String(thread.workspaceId || "") === messageWorkspaceId;
    if (!matchesConversation && !(matchesPeer && matchesWorkspace)) return thread;

    matched = true;
    const isThisOpen =
      Boolean(activeOtherUserId) &&
      String(thread.otherUser.userId) === String(activeOtherUserId) &&
      matchesWorkspace;

    return {
      ...thread,
      conversationId: thread.conversationId || conversationKey || null,
      workspaceId: thread.workspaceId || messageWorkspaceId,
      lastMessageAt: message.createdAt,
      lastMessageBody: preview,
      lastSenderUserId: senderId,
      unreadCount: shouldIncrementUnread
        ? Math.max(0, Number(thread.unreadCount) || 0) + 1
        : isThisOpen
          ? 0
          : thread.unreadCount,
    };
  });

  if (!matched && !own && senderId) {
    next.unshift({
      conversationId: conversationKey || null,
      workspaceId: String(message.workspaceId || ""),
      workspaceName: "",
      otherUser: {
        userId: senderId,
        name: message.senderName || "User",
        email: "",
        profilePictureUrl: message.senderProfilePictureUrl || null,
      },
      lastMessageAt: message.createdAt,
      lastMessageBody: preview,
      lastSenderUserId: senderId,
      unreadCount: shouldIncrementUnread ? 1 : 0,
    });
  }

  return sortDirectThreads(next);
}

function groupMessagePreviewText(message: WorkspaceChatMessage, deletedLabel: string) {
  if (message.deletedAt) return deletedLabel;
  const body = message.body?.trim() || "";
  if (!message.replyTo?.messageId) return body;
  const replyName = String(message.replyTo.senderName || "").trim();
  if (!body) return replyName ? `↩ ${replyName}` : "↩";
  return replyName ? `↩ ${replyName}: ${body}` : `↩ ${body}`;
}

/** Short one-line thumbnail for the thread list. */
function shortenPreview(text: string, max = 42) {
  const trimmed = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1))}…`;
}

function latestDirectMessage(messages: DirectChatMessage[]) {
  if (!messages.length) return null;
  return messages.reduce((latest, row) =>
    new Date(row.createdAt).getTime() > new Date(latest.createdAt).getTime() ? row : latest,
  );
}

function ReadReceiptIcon({ state }: { state: "sent" | "delivered" | "read" }) {
  if (state === "read") {
    return <CheckCheck size={12} className="text-sky-300" aria-hidden />;
  }
  if (state === "delivered") {
    return <CheckCheck size={12} className="text-white/75" aria-hidden />;
  }
  return <Check size={12} className="text-white/60" aria-hidden />;
}

export function MessagesPage() {
  const { activeWorkspace, workspaces } = useWorkspace();
  const { user: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId: selectedUserId } = useParams<{ userId?: string }>();

  const hasJoinedOrgs = workspaces.length > 0;
  const selectedWorkspaceParam = searchParams.get("w") || "";
  const currentUserId = localStorage.getItem("profit-pilot-user-id");
  const { unreadCount: groupUnreadCount } = useWorkspaceChatPanel();
  const isGroupChat = isWorkspaceGroupChatSegment(selectedUserId);

  const [threads, setThreads] = useState<DirectChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatReplyTo | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<DirectChatMessage | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [votingMessageId, setVotingMessageId] = useState<string | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [chatInfoOpen, setChatInfoOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatAttachment[]>([]);
  const [attachingFiles, setAttachingFiles] = useState(false);
  const [disappearingDurationSec, setDisappearingDurationSec] = useState(0);
  const [groupPreview, setGroupPreview] = useState<{
    messageId: string | null;
    body: string;
    at: string | null;
    senderUserId: string | null;
  }>({ messageId: null, body: "", at: null, senderUserId: null });

  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const markingReadRef = useRef(false);
  const sendLockRef = useRef(false);
  const selectedUserIdRef = useRef(selectedUserId);
  const conversationIdRef = useRef(conversationId);
  const loadedSelectionRef = useRef<string | null>(null);

  selectedUserIdRef.current = selectedUserId;
  conversationIdRef.current = conversationId;

  const selectedThread = useMemo(() => {
    if (!selectedUserId || isGroupChat) return null;
    const withWorkspace = threads.find(
      (thread) =>
        thread.otherUser.userId === selectedUserId &&
        selectedWorkspaceParam &&
        String(thread.workspaceId) === String(selectedWorkspaceParam),
    );
    if (withWorkspace) return withWorkspace;
    return threads.find((thread) => thread.otherUser.userId === selectedUserId) || null;
  }, [threads, selectedUserId, selectedWorkspaceParam, isGroupChat]);

  const dmMemberPictureByUserId = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    if (currentUserId) {
      map.set(String(currentUserId), currentUser?.profilePictureUrl);
    }
    if (selectedThread?.otherUser.userId) {
      map.set(String(selectedThread.otherUser.userId), selectedThread.otherUser.profilePictureUrl);
    }
    for (const message of messages) {
      const senderId = String(message.senderUserId || "");
      if (senderId && message.senderProfilePictureUrl) {
        map.set(senderId, message.senderProfilePictureUrl);
      }
    }
    return map;
  }, [currentUserId, currentUser?.profilePictureUrl, selectedThread, messages]);

  const dmMemberNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    if (currentUserId) {
      map.set(String(currentUserId), currentUser?.name || "You");
    }
    if (selectedThread?.otherUser.userId) {
      map.set(
        String(selectedThread.otherUser.userId),
        selectedThread.otherUser.nickname ||
          selectedThread.otherUser.displayName ||
          selectedThread.otherUser.name,
      );
    }
    for (const message of messages) {
      const senderId = String(message.senderUserId || "");
      if (senderId && message.senderName) {
        map.set(senderId, message.senderName);
      }
    }
    return map;
  }, [currentUserId, currentUser?.name, selectedThread, messages]);

  const dmMemberPictureRevisionByUserId = useMemo(() => {
    const map = new Map<string, number | undefined>();
    if (currentUserId && currentUser?.profilePictureRevision != null) {
      map.set(String(currentUserId), currentUser.profilePictureRevision);
    }
    return map;
  }, [currentUserId, currentUser?.profilePictureRevision]);

  /** Workspace for the open DM — can be any joined org, not only the active switcher. */
  const chatWorkspaceId =
    selectedThread?.workspaceId ||
    selectedWorkspaceParam ||
    activeWorkspace?.id ||
    "";
  const groupWorkspaceId = activeWorkspace?.id || "";

  const presenceWorkspaceIds = useMemo(() => {
    const ids = threads.map((thread) => String(thread.workspaceId)).filter(Boolean);
    if (chatWorkspaceId) ids.push(String(chatWorkspaceId));
    if (activeWorkspace?.id) ids.push(String(activeWorkspace.id));
    return ids;
  }, [threads, chatWorkspaceId, activeWorkspace?.id]);

  const { isOnline, getLastSeenAt, seedLastSeen } = useMultiWorkspacePresence(
    presenceWorkspaceIds,
    hasJoinedOrgs,
  );

  useEffect(() => {
    for (const thread of threads) {
      seedLastSeen(thread.otherUser.userId, thread.otherUser.lastSeenAt);
    }
  }, [threads, seedLastSeen]);

  /** Peers who are online right now — shown under search (Active now). */
  const activeNowPeers = useMemo(() => {
    const seen = new Set<string>();
    const peers: Array<{
      userId: string;
      name: string;
      profilePictureUrl?: string | null;
      workspaceId: string;
    }> = [];
    for (const thread of threads) {
      const userId = String(thread.otherUser.userId || "");
      if (!userId || seen.has(userId)) continue;
      if (currentUserId && userId === String(currentUserId)) continue;
      if (!isOnline(userId)) continue;
      seen.add(userId);
      peers.push({
        userId,
        name:
          thread.otherUser.nickname ||
          thread.otherUser.displayName ||
          thread.otherUser.name ||
          "User",
        profilePictureUrl: thread.otherUser.profilePictureUrl,
        workspaceId: String(thread.workspaceId),
      });
    }
    return peers;
  }, [threads, isOnline, currentUserId]);

  const presenceLabels = useMemo(
    () => ({
      active: t("chatPresenceActive"),
      activeJustNow: t("chatPresenceActiveJustNow"),
      activeMinutesAgo: t("chatPresenceActiveMinutesAgo"),
      activeHoursAgo: t("chatPresenceActiveHoursAgo"),
      lastSeen: t("chatPresenceLastSeen"),
      offline: t("chatPresenceOffline"),
    }),
    [t],
  );

  const selectedPeerOnline = Boolean(
    selectedThread && isOnline(selectedThread.otherUser.userId),
  );
  const selectedPeerPresence = selectedThread
    ? formatChatPresenceLabel(
        selectedPeerOnline,
        getLastSeenAt(selectedThread.otherUser.userId) ??
          selectedThread.otherUser.lastSeenAt,
        presenceLabels,
      )
    : "";

  const dmTypingEnabled = Boolean(
    hasJoinedOrgs && chatWorkspaceId && selectedUserId && !isGroupChat,
  );
  const { onComposerChange: notifyDmTyping, stopTyping: stopDmTyping } = useTypingEmitter({
    enabled: dmTypingEnabled,
    eventType: WORKSPACE_DM_TYPING_EVENT,
    buildPayload: (isTyping) => ({
      workspaceId: chatWorkspaceId,
      conversationId: conversationId || undefined,
      peerUserId: selectedUserId,
      userName: currentUser?.name || "User",
      isTyping,
    }),
  });
  const { typingUsers: dmTypingUsers, clearTypingUser: clearDmTypingUser } = useTypingListener({
    enabled: dmTypingEnabled,
    eventType: WORKSPACE_DM_TYPING_EVENT,
    currentUserId,
    scopeKey: `${chatWorkspaceId}:${conversationId || ""}:${selectedUserId || ""}`,
    matches: (payload) => {
      if (
        payload.workspaceId &&
        String(payload.workspaceId) !== String(chatWorkspaceId)
      ) {
        return false;
      }
      if (conversationId && payload.conversationId) {
        return String(payload.conversationId) === String(conversationId);
      }
      return (
        String(payload.userId || payload.peerUserId || "") === String(selectedUserId || "")
      );
    },
  });

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = !query
      ? threads
      : threads.filter(
      (thread) =>
        thread.otherUser.name.toLowerCase().includes(query) ||
            thread.otherUser.email.toLowerCase().includes(query) ||
            String(thread.workspaceName || "").toLowerCase().includes(query),
        );

    return [...list].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.otherUser.name.localeCompare(b.otherUser.name);
    });
  }, [threads, search]);

  const showGroupInList = useMemo(() => {
    if (!groupWorkspaceId || !activeWorkspace) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const workspaceName = (activeWorkspace?.name || "").toLowerCase();
    return (
      workspaceName.includes(query) ||
      t("workspaceChatTitle").toLowerCase().includes(query) ||
      (groupPreview.body || "").toLowerCase().includes(query)
    );
  }, [search, activeWorkspace, groupWorkspaceId, groupPreview.body, t]);

  type SidebarChatItem =
    | { kind: "group"; at: number }
    | { kind: "dm"; at: number; thread: DirectChatThread };

  const sidebarChats = useMemo(() => {
    const items: SidebarChatItem[] = [];
    if (showGroupInList) {
      items.push({
        kind: "group",
        at: groupPreview.at ? new Date(groupPreview.at).getTime() : 0,
      });
    }
    for (const thread of filteredThreads) {
      items.push({
        kind: "dm",
        at: thread.lastMessageAt ? new Date(thread.lastMessageAt).getTime() : 0,
        thread,
      });
    }
    return items.sort((a, b) => {
      if (a.at !== b.at) return b.at - a.at;
      if (a.kind !== b.kind) return a.kind === "group" ? -1 : 1;
      if (a.kind === "dm" && b.kind === "dm") {
        return a.thread.otherUser.name.localeCompare(b.thread.otherUser.name);
      }
      return 0;
    });
  }, [filteredThreads, showGroupInList, groupPreview.at]);

  const updateThreadPreview = useCallback(
    (message: DirectChatMessage, conversationKey: string) => {
      const preview = messagePreviewText(message, t("directChatMessageDeleted"));
      setThreads((prev) => {
        const next = prev.map((thread) => {
          if (thread.conversationId !== conversationKey) return thread;
          return {
            ...thread,
            lastMessageAt: message.createdAt,
            lastMessageBody: preview,
            lastSenderUserId: String(message.senderUserId),
          };
        });
        return [...next].sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          if (aTime !== bTime) return bTime - aTime;
          return a.otherUser.name.localeCompare(b.otherUser.name);
        });
      });
    },
    [t],
  );

  const syncThreadPreviewFromMessages = useCallback(
    (conversationKey: string, nextMessages: DirectChatMessage[]) => {
      const latest = latestDirectMessage(nextMessages);
      if (!latest) return;
      updateThreadPreview(latest, conversationKey);
    },
    [updateThreadPreview],
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stickToBottomRef.current = true;
    setShowScrollDown(false);
  }, []);

  /** Instant jump to last message — used when opening a chat (layout may still be settling). */
  const jumpToLatest = useCallback(() => {
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    return scheduleJumpToLatest(listRef);
  }, []);

  useEffect(() => {
    if (!dmTypingUsers.length || !stickToBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [dmTypingUsers.length, scrollToBottom]);

  const composerPad = useChatComposerPad(composerRef, [
    attachingFiles,
    conversationId,
    replyTo,
    editingMessageId,
    voiceRecording,
    text,
    pendingAttachments.length,
  ]);

  /** Keep the latest bubble visible while the keyboard opens — light, fast. */
  const keepLastMessageVisible = useCallback(() => {
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      if (!listRef.current) return;
      listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  // Keep the latest message visible when the keyboard / composer resizes the list.
  useStickChatListToBottom(listRef, stickToBottomRef, [conversationId, selectedUserId]);

  const loadThreads = useCallback(async () => {
    if (!hasJoinedOrgs) return;
    setThreadsLoading(true);
    try {
      const res = await workspaceApi.getAllDirectChatThreads();
      setThreads((res.data as DirectChatThread[]) || []);
    } catch {
      toast({ title: t("directChatLoadThreadsFailed"), variant: "destructive" });
    } finally {
      setThreadsLoading(false);
    }
  }, [hasJoinedOrgs, toast, t]);

  const openChatWithUser = useCallback(
    async (otherUserId: string, forWorkspaceId: string) => {
      if (!forWorkspaceId || !otherUserId) return null;
      setOpeningChat(true);
      try {
        const res = await workspaceApi.openDirectChat(forWorkspaceId, otherUserId);
        const data = res.data as {
          conversationId: string;
          disappearingDurationSec?: number;
          otherUser?: DirectChatThread["otherUser"];
        };
        const id = data?.conversationId || null;
        setConversationId(id);
        if (typeof data?.disappearingDurationSec === "number") {
          setDisappearingDurationSec(data.disappearingDurationSec);
        }
        if (data?.otherUser) {
          setThreads((prev) =>
            prev.map((thread) =>
              thread.otherUser.userId === otherUserId && thread.workspaceId === forWorkspaceId
                ? {
                    ...thread,
                    conversationId: id,
                    disappearingDurationSec: data.disappearingDurationSec || 0,
                    otherUser: { ...thread.otherUser, ...data.otherUser },
                  }
                : thread,
            ),
          );
        }
        return id;
      } catch {
        toast({ title: t("directChatOpenFailed"), variant: "destructive" });
        return null;
      } finally {
        setOpeningChat(false);
      }
    },
    [toast, t],
  );

  const loadMessages = useCallback(
    async (activeConversationId: string, forWorkspaceId: string) => {
      if (!forWorkspaceId || !activeConversationId) return;
      setMessagesLoading(true);
      try {
        const res = await workspaceApi.getDirectChatMessages(forWorkspaceId, activeConversationId, {
          limit: 50,
        });
        setMessages(
          ((res.data as DirectChatMessage[]) || []).filter((message) => {
            if (!message.expiresAt) return true;
            return new Date(message.expiresAt).getTime() > Date.now();
          }),
        );
        markedReadIdsRef.current = new Set();
        stickToBottomRef.current = true;
      } catch {
        toast({ title: t("directChatLoadFailed"), variant: "destructive" });
      } finally {
        setMessagesLoading(false);
      }
    },
    [toast, t],
  );

  const markMessagesRead = useCallback(
    async (ids: string[], activeConversationId: string, forWorkspaceId: string) => {
      if (!forWorkspaceId || !activeConversationId || !ids.length || markingReadRef.current) return;

      const pending = ids.filter((id) => !markedReadIdsRef.current.has(id));
      if (!pending.length) return;

      pending.forEach((id) => markedReadIdsRef.current.add(id));
      markingReadRef.current = true;
      try {
        const res = await workspaceApi.markDirectChatMessagesRead(
          forWorkspaceId,
          activeConversationId,
          pending,
        );
        const updated = (res.data as DirectChatMessage[]) || [];
        if (updated.length) {
          setMessages((prev) => {
            let next = prev;
            for (const message of updated) {
              next = mergeDirectMessages(next, message);
            }
            return next;
          });
        }
        setThreads((prev) =>
          prev.map((thread) =>
            thread.conversationId === activeConversationId
              ? { ...thread, unreadCount: 0 }
              : thread,
          ),
        );
        refreshMessagesUnreadBadge();
        clearDirectChatOsNotification(activeConversationId);
      } catch {
        pending.forEach((id) => markedReadIdsRef.current.delete(id));
      } finally {
        markingReadRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasJoinedOrgs) {
      setThreads([]);
      setMessages([]);
      setConversationId(null);
      setGroupPreview({ messageId: null, body: "", at: null, senderUserId: null });
      return;
    }
    void loadThreads();
  }, [hasJoinedOrgs, loadThreads]);

  useEffect(() => {
    if (!groupWorkspaceId) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await workspaceApi.getMessages(groupWorkspaceId, { limit: 1 });
        if (cancelled) return;
        const rows = (res.data as WorkspaceChatMessage[]) || [];
        const latest = rows[rows.length - 1];
        if (!latest) {
          setGroupPreview({ messageId: null, body: "", at: null, senderUserId: null });
          return;
        }
        setGroupPreview({
          messageId: String(latest._id),
          body: groupMessagePreviewText(latest, t("directChatMessageDeleted")),
          at: latest.createdAt,
          senderUserId: String(latest.senderUserId),
        });
      } catch {
        // Preview is best-effort; list still works without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupWorkspaceId, t]);

  const applyGroupPreviewFromMessage = useCallback(
    (message: WorkspaceChatMessage) => {
      const messageId = String(message._id);
      const body = groupMessagePreviewText(message, t("directChatMessageDeleted"));
      setGroupPreview((prev) => {
        if (prev.messageId === messageId) {
          return {
            ...prev,
            body,
            senderUserId: String(message.senderUserId),
          };
        }
        const incomingAt = new Date(message.createdAt).getTime();
        const prevAt = prev.at ? new Date(prev.at).getTime() : 0;
        if (!prev.messageId || incomingAt >= prevAt) {
          return {
            messageId,
            body,
            at: message.createdAt,
            senderUserId: String(message.senderUserId),
          };
        }
        return prev;
      });
    },
    [t],
  );

  useWorkspaceChatSocket(groupWorkspaceId, Boolean(groupWorkspaceId), {
    onMessage: applyGroupPreviewFromMessage,
    onEdit: applyGroupPreviewFromMessage,
    onDelete: applyGroupPreviewFromMessage,
  });

  useEffect(() => {
    if (!selectedUserId || isGroupChat || !hasJoinedOrgs) {
      loadedSelectionRef.current = null;
      setConversationId(null);
      setMessages([]);
      setEditingMessageId(null);
      setReplyTo(null);
      setMessageToDelete(null);
      setChatInfoOpen(false);
      setDisappearingDurationSec(0);
      return;
    }

    const forWorkspaceId =
      selectedThread?.workspaceId ||
      selectedWorkspaceParam ||
      activeWorkspace?.id ||
      "";
    if (!forWorkspaceId) return;

    const selectionKey = `${forWorkspaceId}:${selectedUserId}`;
    if (loadedSelectionRef.current === selectionKey) return;

    const existing =
      selectedThread ||
      threads.find(
        (thread) =>
          thread.otherUser.userId === selectedUserId &&
          String(thread.workspaceId) === String(forWorkspaceId),
      );

    void (async () => {
      loadedSelectionRef.current = selectionKey;
      if (existing?.conversationId) {
        setConversationId(existing.conversationId);
        setDisappearingDurationSec(Number(existing.disappearingDurationSec) || 0);
        await loadMessages(existing.conversationId, forWorkspaceId);
        return;
      }

      const id = await openChatWithUser(selectedUserId, forWorkspaceId);
      if (id) {
        setConversationId(id);
        await loadMessages(id, forWorkspaceId);
        void loadThreads();
      } else {
        loadedSelectionRef.current = null;
      }
    })();
  }, [
    selectedUserId,
    isGroupChat,
    hasJoinedOrgs,
    selectedThread,
    selectedWorkspaceParam,
    activeWorkspace?.id,
    threads,
    openChatWithUser,
    loadMessages,
    loadThreads,
  ]);

  useEffect(() => {
    if (!hasJoinedOrgs) return;
    const unsub = websocketManager.subscribe(
      WORKSPACE_DM_SETTINGS_EVENT,
      (payload: {
        conversationId?: string;
        workspaceId?: string;
        disappearingDurationSec?: number;
      }) => {
        if (typeof payload.disappearingDurationSec !== "number") return;
        const conversationKey = payload.conversationId
          ? String(payload.conversationId)
          : "";
        const workspaceKey = payload.workspaceId ? String(payload.workspaceId) : "";

        setThreads((prev) =>
          prev.map((thread) => {
            const matchesConversation =
              conversationKey &&
              thread.conversationId != null &&
              String(thread.conversationId) === conversationKey;
            const matchesWorkspacePeer =
              !conversationKey &&
              workspaceKey &&
              String(thread.workspaceId) === workspaceKey;
            if (!matchesConversation && !matchesWorkspacePeer) return thread;
            return {
              ...thread,
              disappearingDurationSec: payload.disappearingDurationSec,
            };
          }),
        );

        if (
          conversationId &&
          conversationKey &&
          String(conversationId) === conversationKey
        ) {
          setDisappearingDurationSec(payload.disappearingDurationSec);
        }
      },
    );
    return unsub;
  }, [hasJoinedOrgs, conversationId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setMessages((prev) => {
        const next = prev.filter((message) => {
          if (!message.expiresAt) return true;
          return new Date(message.expiresAt).getTime() > now;
        });
        return next.length === prev.length ? prev : next;
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || messagesLoading) return;

    const unreadIds = messages
      .filter((message) => !isOwnMessage(message, currentUserId))
      .filter((message) => !hasUserRead(message, currentUserId))
      .filter((message) => !markedReadIdsRef.current.has(String(message._id)))
      .map((message) => String(message._id));

    if (unreadIds.length) {
      void markMessagesRead(unreadIds, conversationId, chatWorkspaceId);
    }
  }, [conversationId, messages, messagesLoading, currentUserId, markMessagesRead, chatWorkspaceId]);

  useEffect(() => {
    if (!conversationId) return;
    stickToBottomRef.current = true;
    const cancelJump = jumpToLatest();
    // Avoid auto-opening the soft keyboard on mobile when entering a chat.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      return cancelJump;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      cancelJump();
      window.clearTimeout(timer);
    };
  }, [conversationId, selectedUserId, jumpToLatest]);

  useEffect(() => {
    if (!conversationId || messagesLoading || openingChat) return;
    return jumpToLatest();
  }, [conversationId, selectedUserId, messagesLoading, openingChat, jumpToLatest]);

  useDirectChatSocket(null, hasJoinedOrgs, {
    onMessage: (message) => {
      const activeConversationId = conversationIdRef.current;
      const activeOtherUserId = selectedUserIdRef.current;
      const messageWs = String(message.workspaceId || "");

      if (!isOwnMessage(message, currentUserId)) {
        clearDmTypingUser(String(message.senderUserId));
      }

      // Always refresh the people list: move chat to top, update preview, mark unread.
      setThreads((prev) =>
        applyIncomingDirectMessageToThreads(
          prev,
          message,
          currentUserId,
          isWorkspaceGroupChatSegment(activeOtherUserId) ? undefined : activeOtherUserId,
          t("directChatMessageDeleted"),
        ),
      );

      if (activeConversationId && String(message.conversationId) === activeConversationId) {
        setMessages((prev) => mergeDirectMessages(prev, message));

        if (!isOwnMessage(message, currentUserId) && messageWs) {
          void markMessagesRead([String(message._id)], activeConversationId, messageWs);
        }

        if (stickToBottomRef.current) {
          requestAnimationFrame(() => scrollToBottom("smooth"));
        } else if (!isOwnMessage(message, currentUserId)) {
          setShowScrollDown(true);
        }
      }
    },
    onRead: (message) => {
      if (conversationIdRef.current && String(message.conversationId) === conversationIdRef.current) {
        setMessages((prev) => mergeDirectMessages(prev, message));
      }
    },
    onEdit: (message) => {
      setThreads((prev) => {
        const conversationKey = String(message.conversationId || "");
        const preview = messagePreviewText(message, t("directChatMessageDeleted"));
        return sortDirectThreads(
          prev.map((thread) => {
            if (
              thread.conversationId == null ||
              String(thread.conversationId) !== conversationKey
            ) {
            return thread;
          }
          return {
            ...thread,
              lastMessageAt: message.createdAt || thread.lastMessageAt,
              lastMessageBody: preview,
            lastSenderUserId: String(message.senderUserId),
            };
          }),
        );
      });
      if (conversationIdRef.current && String(message.conversationId) === conversationIdRef.current) {
        setMessages((prev) => {
          const next = mergeDirectMessages(prev, message);
          syncThreadPreviewFromMessages(String(message.conversationId), next);
          return next;
        });
      }
    },
    onDelete: (message) => {
      setThreads((prev) => {
        const conversationKey = String(message.conversationId || "");
        const preview = messagePreviewText(message, t("directChatMessageDeleted"));
        return sortDirectThreads(
          prev.map((thread) => {
            if (
              thread.conversationId == null ||
              String(thread.conversationId) !== conversationKey
            ) {
              return thread;
            }
            return {
              ...thread,
              lastMessageAt: message.createdAt || thread.lastMessageAt,
              lastMessageBody: preview,
              lastSenderUserId: String(message.senderUserId),
            };
          }),
        );
      });
      if (conversationIdRef.current && String(message.conversationId) === conversationIdRef.current) {
        setMessages((prev) => {
          const next = mergeDirectMessages(prev, message);
          syncThreadPreviewFromMessages(String(message.conversationId), next);
          return next;
        });
        if (editingMessageId === String(message._id)) {
          setEditingMessageId(null);
          setText("");
        }
      }
    },
    onReaction: (message) => {
      if (conversationIdRef.current && String(message.conversationId) === conversationIdRef.current) {
        setMessages((prev) => mergeDirectMessages(prev, message));
      }
    },
  });

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < SCROLL_NEAR_BOTTOM_PX;
    stickToBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom && messages.length > 0);
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    const staged = pendingAttachments;
    if (
      (!trimmed && !staged.length) ||
      !chatWorkspaceId ||
      !conversationId ||
      sending ||
      attachingFiles ||
      sendLockRef.current
    ) {
      return;
    }

    stopDmTyping();

    if (editingMessageId) {
      if (!trimmed) return;
      sendLockRef.current = true;
      setSending(true);
      try {
        const res = await workspaceApi.editDirectChatMessage(
          chatWorkspaceId,
          conversationId,
          editingMessageId,
          trimmed,
        );
        const message = res.data as DirectChatMessage;
        if (message) {
          setMessages((prev) => {
            const next = mergeDirectMessages(prev, message);
            syncThreadPreviewFromMessages(conversationId, next);
            return next;
          });
        }
        setEditingMessageId(null);
        setReplyTo(null);
        setText("");
      } catch {
        toast({ title: t("directChatEditFailed"), variant: "destructive" });
      } finally {
        setSending(false);
        sendLockRef.current = false;
      }
      return;
    }

    sendLockRef.current = true;
    setSending(true);

    const optimisticId = `pending-${Date.now()}`;
    const optimisticReply = replyTo;
    const optimisticAttachments = staged.map((item) => ({
      url: item.previewUrl || "",
      fileName: item.file.name,
      mimeType: item.file.type || "application/octet-stream",
      size: item.file.size,
    }));
    const optimisticMessage: DirectChatMessage = {
      _id: optimisticId,
      conversationId,
      workspaceId: chatWorkspaceId,
      senderUserId: currentUserId || "",
      senderName: currentUser?.name || "You",
      senderProfilePictureUrl: currentUser?.profilePictureUrl || null,
      body: trimmed,
      replyTo: optimisticReply,
      attachments: optimisticAttachments,
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setReplyTo(null);
    setPendingAttachments([]);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    try {
      const uploaded =
        staged.length > 0
          ? await Promise.all(
              staged.map((item) =>
                uploadDirectChatAttachment(chatWorkspaceId, conversationId, item.file),
              ),
            )
          : [];
      const res = await workspaceApi.sendDirectChatMessage(
        chatWorkspaceId,
        conversationId,
        trimmed,
        uploaded,
        {
          replyToMessageId: optimisticReply?.messageId || null,
          replyTo: optimisticReply,
        },
      );
      const message = res.data as DirectChatMessage;
      if (message) {
        const withReply: DirectChatMessage = {
          ...message,
          replyTo: message.replyTo?.messageId ? message.replyTo : optimisticReply,
        };
        setMessages((prev) => {
          const withoutPending = prev.filter((row) => String(row._id) !== optimisticId);
          return mergeDirectMessages(withoutPending, withReply);
        });
        const preview = messagePreviewText(withReply, t("directChatMessageDeleted"));
        setThreads((prev) =>
          prev.map((thread) =>
            thread.otherUser.userId === selectedUserId &&
            String(thread.workspaceId) === String(chatWorkspaceId)
              ? {
                  ...thread,
                  conversationId: thread.conversationId || conversationId,
                  lastMessageAt: withReply.createdAt,
                  lastMessageBody: preview,
                  lastSenderUserId: String(withReply.senderUserId),
                }
              : thread,
          ),
        );
      } else if (optimisticReply) {
        setMessages((prev) =>
          prev.map((row) =>
            String(row._id) === optimisticId ? { ...row, replyTo: optimisticReply } : row,
          ),
        );
      }
      revokePendingAttachments(staged);
    } catch (error) {
      setMessages((prev) => prev.filter((row) => String(row._id) !== optimisticId));
      setText(trimmed);
      if (optimisticReply) setReplyTo(optimisticReply);
      setPendingAttachments(staged);
      toast({
        title: t("directChatSendFailed"),
        description:
          error instanceof Error && error.message
            ? error.message
            : staged.length
              ? "Failed to send attachment"
              : undefined,
        variant: "destructive",
      });
    } finally {
      setSending(false);
      sendLockRef.current = false;
    }
  };

  const queuePendingAttachments = (files: File[]) => {
    void (async () => {
      setAttachingFiles(true);
      try {
        const prepared = await prepareChatAttachmentFiles(files);
        const validation = validateChatAttachmentFiles(prepared);
        if (!validation.ok) {
          toast({
            title: "Attachment is too large",
            description: validation.message,
            variant: "destructive",
          });
          return;
        }
        setPendingAttachments((prev) => [...prev, ...filesToPendingAttachments(prepared)]);
        requestAnimationFrame(() => inputRef.current?.focus());
      } catch (error) {
        toast({
          title: "Couldn't add attachment",
          description: error instanceof Error ? error.message : "Please try another file.",
          variant: "destructive",
        });
      } finally {
        setAttachingFiles(false);
      }
    })();
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) revokePendingAttachments([target]);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleSendVoice = async ({ file, duration, waveform }: VoiceNoteSendPayload) => {
    if (!chatWorkspaceId || !conversationId || sending || sendLockRef.current || editingMessageId) {
      return;
    }

    stopDmTyping();
    sendLockRef.current = true;
    setSending(true);
    const optimisticId = `pending-voice-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    const optimisticAttachment = {
      url: localUrl,
      fileName: file.name,
      mimeType: file.type || "audio/webm",
      size: file.size,
      duration,
      waveform,
    };
    const optimisticMessage: DirectChatMessage = {
      _id: optimisticId,
      conversationId,
      workspaceId: chatWorkspaceId,
      senderUserId: currentUserId || "",
      senderName: currentUser?.name || "You",
      senderProfilePictureUrl: currentUser?.profilePictureUrl || null,
      body: "",
      attachments: [optimisticAttachment],
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    try {
      const uploaded = await uploadDirectChatAttachment(chatWorkspaceId, conversationId, file);
      const res = await workspaceApi.sendDirectChatMessage(
        chatWorkspaceId,
        conversationId,
        "",
        [
          {
            url: uploaded.url,
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
            duration,
            waveform,
          },
        ],
      );
      const message = res.data as DirectChatMessage;
      if (message) {
        setMessages((prev) => {
          const withoutPending = prev.filter((row) => String(row._id) !== optimisticId);
          return mergeDirectMessages(withoutPending, message);
        });
        const preview = messagePreviewText(message, t("directChatMessageDeleted"));
        setThreads((prev) =>
          prev.map((thread) =>
            thread.otherUser.userId === selectedUserId &&
            String(thread.workspaceId) === String(chatWorkspaceId)
              ? {
                  ...thread,
                  conversationId: thread.conversationId || conversationId,
                  lastMessageAt: message.createdAt,
                  lastMessageBody: preview,
                  lastSenderUserId: String(message.senderUserId),
                }
              : thread,
          ),
        );
      }
    } catch {
      setMessages((prev) => prev.filter((row) => String(row._id) !== optimisticId));
      toast({ title: t("chatVoiceSendFailed"), variant: "destructive" });
    } finally {
      URL.revokeObjectURL(localUrl);
      setSending(false);
      sendLockRef.current = false;
    }
  };

  const handleCreatePoll = async (poll: ChatPollInput) => {
    if (!chatWorkspaceId || !conversationId || sending || editingMessageId) return;
    setSending(true);
    try {
      const res = await workspaceApi.sendDirectChatMessage(chatWorkspaceId, conversationId, "", [], { poll });
      const message = res.data as DirectChatMessage;
      if (message) {
        setMessages((prev) => mergeDirectMessages(prev, message));
        requestAnimationFrame(() => scrollToBottom("smooth"));
      }
    } catch {
      toast({ title: "Couldn't create poll", variant: "destructive" });
      throw new Error("Poll creation failed");
    } finally {
      setSending(false);
    }
  };

  const handleVotePoll = async (messageId: string, optionIndex: number) => {
    if (!chatWorkspaceId || !conversationId || votingMessageId || !currentUserId) return;
    setVotingMessageId(messageId);
    setMessages((prev) =>
      prev.map((message) =>
        String(message._id) === messageId
          ? applyOptimisticPollVote(message, currentUserId, optionIndex)
          : message,
      ),
    );
    try {
      const res = await workspaceApi.voteDirectChatMessagePoll(
        chatWorkspaceId,
        conversationId,
        messageId,
        optionIndex,
      );
      const message = res.data as DirectChatMessage;
      if (message) setMessages((prev) => mergeDirectMessages(prev, message));
    } catch {
      toast({ title: "Couldn't record vote", variant: "destructive" });
      void loadMessages(conversationId, chatWorkspaceId);
    } finally {
      setVotingMessageId(null);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!chatWorkspaceId || !conversationId || reactingMessageId) return;
    setReactingMessageId(messageId);
    try {
      const res = await workspaceApi.toggleDirectChatMessageReaction(
        chatWorkspaceId,
        conversationId,
        messageId,
        emoji,
      );
      const message = res.data as DirectChatMessage;
      if (message) setMessages((prev) => mergeDirectMessages(prev, message));
    } catch {
      toast({ title: "Couldn't add reaction", variant: "destructive" });
    } finally {
      setReactingMessageId(null);
    }
  };

  const startEdit = (message: DirectChatMessage) => {
    setReplyTo(null);
    setEditingMessageId(String(message._id));
    setText(message.body || "");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const startReply = (message: DirectChatMessage) => {
    if (isDirectMessageDeleted(message)) return;
    setEditingMessageId(null);
    setReplyTo(normalizeReplyTo(message));
  };

  useEffect(() => {
    if (!replyTo) return;
    const focusComposer = () => {
      const el = inputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        // ignore for unsupported input types
      }
    };
    focusComposer();
    const t1 = window.setTimeout(focusComposer, 50);
    const t2 = window.setTimeout(focusComposer, 180);
    const t3 = window.setTimeout(focusComposer, 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [replyTo]);

  const cancelEdit = () => {
    setEditingMessageId(null);
    setText("");
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const jumpToMessage = useCallback((messageId: string) => {
    scrollChatToMessage(listRef.current, messageId);
  }, []);

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !chatWorkspaceId || !conversationId || deletingMessageId) return;

    const messageId = String(messageToDelete._id);
    setDeletingMessageId(messageId);
    try {
      const res = await workspaceApi.deleteDirectChatMessage(
        chatWorkspaceId,
        conversationId,
        messageId,
      );
      const updated = res.data as DirectChatMessage;
      if (updated) {
        setMessages((prev) => {
          const next = mergeDirectMessages(prev, updated);
          syncThreadPreviewFromMessages(conversationId, next);
          return next;
        });
      }
      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setText("");
      }
      if (replyTo?.messageId === messageId) {
        setReplyTo(null);
      }
      setMessageToDelete(null);
    } catch {
      toast({ title: t("directChatDeleteFailed"), variant: "destructive" });
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      if (editingMessageId) {
        event.preventDefault();
        cancelEdit();
        return;
      }
      if (replyTo) {
        event.preventDefault();
        cancelReply();
      }
      return;
    }
    // Mobile: Enter inserts a newline (easier captions). Desktop: Enter sends.
    if (event.key === "Enter" && !event.shiftKey && window.innerWidth >= 1024) {
      event.preventDefault();
      void handleSend();
    }
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, window.innerWidth >= 1024 ? 180 : 120)}px`;
  }, [text]);

  useEffect(() => {
    setPendingAttachments((prev) => {
      if (!prev.length) return prev;
      revokePendingAttachments(prev);
      return [];
    });
  }, [conversationId, selectedUserId]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editingMessageId) cancelEdit();
      else if (replyTo) cancelReply();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingMessageId, replyTo]);

  if (!hasJoinedOrgs) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-center text-gray-600">
        <p className="text-lg font-medium text-gray-900">{t("directChatWorkspaceOnlyTitle")}</p>
        <p className="max-w-md text-sm">{t("directChatWorkspaceOnlyBody")}</p>
      </div>
    );
  }

  const showThreadOnMobile = Boolean(selectedUserId);
  const showGroupChat = isGroupChat && Boolean(groupWorkspaceId);
  const showDirectChat = Boolean(selectedUserId && selectedThread && !isGroupChat);
  const leaveConversation = useCallback(() => navigate("/messages"), [navigate]);
  const backSwipe = useChatBackSwipe(leaveConversation, showDirectChat || showGroupChat);

  return (
    <div className="workspace-chat flex h-full min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#0b0f14]">
      {/* People list */}
      <aside
        className={cn(
          "flex h-full min-h-0 w-full shrink-0 flex-col self-stretch border-r border-gray-200/80 bg-gray-50 lg:w-80 dark:border-white/10 dark:bg-[#11161d]",
          showThreadOnMobile && "hidden lg:flex",
        )}
      >
        <div className="border-b border-gray-200/80 px-4 py-3 max-lg:pt-[max(0.75rem,env(safe-area-inset-top))] lg:py-4 dark:border-white/10">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 lg:text-lg dark:text-zinc-100">
            {t("directChatTitle")}
          </h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("directChatSearchPeople")}
              className="w-full rounded-full border border-gray-200/80 bg-white py-2.5 pl-9 pr-3 text-[15px] text-gray-900 outline-none ring-sky-300 focus:ring-2 lg:py-2 lg:text-sm dark:border-white/10 dark:bg-[#1a222d] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:ring-sky-500/40"
            />
          </div>
          {activeNowPeers.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {t("workspaceChatActiveUsers")}
              </p>
              <div
                className="flex items-center gap-2 overflow-x-auto pb-0.5"
                aria-label={t("workspaceChatActiveUsers")}
              >
                {activeNowPeers.map((peer) => (
                  <Tooltip key={peer.userId}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          setThreads((prev) =>
                            prev.map((row) =>
                              row.otherUser.userId === peer.userId &&
                              String(row.workspaceId) === String(peer.workspaceId)
                                ? { ...row, unreadCount: 0 }
                                : row,
                            ),
                          );
                          navigate(
                            `/messages/${peer.userId}?w=${encodeURIComponent(peer.workspaceId)}`,
                          );
                        }}
                        className="relative h-10 w-10 shrink-0 rounded-full ring-2 ring-white transition-transform hover:scale-105"
                        aria-label={peer.name}
                      >
                        <PresenceAvatar
                          name={peer.name}
                          profilePictureUrl={peer.profilePictureUrl}
                          className="h-full w-full"
                          fallbackClassName="bg-sky-400 text-[10px] font-bold text-white"
                          online
                          ringClassName="ring-white"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {peer.name}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
            </div>
          ) : sidebarChats.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">{t("directChatNoPeople")}</p>
          ) : (
            sidebarChats.map((item) => {
              if (item.kind === "group") {
                if (!activeWorkspace) return null;
                return (
                  <button
                    key="workspace-group-chat"
                    type="button"
                    onClick={() => navigate(WORKSPACE_GROUP_CHAT_PATH)}
                    className={cn(
                      "mx-2 my-0.5 flex w-[calc(100%-1rem)] items-center gap-3 px-3 py-3.5 text-left transition-colors max-lg:min-h-[4.25rem] rounded-xl",
                      showGroupChat
                        ? "bg-sky-100 text-gray-900 hover:bg-sky-100 dark:bg-sky-500/25 dark:text-zinc-50 dark:hover:bg-sky-500/25"
                        : "hover:bg-white/70 active:bg-white dark:hover:bg-white/5 dark:active:bg-white/10",
                    )}
                  >
                    <WorkspaceProfileAvatar
                      name={activeWorkspace.name}
                      profilePictureUrl={activeWorkspace.profilePictureUrl}
                      pictureRevision={activeWorkspace.profilePictureRevision}
                      className="h-11 w-11 shrink-0"
                      fallbackClassName="bg-sky-400 text-xs font-bold text-white"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
                          {activeWorkspace.name}
                        </p>
                        {groupPreview.at ? (
                          <span
                            className={cn(
                              "shrink-0 text-[10px]",
                              showGroupChat ? "text-sky-700/70 dark:text-sky-300/80" : "text-gray-400 dark:text-zinc-500",
                            )}
                          >
                            {formatThreadTime(groupPreview.at)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-xs",
                            showGroupChat ? "text-sky-800/70 dark:text-sky-200/80" : "text-gray-500 dark:text-zinc-400",
                          )}
                        >
                          {groupPreview.body
                            ? `${
                                groupPreview.senderUserId === currentUserId
                                  ? `${t("directChatYou")}: `
                                  : ""
                              }${shortenPreview(groupPreview.body)}`
                            : t("workspaceChatSubtitle")}
                        </p>
                        {groupUnreadCount > 0 && !showGroupChat ? (
                          <span className="flex shrink-0 items-center gap-1">
                            <span className="rounded bg-[#5B2EFF]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5B2EFF]">
                              New
                            </span>
                            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#5B2EFF] px-1 text-[10px] font-bold text-white">
                              {groupUnreadCount > 99 ? "99+" : groupUnreadCount}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              }

              const thread = item.thread;
              const active =
                thread.otherUser.userId === selectedUserId &&
                (!selectedWorkspaceParam ||
                  String(thread.workspaceId) === String(selectedWorkspaceParam));
              const rawPreview =
                thread.lastMessageBody ||
                (active ? t("directChatStartConversation") : t("directChatTapToChat"));
              const preview = shortenPreview(rawPreview);
              const previewPrefix =
                thread.lastMessageBody && thread.lastSenderUserId === currentUserId
                  ? `${t("directChatYou")}: `
                  : "";

              return (
                <button
                  key={`${thread.workspaceId}:${thread.otherUser.userId}`}
                  type="button"
                  onClick={() => {
                    // Show as read immediately in the list when opening.
                    setThreads((prev) =>
                      prev.map((row) =>
                        row.otherUser.userId === thread.otherUser.userId &&
                        String(row.workspaceId) === String(thread.workspaceId)
                          ? { ...row, unreadCount: 0 }
                          : row,
                      ),
                    );
                    navigate(
                      `/messages/${thread.otherUser.userId}?w=${encodeURIComponent(thread.workspaceId)}`,
                    );
                  }}
                  className={cn(
                    "mx-2 my-0.5 flex w-[calc(100%-1rem)] items-center gap-3 px-3 py-3.5 text-left transition-colors max-lg:min-h-[4.25rem] rounded-xl",
                    active
                      ? "bg-sky-100 text-gray-900 hover:bg-sky-100 dark:bg-sky-500/25 dark:text-zinc-50 dark:hover:bg-sky-500/25"
                      : "hover:bg-white/70 active:bg-white dark:hover:bg-white/5 dark:active:bg-white/10",
                    thread.unreadCount > 0 && !active && "bg-[#5B2EFF]/[0.04] dark:bg-[#5B2EFF]/15",
                  )}
                >
                  <PresenceAvatar
                    name={thread.otherUser.name}
                    profilePictureUrl={thread.otherUser.profilePictureUrl}
                    className="h-11 w-11 shrink-0"
                    fallbackClassName="bg-sky-400 text-xs font-bold text-white"
                    online={isOnline(thread.otherUser.userId)}
                    disappearing={Number(thread.disappearingDurationSec) > 0}
                    ringClassName={active ? "ring-sky-100 dark:ring-sky-500/30" : "ring-gray-50 dark:ring-[#11161d]"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {thread.otherUser.nickname ||
                          thread.otherUser.displayName ||
                          thread.otherUser.name}
                      </p>
                        {thread.workspaceName ? (
                          <p
                            className={cn(
                              "truncate text-[10px] font-medium",
                              active ? "text-sky-700 dark:text-sky-300" : "text-sky-600 dark:text-sky-400",
                            )}
                          >
                            {thread.workspaceName}
                          </p>
                        ) : null}
                      </div>
                      {thread.lastMessageAt ? (
                        <span
                          className={cn(
                            "shrink-0 text-[10px]",
                            active ? "text-sky-700/70 dark:text-sky-300/80" : "text-gray-400 dark:text-zinc-500",
                          )}
                        >
                          {formatThreadTime(thread.lastMessageAt)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-xs",
                          active
                            ? "text-sky-800/70 dark:text-sky-200/80"
                            : thread.unreadCount > 0
                              ? "font-semibold text-gray-800 dark:text-zinc-100"
                              : "text-gray-500 dark:text-zinc-400",
                        )}
                      >
                        {previewPrefix}
                        {preview}
                      </p>
                      {thread.unreadCount > 0 && !active ? (
                        <span className="flex shrink-0 items-center gap-1">
                          <span className="rounded bg-[#5B2EFF]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5B2EFF]">
                            New
                          </span>
                          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#5B2EFF] px-1 text-[10px] font-bold text-white">
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Conversation */}
      <section
        className={cn(
          "relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-[#0b0f14]",
          !showThreadOnMobile && "hidden lg:flex",
        )}
        onTouchStart={backSwipe.onTouchStart}
        onTouchEnd={backSwipe.onTouchEnd}
      >
        {showGroupChat ? (
          <WorkspaceGroupChatPane
            active
            variant="page"
            className="h-full"
            onBack={leaveConversation}
          />
        ) : !showDirectChat ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-gray-500 dark:text-zinc-400">
            <img src="/chat.png" alt="" className="h-16 w-16 opacity-80" />
            <p className="text-base font-medium text-gray-800 dark:text-zinc-100">{t("directChatSelectPerson")}</p>
            <p className="max-w-sm text-sm">{t("directChatSelectPersonHint")}</p>
            <button
              type="button"
              onClick={() => navigate(WORKSPACE_GROUP_CHAT_PATH)}
              className="mt-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              {t("workspaceChatOpen")}
            </button>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-sky-100 bg-white/95 px-2 py-2.5 backdrop-blur-sm max-lg:pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-4 lg:static lg:py-3 dark:border-white/10 dark:bg-[#11161d]/95">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sky-600 active:bg-sky-50 dark:text-sky-300 dark:active:bg-white/10 lg:hidden"
                onClick={leaveConversation}
                aria-label={t("chatBack")}
              >
                <ChevronLeft size={26} strokeWidth={2.25} />
              </button>
              <PresenceAvatar
                name={selectedThread.otherUser.name}
                profilePictureUrl={selectedThread.otherUser.profilePictureUrl}
                className="h-10 w-10"
                fallbackClassName="bg-sky-400 text-xs font-bold text-white"
                online={selectedPeerOnline}
                avatarClassName="border-2 border-sky-300 dark:border-sky-500/50"
                ringClassName="ring-white dark:ring-[#11161d]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-gray-900 dark:text-zinc-50">
                  {selectedThread.otherUser.nickname ||
                    selectedThread.otherUser.displayName ||
                    selectedThread.otherUser.name}
                </p>
                <p
                  className={cn(
                    "truncate text-xs",
                    selectedPeerOnline
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-gray-500 dark:text-zinc-400",
                  )}
                >
                  {selectedPeerPresence}
                </p>
              </div>
              {conversationId ? (
                <ChatInfoButton
                  label={t("chatInfo")}
                  onClick={() => setChatInfoOpen(true)}
                />
              ) : null}
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="pointer-events-none absolute inset-0 dark:bg-[#0b0f14]" aria-hidden>
                <img
                  src={CHAT_BG_IMAGE}
                  alt=""
                  className="h-full w-full object-cover object-center dark:hidden"
                />
                <div className="absolute inset-0 bg-white/96 dark:hidden" />
              </div>

              <div
                    ref={listRef}
                    onScroll={handleListScroll}
                    className="relative z-10 h-full w-full overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y px-3 pt-4 scroll-smooth sm:px-4"
                    style={{ paddingBottom: composerPad }}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                <DisappearingBanner
                  durationSec={disappearingDurationSec}
                  label={t("chatDisappearActive").replace(
                    "{duration}",
                    formatDisappearingLabel(disappearingDurationSec, t),
                  )}
                />
                {messagesLoading || openingChat ? (
                  <div className="flex h-full min-h-[12rem] items-center justify-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 text-center text-gray-500">
                    <p className="text-sm font-medium text-gray-700">{t("directChatEmptyTitle")}</p>
                    <p className="max-w-xs text-xs">{t("directChatEmptyBody")}</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const systemNotice =
                      message.systemType === "disappearing"
                        ? formatDisappearingSystemNotice(message, t)
                        : "";
                    if (systemNotice) {
                      return (
                        <div
                          key={String(message._id)}
                          data-chat-message-id={String(message._id)}
                          className="rounded-xl transition-shadow"
                        >
                          {shouldShowDateDivider(messages, index) ? (
                            <div className="my-4 flex justify-center">
                              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 dark:bg-[#1e2732] dark:text-zinc-300">
                                {formatDateDivider(message.createdAt)}
                              </span>
                            </div>
                          ) : null}
                          <div className="my-4 flex justify-center">
                            <span className="max-w-[min(100%,22rem)] rounded-full bg-white/90 px-3 py-1 text-center text-[11px] font-medium leading-snug text-gray-500 dark:bg-[#1e2732] dark:text-zinc-300">
                              {systemNotice}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const own = isOwnMessage(message, currentUserId);
                    const grouped = shouldGroupWithPrevious(messages, index, currentUserId);
                    const deleted = isDirectMessageDeleted(message);
                    const canModify = canModifyDirectMessage(message, currentUserId);
                    const canEdit = canModify && Boolean(message.body?.trim());
                    const hasAttachments = Boolean(message.attachments?.length);
                    const showReactions = !deleted && hasChatReactions(message.reactions);
                    if (!deleted && !message.body?.trim() && !hasAttachments && !message.poll) return null;

                    return (
                      <div key={String(message._id)} data-chat-message-id={String(message._id)} className="rounded-xl transition-shadow">
                        {shouldShowDateDivider(messages, index) ? (
                          <div className="my-4 flex justify-center">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 dark:bg-[#1e2732] dark:text-zinc-300">
                              {formatDateDivider(message.createdAt)}
                            </span>
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            "flex w-full",
                            own ? "justify-end" : "justify-start",
                            grouped ? "mt-1" : "mt-3",
                          )}
                        >
                          {!own ? (
                            <div className="mr-2 mt-auto h-7 w-7 shrink-0 self-end overflow-hidden rounded-full lg:mr-3 lg:h-8 lg:w-8">
                              <UserProfileAvatar
                                name={message.senderName}
                                profilePictureUrl={
                                  message.senderProfilePictureUrl ||
                                  selectedThread.otherUser.profilePictureUrl
                                }
                                className="!m-0 !h-full !w-full !rounded-full !p-0"
                                fallbackClassName="bg-sky-100 text-[8px] font-semibold text-sky-700"
                              />
                            </div>
                          ) : null}

                          <div
                            className={cn(
                              "group/msg flex min-w-0 max-w-[85%] flex-col",
                              own ? "items-end" : "items-start",
                            )}
                          >
                          <div
                            className={cn(
                              "flex max-w-full items-end gap-1",
                              own ? "flex-row-reverse" : "flex-row",
                            )}
                          >
                          <ChatInteractiveBubble
                            own={own}
                            disabled={deleted}
                            actionsTitle={t("chatMessageActions")}
                            onReply={() => startReply(message)}
                            onReact={
                              deleted
                                ? undefined
                                : () => setReactionPickerMessageId(String(message._id))
                            }
                            className="min-w-0 max-w-full ml-0 mr-0"
                            actions={[
                              {
                                id: "reply",
                                label: t("chatReply"),
                                icon: <Reply size={16} />,
                                onSelect: () => startReply(message),
                              },
                              ...(own && canEdit
                                ? [
                                    {
                                      id: "edit",
                                      label: t("directChatEdit"),
                                      icon: <Pencil size={16} />,
                                      onSelect: () => startEdit(message),
                                    },
                                  ]
                                : []),
                              ...(own && canModify
                                ? [
                                    {
                                      id: "delete",
                                      label: t("directChatDelete"),
                                      icon: <Trash2 size={16} />,
                                      destructive: true,
                                      disabled: deletingMessageId === String(message._id),
                                      onSelect: () => setMessageToDelete(message),
                                    },
                                  ]
                                : []),
                            ]}
                          >
                          <div
                            className={cn(
                                "rounded-[1.15rem] px-3 py-1.5 text-sm leading-snug shadow-none",
                              deleted
                                ? own
                                  ? "rounded-br-md bg-gray-200 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400"
                                  : "rounded-bl-md bg-[#F4F4F5] text-gray-400 dark:bg-[#1e2732] dark:text-zinc-500"
                                : own
                                  ? "rounded-br-md text-white"
                                  : "rounded-bl-md bg-[#F4F4F5] text-gray-800 dark:bg-[#1e2732] dark:text-zinc-100",
                            )}
                            style={own && !deleted ? { backgroundColor: CHAT_PURPLE } : undefined}
                          >
                              {!deleted && message.replyTo?.messageId ? (
                                <ChatReplyQuote
                                  replyTo={{
                                    messageId: String(message.replyTo.messageId),
                                    senderUserId: message.replyTo.senderUserId,
                                    senderName: message.replyTo.senderName,
                                    body: message.replyTo.body,
                                    deletedAt: message.replyTo.deletedAt,
                                  }}
                                  own={own}
                                  deletedLabel={t("directChatMessageDeleted")}
                                  onJump={jumpToMessage}
                                />
                              ) : null}
                            {deleted ? (
                              <p className="italic">{t("directChatMessageDeleted")}</p>
                              ) : (
                                <>
                                  {message.attachments?.length ? (
                                    <div className={cn(message.body ? "mb-2" : undefined)}>
                                      <DirectChatMessageAttachments
                                        attachments={message.attachments}
                                        own={own}
                                      />
                                    </div>
                                  ) : null}
                                  {message.poll ? (
                                    <ChatPoll
                                      poll={message.poll}
                                      currentUserId={currentUserId}
                                      own={own}
                                      pending={votingMessageId === String(message._id)}
                                      onVote={(optionIndex) => void handleVotePoll(String(message._id), optionIndex)}
                                      memberPictureByUserId={dmMemberPictureByUserId}
                                      memberNameByUserId={dmMemberNameByUserId}
                                      memberPictureRevisionByUserId={dmMemberPictureRevisionByUserId}
                                    />
                                  ) : null}
                                  {message.body ? (
                              <p className="whitespace-pre-wrap break-words">
                                <ChatEmojiText text={message.body} />
                              </p>
                            ) : null}
                                </>
                              )}
                            {showReactions ? (
                              <ChatMessageReactions
                                reactions={message.reactions}
                                currentUserId={currentUserId}
                                own={own}
                                disabled={reactingMessageId === String(message._id)}
                                onReact={(emoji) => void handleReact(String(message._id), emoji)}
                              />
                            ) : null}
                            <div
                              className={cn(
                                "mt-1 flex items-center justify-end gap-1 text-[10px]",
                                deleted
                                  ? "text-gray-400"
                                  : own
                                    ? "text-white/80"
                                    : "text-gray-400",
                              )}
                            >
                              {message.editedAt && !deleted ? (
                                <span className="opacity-80">{t("directChatEdited")}</span>
                              ) : null}
                              <span>{formatMessageTime(message.createdAt)}</span>
                              {own && !deleted ? (
                                <ReadReceiptIcon state={readReceiptState(message, currentUserId)} />
                              ) : null}
                            </div>
                          </div>
                          </ChatInteractiveBubble>
                          {!deleted ? (
                            <ChatMessageAddReaction
                              disabled={reactingMessageId === String(message._id)}
                              open={reactionPickerMessageId === String(message._id)}
                              onOpenChange={(open) =>
                                setReactionPickerMessageId(open ? String(message._id) : null)
                              }
                              onReact={(emoji) => void handleReact(String(message._id), emoji)}
                            />
                          ) : null}
                          </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {dmTypingUsers.length > 0 && selectedThread ? (
                  <div className="pb-1">
                    {dmTypingUsers.map((user) => (
                      <ChatTypingBubble
                        key={user.userId}
                        name={user.userName || selectedThread.otherUser.name}
                        profilePictureUrl={selectedThread.otherUser.profilePictureUrl}
                        label={t("chatTypingBubble")}
                      />
                    ))}
                  </div>
                ) : null}
                  </div>

              {showScrollDown ? (
                <button
                  type="button"
                  onClick={() => scrollToBottom("smooth")}
                  className="absolute right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-none ring-1 ring-sky-100 lg:h-10 lg:w-10 dark:bg-[#1a222d] dark:text-zinc-200 dark:ring-white/10"
                  style={{ bottom: Math.max(composerPad - 8, 72) }}
                  aria-label={t("directChatScrollDown")}
                >
                  <ChevronDown size={18} />
                </button>
              ) : null}
              <ChatPollCreateDialog
                open={pollDialogOpen}
                onOpenChange={setPollDialogOpen}
                onCreate={handleCreatePoll}
              />

              <div
                ref={composerRef}
                data-chat-composer
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 z-20",
                  "bg-gradient-to-t from-white via-white/95 to-transparent",
                  "dark:from-[#0b0f14] dark:via-[#0b0f14]/95 dark:to-transparent",
                  "px-2 pt-6 max-lg:pt-4",
                  "chat-composer-pad",
                  "lg:bg-[#f0f2f5] lg:bg-none lg:px-3 lg:pb-0 lg:pt-4",
                  "dark:lg:bg-[#11161d]",
                  voiceRecording && "z-30 overflow-visible pt-3 max-lg:pt-3",
                )}
              >
                <div className="pointer-events-auto w-full">
              {editingMessageId && !voiceRecording ? (
                    <div className="mb-2 flex min-h-11 items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm text-gray-700 ring-1 ring-black/5 dark:bg-[#1a222d] dark:text-zinc-200 dark:ring-white/10">
                  <span>{t("directChatEditing")}</span>
                  <button
                    type="button"
                    onClick={cancelEdit}
                        className="min-h-9 px-2 font-medium text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
                  >
                    {t("directChatCancelEdit")}
                  </button>
                </div>
                  ) : replyTo && !voiceRecording ? (
                    <ChatReplyComposerBar
                      replyTo={replyTo}
                      title={t("chatReplyingTo")}
                      deletedLabel={t("directChatMessageDeleted")}
                      cancelLabel={t("chatCancelReply")}
                      onCancel={cancelReply}
                    />
              ) : null}
                  {!voiceRecording ? (
                    <ChatPendingAttachments
                      items={pendingAttachments}
                      onRemove={removePendingAttachment}
                    />
                  ) : null}
                  {attachingFiles ? (
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-500 ring-1 ring-black/5 dark:bg-[#1a222d] dark:text-zinc-400 dark:ring-white/10">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
                      Preparing photo…
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border-0 bg-white px-2.5 py-1.5 shadow-none ring-1 ring-black/5 sm:gap-2 sm:px-3 dark:bg-[#1a222d] dark:ring-white/10",
                      voiceRecording && "border-transparent bg-transparent p-0 shadow-none ring-0 dark:bg-transparent",
                    )}
                  >
                    {!voiceRecording ? (
                      <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-sky-100 hover:text-sky-700 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-300"
                        onClick={() => setPollDialogOpen(true)}
                        disabled={sending || !conversationId || Boolean(editingMessageId)}
                        aria-label="Create poll"
                        title="Create poll"
                      >
                        <BarChart3 size={18} />
                      </button>
                    ) : null}
                    {!voiceRecording ? (
                      <ChatEmojiPicker
                        label={t("chatEmoji")}
                        buttonClassName="h-9 w-9 shrink-0"
                        onSelect={(emoji) => {
                          const el = inputRef.current;
                          const start = el?.selectionStart ?? text.length;
                          const end = el?.selectionEnd ?? text.length;
                          const { next, caret } = insertEmojiInText(text, emoji, start, end);
                          setText(next);
                          notifyDmTyping(next);
                          requestAnimationFrame(() => {
                            if (!inputRef.current) return;
                            inputRef.current.focus();
                            inputRef.current.setSelectionRange(caret, caret);
                          });
                        }}
                      />
                    ) : null}
                    {!voiceRecording ? (
                <ChatComposerInput
                  ref={inputRef}
                  value={text}
                        onChange={(event) => {
                          const value = event.target.value;
                          setText(value);
                          notifyDmTyping(value);
                        }}
                        onFocus={() => {
                          window.scrollTo(0, 0);
                          keepLastMessageVisible();
                          // Android keyboard opens asynchronously — re-pin after it settles.
                          window.setTimeout(() => keepLastMessageVisible(), 120);
                          window.setTimeout(() => keepLastMessageVisible(), 320);
                          window.setTimeout(() => keepLastMessageVisible(), 520);
                        }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                        inputMode="text"
                        enterKeyHint={typeof window !== "undefined" && window.innerWidth < 1024 ? "enter" : "send"}
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        spellCheck
                  placeholder={
                          pendingAttachments.length
                            ? "Add a caption…"
                            : t("workspaceChatSend")
                        }
                        className="max-h-[180px] min-h-[36px] w-full resize-none bg-transparent py-2 text-[16px] leading-5 text-gray-900 outline-none placeholder:text-gray-400 lg:text-[15px] dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      />
                    ) : null}
                    {!voiceRecording ? (
                      <ChatAttachButton
                        className="h-9 w-9"
                        iconSize={18}
                        disabled={sending || attachingFiles || !conversationId || Boolean(editingMessageId)}
                        onFilesSelected={queuePendingAttachments}
                      />
                    ) : null}
                    {(!text.trim() && !pendingAttachments.length && !editingMessageId) ||
                    voiceRecording ? (
                      <ChatVoiceRecorderButton
                        className={voiceRecording ? "w-full" : "h-9 w-9"}
                        disabled={sending || attachingFiles || !conversationId || Boolean(editingMessageId)}
                        recordingLabel={t("chatVoiceRecording")}
                        cancelLabel={t("chatVoiceCancel")}
                        sendLabel={t("chatVoiceSend")}
                        micLabel={t("chatVoiceRecord")}
                        permissionDeniedLabel={t("chatVoicePermissionDenied")}
                        holdHintLabel={t("chatVoiceHoldHint")}
                        slideUpLockLabel={t("chatVoiceSlideUpLock")}
                        slideCancelLabel={t("chatVoiceSlideCancel")}
                        lockedLabel={t("chatVoiceLocked")}
                        releaseToSendLabel={t("chatVoiceReleaseToSend")}
                        onRecordingChange={(next) => {
                          setVoiceRecording(next);
                          if (!next) return;
                          // Dismiss keyboard so the recording bar stays visible on Android.
                          const active = document.activeElement as HTMLElement | null;
                          active?.blur?.();
                          window.scrollTo(0, 0);
                          keepLastMessageVisible();
                          window.setTimeout(() => keepLastMessageVisible(), 120);
                          window.setTimeout(() => keepLastMessageVisible(), 320);
                          window.setTimeout(() => keepLastMessageVisible(), 520);
                        }}
                        onError={(message) =>
                          toast({ title: message, variant: "destructive" })
                        }
                        onSend={handleSendVoice}
                      />
                    ) : !voiceRecording ? (
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={
                    (!text.trim() && !pendingAttachments.length) ||
                    sending ||
                    attachingFiles ||
                    Boolean(editingMessageId && !text.trim())
                  }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: CHAT_PURPLE }}
                  aria-label={t("workspaceChatSend")}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                          <Send
                            size={16}
                            className={
                              text.trim() || pendingAttachments.length
                                ? "translate-x-px"
                                : undefined
                            }
                          />
                  )}
                </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedThread && conversationId && chatWorkspaceId ? (
        <ChatInfoSheet
          mode="direct"
          open={chatInfoOpen}
          onOpenChange={setChatInfoOpen}
          workspaceId={chatWorkspaceId}
          conversationId={conversationId}
          peer={selectedThread.otherUser}
          disappearingDurationSec={disappearingDurationSec}
          onDisappearingChange={(durationSec) => {
            setDisappearingDurationSec(durationSec);
            if (!conversationId) return;
            setThreads((prev) =>
              prev.map((thread) =>
                String(thread.conversationId) === String(conversationId)
                  ? { ...thread, disappearingDurationSec: durationSec }
                  : thread,
              ),
            );
          }}
          onNicknameChange={(nickname) => {
            setThreads((prev) =>
              prev.map((thread) =>
                thread.otherUser.userId === selectedThread.otherUser.userId &&
                String(thread.workspaceId) === String(selectedThread.workspaceId)
                  ? {
                      ...thread,
                      otherUser: {
                        ...thread.otherUser,
                        nickname,
                        displayName: nickname || thread.otherUser.name,
                      },
                    }
                  : thread,
              ),
            );
          }}
        />
      ) : null}

      <DeleteConfirmDialog
        open={Boolean(messageToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingMessageId) setMessageToDelete(null);
        }}
        title={t("directChatDelete")}
        description={t("directChatDeleteConfirm")}
        confirmLabel={t("directChatDelete")}
        cancelLabel={t("cancel")}
        deletingLabel={t("deleting")}
        onConfirm={confirmDeleteMessage}
        isDeleting={Boolean(deletingMessageId)}
        contentClassName="top-1/2 max-w-sm -translate-y-1/2 rounded-2xl border-0 text-gray-500 shadow-none data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0"
        cancelClassName="rounded-full"
        confirmClassName="rounded-full"
      />
    </div>
  );
}
