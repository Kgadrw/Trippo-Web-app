import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Check, CheckCheck, ChevronLeft, Loader2, Pencil, Reply, Search, Send, Trash2 } from "lucide-react";
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
import { ChatEmojiPicker, insertEmojiInText } from "@/components/workspace/ChatEmojiPicker";
import { ChatEmojiText } from "@/components/workspace/ChatEmojiText";
import { ChatTypingBubble } from "@/components/workspace/ChatTypingBubble";
import {
  ChatInfoButton,
  ChatInfoSheet,
  DisappearingBanner,
} from "@/components/workspace/ChatInfoSheet";
import { DirectChatMessageAttachments } from "@/components/workspace/DirectChatMessageAttachments";
import { formatDisappearingLabel, formatDisappearingSystemNotice } from "@/lib/disappearingMessages";
import {
  ChatVoiceRecorderButton,
  type VoiceNoteSendPayload,
} from "@/components/workspace/ChatVoiceNote";
import { uploadDirectChatAttachment, isChatAudioAttachment } from "@/lib/chatUpload";
import { cn } from "@/lib/utils";
import { useDirectChatSocket } from "@/hooks/useDirectChatSocket";
import { useWorkspaceChatSocket } from "@/hooks/useWorkspaceChatSocket";
import { useWorkspaceChatPanel } from "@/hooks/useWorkspaceChatPanel";
import {
  WORKSPACE_GROUP_CHAT_PATH,
  isWorkspaceGroupChatSegment,
} from "@/lib/workspaceGroupChat";
import type { WorkspaceChatMessage } from "@/lib/workspaceChatRealtime";
import {
  mergeDirectMessages,
  canModifyDirectMessage,
  isDirectMessageDeleted,
  WORKSPACE_DM_TYPING_EVENT,
  WORKSPACE_DM_SETTINGS_EVENT,
  type DirectChatMessage,
  type DirectChatThread,
} from "@/lib/workspaceDirectChatRealtime";
import { useTypingEmitter, useTypingListener } from "@/hooks/useChatTyping";
import { refreshMessagesUnreadBadge } from "@/lib/messagesUnreadEvents";
import { websocketManager } from "@/lib/websocketManager";

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
  const [chatInfoOpen, setChatInfoOpen] = useState(false);
  const [disappearingDurationSec, setDisappearingDurationSec] = useState(0);
  const [groupPreview, setGroupPreview] = useState<{
    messageId: string | null;
    body: string;
    at: string | null;
    senderUserId: string | null;
  }>({ messageId: null, body: "", at: null, senderUserId: null });

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const markingReadRef = useRef(false);
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

  useEffect(() => {
    if (!dmTypingUsers.length || !stickToBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [dmTypingUsers.length, scrollToBottom]);

  /** WhatsApp-style: keep the latest bubble visible while the keyboard animates up. */
  const keepLastMessageVisible = useCallback(() => {
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    const run = () => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };
    run();
    requestAnimationFrame(run);
    window.setTimeout(run, 50);
    window.setTimeout(run, 150);
    window.setTimeout(run, 320);
  }, []);

  // Keep the latest message visible when the keyboard shrinks the list.
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [conversationId, selectedUserId]);

  useEffect(() => {
    if (!conversationId) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onViewportChange = () => {
      if (stickToBottomRef.current) {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
    return () => {
      vv.removeEventListener("resize", onViewportChange);
      vv.removeEventListener("scroll", onViewportChange);
    };
  }, [conversationId]);

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
    requestAnimationFrame(() => scrollToBottom("auto"));
    // Avoid auto-opening the soft keyboard on mobile when entering a chat.
    if (typeof window !== "undefined" && window.innerWidth < 1024) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [conversationId, selectedUserId, scrollToBottom]);

  useEffect(() => {
    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "OPEN_DIRECT_CHAT") return;
      const otherUserId = event.data.otherUserId ? String(event.data.otherUserId) : "";
      if (otherUserId) {
        navigate(`/messages/${otherUserId}`);
      } else {
        navigate("/messages");
      }
    };

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, [navigate]);

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
    if (!trimmed || !chatWorkspaceId || !conversationId || sending) {
      return;
    }

    stopDmTyping();

    if (editingMessageId) {
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
      }
      return;
    }

    if (!trimmed || !chatWorkspaceId || !conversationId || sending) {
      return;
    }

    const optimisticId = `pending-${Date.now()}`;
    const optimisticReply = replyTo;
    const optimisticMessage: DirectChatMessage = {
      _id: optimisticId,
      conversationId,
      workspaceId: chatWorkspaceId,
      senderUserId: currentUserId || "",
      senderName: currentUser?.name || "You",
      senderProfilePictureUrl: currentUser?.profilePictureUrl || null,
      body: trimmed,
      replyTo: optimisticReply,
      attachments: [],
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setReplyTo(null);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    setSending(true);
    try {
      const res = await workspaceApi.sendDirectChatMessage(
        chatWorkspaceId,
        conversationId,
        trimmed,
        [],
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
        // Keep the optimistic quote if the API response was empty.
        setMessages((prev) =>
          prev.map((row) =>
            String(row._id) === optimisticId ? { ...row, replyTo: optimisticReply } : row,
          ),
        );
      }
    } catch {
      setMessages((prev) => prev.filter((row) => String(row._id) !== optimisticId));
      setText(trimmed);
      if (optimisticReply) setReplyTo(optimisticReply);
      toast({ title: t("directChatSendFailed"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async ({ file, duration, waveform }: VoiceNoteSendPayload) => {
    if (!chatWorkspaceId || !conversationId || sending || editingMessageId) return;

    stopDmTyping();
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
    if (event.key === "Enter" && !event.shiftKey) {
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
    <div className="workspace-chat flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      {/* People list */}
      <aside
        className={cn(
          "flex h-full min-h-0 w-full shrink-0 flex-col self-stretch border-r border-gray-200/80 bg-gray-50 lg:w-80",
          showThreadOnMobile && "hidden lg:flex",
        )}
      >
        <div className="border-b border-gray-200/80 px-4 py-3 max-lg:pt-[max(0.75rem,env(safe-area-inset-top))] lg:py-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 lg:text-lg">
            {t("directChatTitle")}
          </h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("directChatSearchPeople")}
              className="w-full rounded-full border border-gray-200/80 bg-white py-2.5 pl-9 pr-3 text-[15px] text-gray-900 outline-none ring-sky-300 focus:ring-2 lg:py-2 lg:text-sm"
            />
          </div>
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
                        ? "bg-sky-100 text-gray-900 hover:bg-sky-100"
                        : "hover:bg-white/70 active:bg-white",
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
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {activeWorkspace.name}
                        </p>
                        {groupPreview.at ? (
                          <span
                            className={cn(
                              "shrink-0 text-[10px]",
                              showGroupChat ? "text-sky-700/70" : "text-gray-400",
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
                            showGroupChat ? "text-sky-800/70" : "text-gray-500",
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
                      ? "bg-sky-100 text-gray-900 hover:bg-sky-100"
                      : "hover:bg-white/70 active:bg-white",
                    thread.unreadCount > 0 && !active && "bg-[#5B2EFF]/[0.04]",
                  )}
                >
                  <PresenceAvatar
                    name={thread.otherUser.name}
                    profilePictureUrl={thread.otherUser.profilePictureUrl}
                    className="h-11 w-11 shrink-0"
                    fallbackClassName="bg-sky-400 text-xs font-bold text-white"
                    online={isOnline(thread.otherUser.userId)}
                    disappearing={Number(thread.disappearingDurationSec) > 0}
                    ringClassName={active ? "ring-sky-100" : "ring-gray-50"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {thread.otherUser.nickname ||
                          thread.otherUser.displayName ||
                          thread.otherUser.name}
                      </p>
                        {thread.workspaceName ? (
                          <p
                            className={cn(
                              "truncate text-[10px] font-medium",
                              active ? "text-sky-700" : "text-sky-600",
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
                            active ? "text-sky-700/70" : "text-gray-400",
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
                            ? "text-sky-800/70"
                            : thread.unreadCount > 0
                              ? "font-semibold text-gray-800"
                              : "text-gray-500",
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
          "relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white",
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
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-gray-500">
            <img src="/chat.png" alt="" className="h-16 w-16 opacity-80" />
            <p className="text-base font-medium text-gray-800">{t("directChatSelectPerson")}</p>
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
            <div className="flex shrink-0 items-center gap-2 border-b border-sky-100 bg-white/95 px-2 py-2.5 backdrop-blur-sm max-lg:pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-4 lg:py-3">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sky-600 active:bg-sky-50 lg:hidden"
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
                ringClassName="ring-white"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-gray-900">
                  {selectedThread.otherUser.nickname ||
                    selectedThread.otherUser.displayName ||
                    selectedThread.otherUser.name}
                </p>
                <p
                  className={cn(
                    "truncate text-xs",
                    selectedPeerOnline ? "font-medium text-emerald-600" : "text-gray-500",
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
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <img src={CHAT_BG_IMAGE} alt="" className="h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-white/96" />
              </div>

              <div
                ref={listRef}
                onScroll={handleListScroll}
                className="relative z-10 h-full w-full overflow-y-auto overscroll-contain px-3 pb-28 pt-4 scroll-smooth max-lg:pb-24 sm:px-4 lg:pb-44"
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
                              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
                                {formatDateDivider(message.createdAt)}
                              </span>
                            </div>
                          ) : null}
                          <div className="my-4 flex justify-center">
                            <span className="max-w-[min(100%,22rem)] rounded-full bg-white/90 px-3 py-1 text-center text-[11px] font-medium leading-snug text-gray-500 shadow-sm">
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
                    if (!deleted && !message.body?.trim() && !hasAttachments) return null;

                    return (
                      <div key={String(message._id)} data-chat-message-id={String(message._id)} className="rounded-xl transition-shadow">
                        {shouldShowDateDivider(messages, index) ? (
                          <div className="my-4 flex justify-center">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
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
                            <UserProfileAvatar
                              name={message.senderName}
                              profilePictureUrl={
                                message.senderProfilePictureUrl ||
                                selectedThread.otherUser.profilePictureUrl
                              }
                              className="mr-2 mt-auto h-7 w-7 shrink-0 self-end lg:mr-3 lg:h-8 lg:w-8"
                              fallbackClassName="bg-sky-100 text-[8px] font-semibold text-sky-700"
                            />
                          ) : null}

                          <ChatInteractiveBubble
                            own={own}
                            disabled={deleted}
                            actionsTitle={t("chatMessageActions")}
                            onReply={() => startReply(message)}
                            className="min-w-0 max-w-[85%]"
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
                                "rounded-[1.15rem] px-3 py-1.5 text-sm leading-snug shadow-sm",
                              deleted
                                ? own
                                  ? "rounded-br-md bg-gray-200 text-gray-500"
                                  : "rounded-bl-md bg-[#F4F4F5] text-gray-400"
                                : own
                                  ? "rounded-br-md text-white"
                                  : "rounded-bl-md bg-[#F4F4F5] text-gray-800",
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
                                  {message.body ? (
                              <p className="whitespace-pre-wrap break-words">
                                <ChatEmojiText text={message.body} />
                              </p>
                            ) : null}
                                </>
                              )}
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
                  className="absolute bottom-32 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-sky-100 max-lg:bottom-28 lg:bottom-44 lg:h-10 lg:w-10"
                  aria-label={t("directChatScrollDown")}
                >
                  <ChevronDown size={18} />
                </button>
              ) : null}

              {/* Floating composer — sits above native soft keyboard via visualViewport shell */}
              <div
                data-chat-composer
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 z-20",
                  "bg-gradient-to-t from-white via-white/95 to-transparent",
                  "px-2 pt-6 max-lg:pt-4",
                  "chat-composer-pad",
                  "lg:bg-[#f0f2f5] lg:bg-none lg:px-3 lg:pb-0 lg:pt-4",
                )}
              >
                <div className="pointer-events-auto w-full">
              {editingMessageId ? (
                    <div className="mb-2 flex min-h-11 items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-black/5">
                  <span>{t("directChatEditing")}</span>
                  <button
                    type="button"
                    onClick={cancelEdit}
                        className="min-h-9 px-2 font-medium text-sky-600 hover:text-sky-700"
                  >
                    {t("directChatCancelEdit")}
                  </button>
                </div>
                  ) : replyTo ? (
                    <div className="mb-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                      <ChatReplyComposerBar
                        replyTo={replyTo}
                        title={t("chatReplyingTo")}
                        deletedLabel={t("directChatMessageDeleted")}
                        cancelLabel={t("chatCancelReply")}
                        onCancel={cancelReply}
                      />
                    </div>
              ) : null}
                  <div
                    className={cn(
                      "flex items-end gap-1.5 rounded-[1.75rem] border border-gray-300 bg-white px-2.5 py-1.5 shadow-[0_0_6px_rgba(0,0,0,0.12)] sm:gap-2 sm:px-4 max-lg:min-h-[3rem]",
                      "lg:rounded-lg lg:border-0 lg:py-2 lg:shadow-none lg:ring-1 lg:ring-black/5",
                      voiceRecording && "border-transparent bg-transparent p-0 shadow-none ring-0",
                    )}
                  >
                    {!voiceRecording ? (
                      <ChatEmojiPicker
                        label={t("chatEmoji")}
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
                <textarea
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
                        }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                        inputMode="text"
                        enterKeyHint="send"
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        spellCheck
                  placeholder={t("workspaceChatSend")}
                        className="max-h-[180px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-5 outline-none placeholder:text-gray-400 lg:min-h-[44px] lg:py-2.5 lg:text-[15px]"
                      />
                    ) : null}
                    {!text.trim() && !editingMessageId ? (
                      <ChatVoiceRecorderButton
                        className={voiceRecording ? "w-full" : "max-lg:h-11 max-lg:w-11"}
                        disabled={sending || !conversationId || Boolean(editingMessageId)}
                        recordingLabel={t("chatVoiceRecording")}
                        cancelLabel={t("chatVoiceCancel")}
                        sendLabel={t("chatVoiceSend")}
                        micLabel={t("chatVoiceRecord")}
                        permissionDeniedLabel={t("chatVoicePermissionDenied")}
                        onRecordingChange={setVoiceRecording}
                        onError={(message) =>
                          toast({ title: message, variant: "destructive" })
                        }
                        onSend={handleSendVoice}
                      />
                    ) : !voiceRecording ? (
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!text.trim() || sending || Boolean(editingMessageId && !text.trim())}
                        className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40 lg:h-10 lg:w-10"
                  style={{ backgroundColor: CHAT_PURPLE }}
                  aria-label={t("workspaceChatSend")}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                          <Send size={16} className={text.trim() ? "translate-x-px" : undefined} />
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
        contentClassName="top-1/2 max-w-sm -translate-y-1/2 rounded-2xl border border-gray-200 shadow-xl data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0"
        cancelClassName="rounded-full"
        confirmClassName="rounded-full"
      />
    </div>
  );
}
