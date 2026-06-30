import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Check, CheckCheck, Loader2, MoreVertical, Pencil, Search, Send, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useDirectChatSocket } from "@/hooks/useDirectChatSocket";
import {
  mergeDirectMessages,
  canModifyDirectMessage,
  isDirectMessageDeleted,
  type DirectChatMessage,
  type DirectChatThread,
} from "@/lib/workspaceDirectChatRealtime";

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
  return readByOther ? "read" : "sent";
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
  return message.body?.trim() || "";
}

function latestDirectMessage(messages: DirectChatMessage[]) {
  if (!messages.length) return null;
  return messages.reduce((latest, row) =>
    new Date(row.createdAt).getTime() > new Date(latest.createdAt).getTime() ? row : latest,
  );
}

function ReadReceiptIcon({ state }: { state: "sent" | "read" }) {
  if (state === "read") {
    return <CheckCheck size={12} className="text-sky-500" aria-hidden />;
  }
  return <Check size={12} className="text-gray-300" aria-hidden />;
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
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<DirectChatMessage | null>(null);

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

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter(
      (thread) =>
        thread.otherUser.name.toLowerCase().includes(query) ||
        thread.otherUser.email.toLowerCase().includes(query),
    );
  }, [threads, search]);

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
      return;
    }
    void loadThreads();
  }, [mode, workspaceId, loadThreads]);

  useEffect(() => {
    if (!selectedUserId || mode !== "workspace" || !workspaceId) {
      loadedSelectionRef.current = null;
      setConversationId(null);
      setMessages([]);
      setEditingMessageId(null);
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
  }, [selectedUserId, mode, workspaceId, threads, openChatWithUser, loadMessages, loadThreads]);

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

      setThreads((prev) => {
        const otherUserId = isOwnMessage(message, currentUserId)
          ? activeOtherUserId
          : String(message.senderUserId);

        const next = prev.map((thread) => {
          if (thread.otherUser.userId !== otherUserId && thread.conversationId !== message.conversationId) {
            return thread;
          }
          const isActive =
            thread.otherUser.userId === activeOtherUserId ||
            thread.conversationId === message.conversationId;
          const incrementUnread =
            !isOwnMessage(message, currentUserId) &&
            !isActive &&
            !hasUserRead(message, currentUserId);

          return {
            ...thread,
            conversationId: thread.conversationId || String(message.conversationId),
            lastMessageAt: message.createdAt,
            lastMessageBody: messagePreviewText(message, t("directChatMessageDeleted")),
            lastSenderUserId: String(message.senderUserId),
            unreadCount: incrementUnread ? thread.unreadCount + 1 : isActive ? 0 : thread.unreadCount,
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
    onRead: (message) => {
      if (conversationIdRef.current && String(message.conversationId) === conversationIdRef.current) {
        setMessages((prev) => mergeDirectMessages(prev, message));
      }
    },
    onEdit: (message) => {
      if (conversationIdRef.current && String(message.conversationId) === conversationIdRef.current) {
        setMessages((prev) => {
          const next = mergeDirectMessages(prev, message);
          syncThreadPreviewFromMessages(String(message.conversationId), next);
          return next;
        });
      }
    },
    onDelete: (message) => {
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
    if (!trimmed || !workspaceId || !conversationId || sending || uploadingAttachment) {
      return;
    }

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
    const optimisticMessage: DirectChatMessage = {
      _id: optimisticId,
      conversationId,
      workspaceId,
      senderUserId: currentUserId || "",
      senderName: currentUser?.name || "You",
      senderProfilePictureUrl: currentUser?.profilePictureUrl || null,
      body: trimmed,
      attachments: [],
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    requestAnimationFrame(() => scrollToBottom("smooth"));

    setSending(true);
    try {
      const res = await workspaceApi.sendDirectChatMessage(
        workspaceId,
        conversationId,
        trimmed,
        [],
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
            thread.otherUser.userId === selectedUserId
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
      setText(trimmed);
      toast({ title: t("directChatSendFailed"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const startEdit = (message: DirectChatMessage) => {
    setEditingMessageId(String(message._id));
    setText(message.body || "");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setText("");
  };

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

  return (
    <div className="workspace-chat flex h-full min-h-0 overflow-hidden bg-white">
      {/* People list */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-gray-200/80 bg-gray-50/95 lg:w-80",
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
          ) : filteredThreads.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">{t("directChatNoPeople")}</p>
          ) : (
            filteredThreads.map((thread) => {
              const active = thread.otherUser.userId === selectedUserId;
              const preview =
                thread.lastMessageBody ||
                (active ? t("directChatStartConversation") : t("directChatTapToChat"));
              const previewPrefix =
                thread.lastSenderUserId === currentUserId ? `${t("directChatYou")}: ` : "";

              return (
                <button
                  key={thread.otherUser.userId}
                  type="button"
                  onClick={() => navigate(`/messages/${thread.otherUser.userId}`)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-gray-200/60 px-4 py-3 text-left transition-colors hover:bg-white/70",
                    active && "bg-white",
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
                      <p className="truncate text-xs text-gray-500">
                        {previewPrefix}
                        {preview}
                      </p>
                      {thread.unreadCount > 0 ? (
                        <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[#5B2EFF] px-1 text-[10px] font-bold text-white">
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
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
          "relative flex min-w-0 flex-1 flex-col bg-white",
          !showThreadOnMobile && "hidden lg:flex",
        )}
      >
        {!selectedUserId || !selectedThread ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-gray-500">
            <img src="/chat.png" alt="" className="h-16 w-16 opacity-80" />
            <p className="text-base font-medium text-gray-800">{t("directChatSelectPerson")}</p>
            <p className="max-w-sm text-sm">{t("directChatSelectPersonHint")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-sky-100 px-4 py-3">
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
                className="relative z-10 h-full overflow-y-auto px-4 py-5 scroll-smooth"
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
                      <div key={String(message._id)}>
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

                          {own && canModify ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="mb-1 mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-70 transition-opacity hover:bg-gray-100 hover:text-gray-600 hover:opacity-100"
                                  aria-label={t("directChatEdit")}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canEdit ? (
                                  <DropdownMenuItem onClick={() => startEdit(message)}>
                                    <Pencil size={14} className="mr-2" />
                                    {t("directChatEdit")}
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem
                                  className="text-red-600"
                                  disabled={deletingMessageId === String(message._id)}
                                  onClick={() => setMessageToDelete(message)}
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  {t("directChatDelete")}
                                </DropdownMenuItem>
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
                    );
                  })
                )}
              </div>

              {showScrollDown ? (
                <button
                  type="button"
                  onClick={() => scrollToBottom("smooth")}
                  className="absolute bottom-24 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-sky-100"
                  aria-label={t("directChatScrollDown")}
                >
                  <ChevronDown size={18} />
                </button>
              ) : null}
            </div>

            <div className="border-t border-sky-100 bg-white px-3 py-3">
              {editingMessageId ? (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2 text-sm text-gray-700">
                  <span>{t("directChatEditing")}</span>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="font-medium text-sky-600 hover:text-sky-700"
                  >
                    {t("directChatCancelEdit")}
                  </button>
                </div>
              ) : null}
              <div className="flex items-end gap-2 rounded-[1.75rem] border border-sky-100 bg-sky-50/50 px-3 py-2 sm:px-4">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={t("workspaceChatSend")}
                  className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!text.trim() || sending || Boolean(editingMessageId && !text.trim())}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: CHAT_PURPLE }}
                  aria-label={t("workspaceChatSend")}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send size={15} className={text.trim() ? "translate-x-px" : undefined} />
                  )}
                </button>
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
