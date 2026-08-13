import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Check, CheckCheck, Loader2, MoreVertical, Pencil, Reply, Search, Send, Trash2 } from "lucide-react";
import { workspaceApi } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { WorkspaceProfileAvatar } from "@/components/workspace/WorkspaceProfileAvatar";
import { WorkspaceGroupChatPane } from "@/components/workspace/WorkspaceGroupChatPane";
import {
  ChatReplyComposerBar,
  ChatReplyQuote,
  normalizeReplyTo,
  scrollChatToMessage,
  type ChatReplyTo,
} from "@/components/workspace/ChatReplyQuote";
import { ChatEmojiPicker, insertEmojiInText } from "@/components/workspace/ChatEmojiPicker";
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
  type DirectChatMessage,
  type DirectChatThread,
} from "@/lib/workspaceDirectChatRealtime";
import { formatTypingLabel, useTypingEmitter, useTypingListener } from "@/hooks/useChatTyping";
import { refreshMessagesUnreadBadge } from "@/lib/messagesUnreadEvents";

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
  if (!message.replyTo?.messageId) return body;
  const replyName = String(message.replyTo.senderName || "").trim();
  if (!body) return replyName ? `↩ ${replyName}` : "↩";
  return replyName ? `↩ ${replyName}: ${body}` : `↩ ${body}`;
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
  const next = prev.map((thread) => {
    const matchesPeer =
      Boolean(peerUserId) && String(thread.otherUser.userId) === String(peerUserId);
    const matchesConversation =
      Boolean(conversationKey) &&
      thread.conversationId != null &&
      String(thread.conversationId) === conversationKey;
    if (!matchesPeer && !matchesConversation) return thread;

    matched = true;
    const isThisOpen =
      Boolean(activeOtherUserId) &&
      String(thread.otherUser.userId) === String(activeOtherUserId);

    return {
      ...thread,
      conversationId: thread.conversationId || conversationKey || null,
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
  const { mode, activeWorkspace } = useWorkspace();
  const { user: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId: selectedUserId } = useParams<{ userId?: string }>();

  const workspaceId = activeWorkspace?.id || "";
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

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.otherUser.userId === selectedUserId) || null,
    [threads, selectedUserId],
  );

  const dmTypingEnabled = Boolean(
    mode === "workspace" &&
      workspaceId &&
      selectedUserId &&
      !isGroupChat,
  );
  const { onComposerChange: notifyDmTyping, stopTyping: stopDmTyping } = useTypingEmitter({
    enabled: dmTypingEnabled,
    eventType: WORKSPACE_DM_TYPING_EVENT,
    buildPayload: (isTyping) => ({
      workspaceId,
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
    scopeKey: `${conversationId || ""}:${selectedUserId || ""}`,
    matches: (payload) => {
      if (String(payload.workspaceId || "") !== String(workspaceId)) return false;
      if (conversationId && payload.conversationId) {
        return String(payload.conversationId) === String(conversationId);
      }
      return (
        String(payload.userId || payload.peerUserId || "") === String(selectedUserId || "")
      );
    },
  });
  const dmTypingLabel = formatTypingLabel(dmTypingUsers, t);

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = !query
      ? threads
      : threads.filter(
          (thread) =>
            thread.otherUser.name.toLowerCase().includes(query) ||
            thread.otherUser.email.toLowerCase().includes(query),
        );

    return [...list].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.otherUser.name.localeCompare(b.otherUser.name);
    });
  }, [threads, search]);

  const showGroupInList = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const workspaceName = (activeWorkspace?.name || "").toLowerCase();
    return (
      workspaceName.includes(query) ||
      t("workspaceChatTitle").toLowerCase().includes(query) ||
      (groupPreview.body || "").toLowerCase().includes(query)
    );
  }, [search, activeWorkspace?.name, groupPreview.body, t]);

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

  const loadThreads = useCallback(async () => {
    if (!workspaceId) return;
    setThreadsLoading(true);
    try {
      const res = await workspaceApi.getDirectChatThreads(workspaceId);
      setThreads((res.data as DirectChatThread[]) || []);
    } catch {
      toast({ title: t("directChatLoadThreadsFailed"), variant: "destructive" });
    } finally {
      setThreadsLoading(false);
    }
  }, [workspaceId, toast, t]);

  const openChatWithUser = useCallback(
    async (otherUserId: string) => {
      if (!workspaceId || !otherUserId) return null;
      setOpeningChat(true);
      try {
        const res = await workspaceApi.openDirectChat(workspaceId, otherUserId);
        const data = res.data as { conversationId: string };
        const id = data?.conversationId || null;
        setConversationId(id);
        return id;
      } catch {
        toast({ title: t("directChatOpenFailed"), variant: "destructive" });
        return null;
      } finally {
        setOpeningChat(false);
      }
    },
    [workspaceId, toast, t],
  );

  const loadMessages = useCallback(
    async (activeConversationId: string) => {
      if (!workspaceId || !activeConversationId) return;
      setMessagesLoading(true);
      try {
        const res = await workspaceApi.getDirectChatMessages(workspaceId, activeConversationId, {
          limit: 50,
        });
        setMessages((res.data as DirectChatMessage[]) || []);
        markedReadIdsRef.current = new Set();
      } catch {
        toast({ title: t("directChatLoadFailed"), variant: "destructive" });
      } finally {
        setMessagesLoading(false);
      }
    },
    [workspaceId, toast, t],
  );

  const markMessagesRead = useCallback(
    async (ids: string[], activeConversationId: string) => {
      if (!workspaceId || !activeConversationId || !ids.length || markingReadRef.current) return;

      const pending = ids.filter((id) => !markedReadIdsRef.current.has(id));
      if (!pending.length) return;

      pending.forEach((id) => markedReadIdsRef.current.add(id));
      markingReadRef.current = true;
      try {
        const res = await workspaceApi.markDirectChatMessagesRead(
          workspaceId,
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
    [workspaceId],
  );

  useEffect(() => {
    if (mode !== "workspace" || !workspaceId) {
      setThreads([]);
      setMessages([]);
      setConversationId(null);
      setGroupPreview({ messageId: null, body: "", at: null, senderUserId: null });
      return;
    }
    void loadThreads();
  }, [mode, workspaceId, loadThreads]);

  useEffect(() => {
    if (mode !== "workspace" || !workspaceId) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await workspaceApi.getMessages(workspaceId, { limit: 1 });
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
  }, [mode, workspaceId, t]);

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

  useWorkspaceChatSocket(workspaceId, mode === "workspace" && Boolean(workspaceId), {
    onMessage: applyGroupPreviewFromMessage,
    onEdit: applyGroupPreviewFromMessage,
    onDelete: applyGroupPreviewFromMessage,
  });

  useEffect(() => {
    if (!selectedUserId || isGroupChat || mode !== "workspace" || !workspaceId) {
      loadedSelectionRef.current = null;
      setConversationId(null);
      setMessages([]);
      setEditingMessageId(null);
      setReplyTo(null);
      setMessageToDelete(null);
      return;
    }

    const selectionKey = `${workspaceId}:${selectedUserId}`;
    if (loadedSelectionRef.current === selectionKey) return;

    const existing = threads.find((thread) => thread.otherUser.userId === selectedUserId);

    void (async () => {
      loadedSelectionRef.current = selectionKey;
      if (existing?.conversationId) {
        setConversationId(existing.conversationId);
        await loadMessages(existing.conversationId);
        return;
      }

      const id = await openChatWithUser(selectedUserId);
      if (id) {
        setConversationId(id);
        await loadMessages(id);
        void loadThreads();
      } else {
        loadedSelectionRef.current = null;
      }
    })();
  }, [
    selectedUserId,
    isGroupChat,
    mode,
    workspaceId,
    threads,
    openChatWithUser,
    loadMessages,
    loadThreads,
  ]);

  useEffect(() => {
    if (!conversationId || messagesLoading) return;

    const unreadIds = messages
      .filter((message) => !isOwnMessage(message, currentUserId))
      .filter((message) => !hasUserRead(message, currentUserId))
      .filter((message) => !markedReadIdsRef.current.has(String(message._id)))
      .map((message) => String(message._id));

    if (unreadIds.length) {
      void markMessagesRead(unreadIds, conversationId);
    }
  }, [conversationId, messages, messagesLoading, currentUserId, markMessagesRead]);

  useEffect(() => {
    if (!conversationId) return;
    requestAnimationFrame(() => scrollToBottom("auto"));
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

  useDirectChatSocket(workspaceId, mode === "workspace" && Boolean(workspaceId), {
    onMessage: (message) => {
      const activeConversationId = conversationIdRef.current;
      const activeOtherUserId = selectedUserIdRef.current;

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

        if (!isOwnMessage(message, currentUserId)) {
          void markMessagesRead([String(message._id)], activeConversationId);
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
    if (!trimmed || !workspaceId || !conversationId || sending) {
      return;
    }

    stopDmTyping();

    if (editingMessageId) {
      setSending(true);
      try {
        const res = await workspaceApi.editDirectChatMessage(
          workspaceId,
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

    if (!trimmed || !workspaceId || !conversationId || sending) {
      return;
    }

    const optimisticId = `pending-${Date.now()}`;
    const optimisticReply = replyTo;
    const optimisticMessage: DirectChatMessage = {
      _id: optimisticId,
      conversationId,
      workspaceId,
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
        workspaceId,
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
            thread.otherUser.userId === selectedUserId
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
    requestAnimationFrame(() => inputRef.current?.focus());
  };

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
    if (!messageToDelete || !workspaceId || !conversationId || deletingMessageId) return;

    const messageId = String(messageToDelete._id);
    setDeletingMessageId(messageId);
    try {
      const res = await workspaceApi.deleteDirectChatMessage(
        workspaceId,
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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  if (mode !== "workspace" || !activeWorkspace?.id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-center text-gray-600">
        <p className="text-lg font-medium text-gray-900">{t("directChatWorkspaceOnlyTitle")}</p>
        <p className="max-w-md text-sm">{t("directChatWorkspaceOnlyBody")}</p>
      </div>
    );
  }

  const showThreadOnMobile = Boolean(selectedUserId);
  const showGroupChat = isGroupChat;
  const showDirectChat = Boolean(selectedUserId && selectedThread && !isGroupChat);

  return (
    <div className="workspace-chat flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      {/* People list */}
      <aside
        className={cn(
          "flex h-full min-h-0 w-full shrink-0 flex-col self-stretch border-r border-gray-200/80 bg-gray-50 lg:w-80",
          showThreadOnMobile && "hidden lg:flex",
        )}
      >
        <div className="border-b border-gray-200/80 px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">{t("directChatTitle")}</h1>
          <p className="text-xs text-gray-500">{activeWorkspace.name}</p>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("directChatSearchPeople")}
              className="w-full rounded-full border border-gray-200/80 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none ring-sky-300 focus:ring-2"
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
                return (
                  <button
                    key="workspace-group-chat"
                    type="button"
                    onClick={() => navigate(WORKSPACE_GROUP_CHAT_PATH)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-gray-200/60 px-4 py-3 text-left transition-colors hover:bg-white/70",
                      showGroupChat && "bg-white",
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
                          <span className="shrink-0 text-[10px] text-gray-400">
                            {formatThreadTime(groupPreview.at)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-gray-500">
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
              const active = thread.otherUser.userId === selectedUserId;
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
                  key={thread.otherUser.userId}
                  type="button"
                  onClick={() => {
                    // Show as read immediately in the list when opening.
                    setThreads((prev) =>
                      prev.map((row) =>
                        row.otherUser.userId === thread.otherUser.userId
                          ? { ...row, unreadCount: 0 }
                          : row,
                      ),
                    );
                    navigate(`/messages/${thread.otherUser.userId}`);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-gray-200/60 px-4 py-3 text-left transition-colors hover:bg-white/70",
                    active && "bg-white",
                    thread.unreadCount > 0 && !active && "bg-[#5B2EFF]/[0.04]",
                  )}
                >
                  <UserProfileAvatar
                    name={thread.otherUser.name}
                    profilePictureUrl={thread.otherUser.profilePictureUrl}
                    className="h-11 w-11 shrink-0"
                    fallbackClassName="bg-sky-400 text-xs font-bold text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {thread.otherUser.name}
                      </p>
                      {thread.lastMessageAt ? (
                        <span className="shrink-0 text-[10px] text-gray-400">
                          {formatThreadTime(thread.lastMessageAt)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-xs",
                          thread.unreadCount > 0
                            ? "font-semibold text-gray-800"
                            : "text-gray-500",
                        )}
                      >
                        {previewPrefix}
                        {preview}
                      </p>
                      {thread.unreadCount > 0 ? (
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
      >
        {showGroupChat ? (
          <WorkspaceGroupChatPane
            active
            variant="page"
            className="h-full"
            onBack={() => navigate("/messages")}
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
            <div className="flex shrink-0 items-center gap-3 border-b border-sky-100 px-4 py-3">
              <button
                type="button"
                className="rounded-full px-2 py-1 text-sm text-sky-600 hover:bg-sky-50 lg:hidden"
                onClick={() => navigate("/messages")}
              >
                ←
              </button>
              <UserProfileAvatar
                name={selectedThread.otherUser.name}
                profilePictureUrl={selectedThread.otherUser.profilePictureUrl}
                className="h-10 w-10"
                fallbackClassName="bg-sky-400 text-xs font-bold text-white"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {selectedThread.otherUser.name}
                </p>
                <p className="truncate text-xs text-gray-500">{selectedThread.otherUser.email}</p>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <img src={CHAT_BG_IMAGE} alt="" className="h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-white/96" />
              </div>

              <div
                ref={listRef}
                onScroll={handleListScroll}
                className="relative z-10 h-full overflow-y-auto px-4 pb-32 pt-5 scroll-smooth"
              >
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
                    const own = isOwnMessage(message, currentUserId);
                    const grouped = shouldGroupWithPrevious(messages, index, currentUserId);
                    const deleted = isDirectMessageDeleted(message);
                    const canModify = canModifyDirectMessage(message, currentUserId);
                    const canEdit = canModify && Boolean(message.body?.trim());
                    if (!deleted && !message.body?.trim()) return null;

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
                            "flex w-full items-end",
                            own ? "justify-end" : "justify-start",
                            grouped ? "mt-1" : "mt-3",
                          )}
                        >
                          {!own && !grouped ? (
                            <UserProfileAvatar
                              name={message.senderName}
                              profilePictureUrl={
                                message.senderProfilePictureUrl ||
                                selectedThread.otherUser.profilePictureUrl
                              }
                              className="mr-2 mt-auto h-7 w-7 shrink-0"
                              fallbackClassName="bg-sky-100 text-[8px] font-semibold text-sky-700"
                            />
                          ) : !own ? (
                            <div className="mr-2 w-7 shrink-0" />
                          ) : null}

                          <div className={cn("flex items-end gap-1", own && "flex-row-reverse")}>
                            {!deleted ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-70 transition-opacity hover:bg-gray-100 hover:text-gray-600 hover:opacity-100"
                                    aria-label={t("chatReply")}
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={own ? "end" : "start"}>
                                  <DropdownMenuItem onClick={() => startReply(message)}>
                                    <Reply size={14} className="mr-2" />
                                    {t("chatReply")}
                                  </DropdownMenuItem>
                                  {own && canEdit ? (
                                    <DropdownMenuItem onClick={() => startEdit(message)}>
                                      <Pencil size={14} className="mr-2" />
                                      {t("directChatEdit")}
                                    </DropdownMenuItem>
                                  ) : null}
                                  {own && canModify ? (
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      disabled={deletingMessageId === String(message._id)}
                                      onClick={() => setMessageToDelete(message)}
                                    >
                                      <Trash2 size={14} className="mr-2" />
                                      {t("directChatDelete")}
                                    </DropdownMenuItem>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}

                            <div
                              className={cn(
                                "max-w-[78%] rounded-[1.15rem] px-3.5 py-2 text-sm leading-relaxed shadow-sm",
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
                              ) : message.body ? (
                                <p className="whitespace-pre-wrap break-words">{message.body}</p>
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
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {showScrollDown ? (
                <button
                  type="button"
                  onClick={() => scrollToBottom("smooth")}
                  className="absolute bottom-[5.5rem] right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-sky-100"
                  aria-label={t("directChatScrollDown")}
                >
                  <ChevronDown size={18} />
                </button>
              ) : null}

              {/* Floating composer — single white row with space above screen bottom */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(2.25rem,calc(2rem+env(safe-area-inset-bottom)))] pt-1">
                <div className="pointer-events-auto mx-auto w-full max-w-3xl">
                  {dmTypingLabel ? (
                    <p className="mb-1.5 px-2 text-xs italic text-gray-500" aria-live="polite">
                      {dmTypingLabel}
                    </p>
                  ) : null}
                  {editingMessageId ? (
                    <div className="mb-1.5 flex items-center justify-between rounded-2xl bg-white/95 px-3 py-2 text-sm text-gray-700 shadow-sm">
                      <span>{t("directChatEditing")}</span>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="font-medium text-sky-600 hover:text-sky-700"
                      >
                        {t("directChatCancelEdit")}
                      </button>
                    </div>
                  ) : replyTo ? (
                    <div className="mb-1.5 overflow-hidden rounded-2xl bg-white/95 shadow-sm">
                      <ChatReplyComposerBar
                        replyTo={replyTo}
                        title={t("chatReplyingTo")}
                        deletedLabel={t("directChatMessageDeleted")}
                        cancelLabel={t("chatCancelReply")}
                        onCancel={cancelReply}
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-2.5 shadow-[0_0_6px_rgba(0,0,0,0.12)] sm:gap-2 sm:px-4">
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
                        requestAnimationFrame(() => scrollToBottom("auto"));
                      }}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder={t("workspaceChatSend")}
                      className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-5 outline-none placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={!text.trim() || sending || Boolean(editingMessageId && !text.trim())}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: CHAT_PURPLE }}
                      aria-label={t("workspaceChatSend")}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send size={16} className={text.trim() ? "translate-x-px" : undefined} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

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
