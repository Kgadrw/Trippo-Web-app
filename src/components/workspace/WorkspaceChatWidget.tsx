import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLocation } from "react-router-dom";
import {
  Send,
  Loader2,
  X,
  ChevronDown,
  Check,
  CheckCheck,
  MoreHorizontal,
} from "lucide-react";
import { workspaceApi } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { WorkspaceProfileAvatar } from "@/components/workspace/WorkspaceProfileAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  mergeChatMessages,
  type WorkspaceChatMessage,
  type WorkspaceChatReceipt,
} from "@/lib/workspaceChatRealtime";
import { useWorkspaceChatPanel, WORKSPACE_CHAT_SIDEBAR_WIDTH } from "@/hooks/useWorkspaceChatPanel";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import { useWorkspaceChatSocket } from "@/hooks/useWorkspaceChatSocket";
import { WorkspaceActiveUsersRow } from "@/components/workspace/WorkspaceActiveUsersRow";
import { WorkspaceChatMentionMenu } from "@/components/workspace/WorkspaceChatMentionMenu";
import { WorkspaceChatMessageBody } from "@/components/workspace/WorkspaceChatMessageBody";
import {
  buildMentionsFromBody,
  filterMentionOptions,
  getActiveMentionQuery,
  type MentionMenuOption,
} from "@/lib/workspaceChatMentions";

const GROUP_GAP_MS = 5 * 60 * 1000;
const SCROLL_NEAR_BOTTOM_PX = 96;
const MAX_READ_AVATARS = 4;
/** LeadBot-style brand purple */
const CHAT_PURPLE = "#5B2EFF";
const CHAT_BG_IMAGE = "/mobile.jpg";

function ChatIcon({ className }: { className?: string }) {
  return (
    <img
      src="/chat.png"
      alt=""
      aria-hidden
      className={cn("object-contain", className)}
    />
  );
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

function isOwnMessage(message: WorkspaceChatMessage, currentUserId: string | null) {
  return Boolean(currentUserId && String(message.senderUserId) === currentUserId);
}

function resolveSenderAvatar(
  message: WorkspaceChatMessage,
  own: boolean,
  currentUserProfilePicture?: string,
  memberPictures?: Map<string, string | null | undefined>,
) {
  if (message.senderProfilePictureUrl) return message.senderProfilePictureUrl;
  const fromMember = memberPictures?.get(String(message.senderUserId));
  if (fromMember) return fromMember;
  if (own && currentUserProfilePicture) return currentUserProfilePicture;
  return undefined;
}

function hasUserRead(message: WorkspaceChatMessage, userId: string | null) {
  if (!userId) return false;
  return (message.readBy || []).some((entry) => String(entry.userId) === userId);
}

function readReceiptState(message: WorkspaceChatMessage, currentUserId: string | null) {
  const readByOthers = (message.readBy || []).filter(
    (entry) => String(entry.userId) !== String(currentUserId),
  );
  if (readByOthers.length > 0) return "read";
  const delivered = (message.deliveredTo || []).filter(
    (entry) => String(entry.userId) !== String(currentUserId),
  );
  if (delivered.length > 0) return "delivered";
  return "sent";
}

function shouldShowDateDivider(messages: WorkspaceChatMessage[], index: number) {
  if (index === 0) return true;
  return !isSameDay(messages[index - 1].createdAt, messages[index].createdAt);
}

function shouldGroupWithPrevious(
  messages: WorkspaceChatMessage[],
  index: number,
  currentUserId: string | null,
) {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (String(prev.senderUserId) !== String(curr.senderUserId)) return false;
  if (isOwnMessage(curr, currentUserId)) return true;
  const gap =
    new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap <= GROUP_GAP_MS && isSameDay(prev.createdAt, curr.createdAt);
}

function ReadReceiptIcon({
  state,
  allRead = false,
}: {
  state: "sent" | "delivered" | "read";
  allRead?: boolean;
}) {
  if (state === "read") {
    return (
      <CheckCheck
        size={12}
        className={allRead ? "text-sky-500" : "text-gray-400"}
        aria-hidden
      />
    );
  }
  if (state === "delivered") {
    return <CheckCheck size={12} className="text-gray-400" aria-hidden />;
  }
  return <Check size={12} className="text-gray-300" aria-hidden />;
}

function getMessageReaders(
  readBy: WorkspaceChatReceipt[] | undefined,
  currentUserId: string | null,
) {
  return (readBy || []).filter((entry) => String(entry.userId) !== String(currentUserId));
}

function allMembersHaveRead(
  message: WorkspaceChatMessage,
  currentUserId: string | null,
  expectedReaderCount: number,
) {
  const readerCount = getMessageReaders(message.readBy, currentUserId).length;
  if (expectedReaderCount === 0) return readerCount > 0;
  return readerCount >= expectedReaderCount;
}

function MessageReadByAvatars({
  readBy,
  currentUserId,
  memberPictureByUserId,
  memberNameByUserId,
}: {
  readBy?: WorkspaceChatReceipt[];
  currentUserId: string | null;
  memberPictureByUserId: Map<string, string | null | undefined>;
  memberNameByUserId: Map<string, string>;
}) {
  const { t } = useTranslation();

  const readers = useMemo(() => {
    return getMessageReaders(readBy, currentUserId).map((entry) => {
      const userId = String(entry.userId);
      return {
        userId,
        name: entry.userName || memberNameByUserId.get(userId) || "User",
        profilePictureUrl: memberPictureByUserId.get(userId) || undefined,
      };
    });
  }, [readBy, currentUserId, memberPictureByUserId, memberNameByUserId]);

  if (!readers.length) return null;

  const visibleReaders = readers.slice(0, MAX_READ_AVATARS);
  const overflowCount = readers.length - MAX_READ_AVATARS;

  return (
    <div className="flex items-center" aria-label={t("workspaceChatSeenBy")}>
      <div className="flex items-center">
        {visibleReaders.map((reader, index) => (
          <Tooltip key={reader.userId}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "relative rounded-full ring-2 ring-white",
                  index > 0 && "-ml-1.5",
                )}
              >
                <UserProfileAvatar
                  name={reader.name}
                  profilePictureUrl={reader.profilePictureUrl}
                  className="h-4 w-4"
                  fallbackClassName="bg-sky-100 text-[7px] font-semibold text-sky-700"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {reader.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      {overflowCount > 0 ? (
        <span className="ml-1 whitespace-nowrap text-[10px] text-gray-500">
          {t("workspaceMembersOthers").replace("{count}", String(overflowCount))}
        </span>
      ) : null}
    </div>
  );
}

export function WorkspaceChatWidget({ topOffset = 56 }: { topOffset?: number }) {
  const { mode, activeWorkspace } = useWorkspace();
  const { user: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { open, setOpen, setUnreadCount, clearUnread, unreadCount } = useWorkspaceChatPanel();
  const location = useLocation();
  const isMessagesPage = location.pathname.startsWith("/messages");
  const { members: workspaceMembers } = useWorkspaceMemberAvatars();
  const workspaceId = activeWorkspace?.id || "";
  const { activeUsers } = useWorkspacePresence();
  const currentUserId = localStorage.getItem("profit-pilot-user-id");

  const memberPictureByUserId = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    for (const member of workspaceMembers) {
      map.set(String(member.userId), member.profilePictureUrl);
    }
    return map;
  }, [workspaceMembers]);

  const memberNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of workspaceMembers) {
      map.set(String(member.userId), member.name);
    }
    return map;
  }, [workspaceMembers]);

  const expectedReaderCount = useMemo(
    () =>
      workspaceMembers.filter(
        (member) => String(member.userId) !== String(currentUserId),
      ).length,
    [workspaceMembers, currentUserId],
  );

  const enrichMessageProfiles = useCallback(
    (message: WorkspaceChatMessage): WorkspaceChatMessage => {
      const own = isOwnMessage(message, currentUserId);
      const senderProfilePictureUrl =
        message.senderProfilePictureUrl ||
        memberPictureByUserId.get(String(message.senderUserId)) ||
        (own ? currentUser?.profilePictureUrl : undefined) ||
        null;

      if (senderProfilePictureUrl === message.senderProfilePictureUrl) {
        return message;
      }

      return { ...message, senderProfilePictureUrl };
    },
    [memberPictureByUserId, currentUser?.profilePictureUrl, currentUserId],
  );

  const [messages, setMessages] = useState<WorkspaceChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [mentionMenu, setMentionMenu] = useState<{
    query: string;
    start: number;
    highlightIndex: number;
  } | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const markingReadRef = useRef(false);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const loadedWorkspaceRef = useRef<string | null>(null);
  const fetchStartedRef = useRef<string | null>(null);
  const mentionMembers = useMemo(
    () =>
      workspaceMembers.map((member) => ({
        userId: String(member.userId),
        name: member.name,
        profilePictureUrl: member.profilePictureUrl,
      })),
    [workspaceMembers],
  );

  const mentionOptions = useMemo(
    () =>
      mentionMenu
        ? filterMentionOptions(
            mentionMembers,
            mentionMenu.query,
            t("workspaceChatMentionEveryone"),
            currentUserId,
          )
        : [],
    [mentionMenu, mentionMembers, currentUserId, t],
  );

  const syncMentionMenu = useCallback((value: string, cursor: number) => {
    const context = getActiveMentionQuery(value, cursor);
    if (!context) {
      setMentionMenu(null);
      return;
    }
    setMentionMenu((prev) => ({
      query: context.query,
      start: context.start,
      highlightIndex:
        prev && prev.start === context.start ? prev.highlightIndex : 0,
    }));
  }, []);

  const handleMentionSelect = useCallback(
    (option: MentionMenuOption) => {
      if (!mentionMenu) return;
      const label = option.type === "all" ? "all" : option.name;
      const insertion = `@${label} `;
      const cursor = inputRef.current?.selectionStart ?? text.length;
      const nextText = `${text.slice(0, mentionMenu.start)}${insertion}${text.slice(cursor)}`;
      const nextCursor = mentionMenu.start + insertion.length;
      setText(nextText);
      setMentionMenu(null);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
        syncMentionMenu(nextText, nextCursor);
      });
    },
    [mentionMenu, text, syncMentionMenu],
  );

  const handleTextChange = useCallback(
    (value: string, cursor: number) => {
      setText(value);
      syncMentionMenu(value, cursor);
    },
    [syncMentionMenu],
  );

  const stickToBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stickToBottomRef.current = true;
    setShowScrollDown(false);
  }, []);

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < SCROLL_NEAR_BOTTOM_PX;
    stickToBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom && messages.length > 0);
  }, [messages.length]);

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!workspaceId) return;

      if (!options?.silent) setLoading(true);

      try {
        const res = await workspaceApi.getMessages(workspaceId, { limit: 50 });
        const loaded = ((res.data as WorkspaceChatMessage[]) || []).map(enrichMessageProfiles);
        setMessages(loaded);
        loadedWorkspaceRef.current = workspaceId;

        if (!open) {
          const unreadFromServer = loaded.filter(
            (message) =>
              !isOwnMessage(message, currentUserId) && !hasUserRead(message, currentUserId),
          ).length;
          setUnreadCount(unreadFromServer);
        }
      } catch {
        if (!options?.silent) {
          toast({ title: t("workspaceChatLoadFailed"), variant: "destructive" });
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [workspaceId, toast, t, enrichMessageProfiles, open, currentUserId, setUnreadCount],
  );

  const markMessagesRead = useCallback(
    async (ids: string[]) => {
      if (!workspaceId || !ids.length || markingReadRef.current) return;

      const pending = ids.filter((id) => !markedReadIdsRef.current.has(id));
      if (!pending.length) return;

      pending.forEach((id) => markedReadIdsRef.current.add(id));
      markingReadRef.current = true;
      try {
        const res = await workspaceApi.markMessagesRead(workspaceId, pending);
        const updated = (res.data as WorkspaceChatMessage[]) || [];
        if (updated.length) {
          setMessages((prev) => {
            let next = prev;
            for (const message of updated) {
              next = mergeChatMessages(next, message);
            }
            return next;
          });
        }
      } catch {
        pending.forEach((id) => markedReadIdsRef.current.delete(id));
      } finally {
        markingReadRef.current = false;
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    if (!workspaceId || mode !== "workspace") {
      setMessages([]);
      clearUnread();
      loadedWorkspaceRef.current = null;
      fetchStartedRef.current = null;
      markedReadIdsRef.current = new Set();
      return;
    }

    if (loadedWorkspaceRef.current && loadedWorkspaceRef.current !== workspaceId) {
      setMessages([]);
      markedReadIdsRef.current = new Set();
      fetchStartedRef.current = null;
    }

    if (fetchStartedRef.current === workspaceId) return;
    fetchStartedRef.current = workspaceId;
    void loadMessages({ silent: true });
  }, [workspaceId, mode, loadMessages, clearUnread]);

  useWorkspaceChatSocket(workspaceId, mode === "workspace" && Boolean(workspaceId), {
    onMessage: (message) => {
      const fromSelf = isOwnMessage(message, currentUserId);

      setMessages((prev) => {
        const base = fromSelf
          ? prev.filter((row) => !String(row._id).startsWith("pending-"))
          : prev;
        return mergeChatMessages(base, enrichMessageProfiles(message));
      });

      if (!open && !fromSelf) {
        return;
      }

      if (open && !fromSelf && !hasUserRead(message, currentUserId)) {
        void markMessagesRead([String(message._id)]);
      }

      if (open && stickToBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom("smooth"));
      } else if (open && !fromSelf) {
        setShowScrollDown(true);
      }
    },
    onRead: (message) => {
      setMessages((prev) => mergeChatMessages(prev, message));
    },
  });

  useEffect(() => {
    if (!memberPictureByUserId.size && !currentUser?.profilePictureUrl) return;
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((message) => {
        const enriched = enrichMessageProfiles(message);
        if (enriched !== message) changed = true;
        return enriched;
      });
      return changed ? next : prev;
    });
  }, [memberPictureByUserId, currentUser?.profilePictureUrl, enrichMessageProfiles]);

  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => scrollToBottom("auto"));

    if (loadedWorkspaceRef.current !== workspaceId) {
      void loadMessages();
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, workspaceId, loadMessages, scrollToBottom]);

  useEffect(() => {
    if (!open || loading) return;

    const unreadIds = messages
      .filter((message) => !isOwnMessage(message, currentUserId))
      .filter((message) => !hasUserRead(message, currentUserId))
      .filter((message) => !markedReadIdsRef.current.has(String(message._id)))
      .map((message) => String(message._id));

    if (unreadIds.length) {
      void markMessagesRead(unreadIds);
    }
  }, [open, loading, messages, currentUserId, markMessagesRead]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    setInputExpanded(el.scrollHeight > 52 || text.includes("\n"));
  }, [text]);

  const toggleExpanded = () => {
    setOpen((value) => {
      const next = !value;
      if (next) {
        clearUnread();
        if (loadedWorkspaceRef.current !== workspaceId || messages.length === 0) {
          void loadMessages();
        }
      }
      return next;
    });
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !workspaceId || sending) return;

    const { mentionAll, mentions } = buildMentionsFromBody(trimmed, mentionMembers);
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: WorkspaceChatMessage = {
      _id: optimisticId,
      workspaceId,
      senderUserId: currentUserId || "",
      senderName: currentUser?.name || "You",
      senderProfilePictureUrl: currentUser?.profilePictureUrl || null,
      body: trimmed,
      mentionAll,
      mentions,
      createdAt: new Date().toISOString(),
      deliveredTo: [],
      readBy: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setMentionMenu(null);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    setSending(true);
    try {
      const res = await workspaceApi.sendMessage(workspaceId, trimmed, {
        mentionAll,
        mentions,
      });
      const message = res.data as WorkspaceChatMessage;
      if (message) {
        setMessages((prev) => {
          const withoutPending = prev.filter((row) => String(row._id) !== optimisticId);
          return mergeChatMessages(withoutPending, enrichMessageProfiles(message));
        });
      }
    } catch {
      setMessages((prev) => prev.filter((row) => String(row._id) !== optimisticId));
      setText(trimmed);
      toast({ title: t("workspaceChatSendFailed"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionMenu && mentionOptions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionMenu((prev) =>
          prev
            ? {
                ...prev,
                highlightIndex: Math.min(prev.highlightIndex + 1, mentionOptions.length - 1),
              }
            : prev,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionMenu((prev) =>
          prev
            ? {
                ...prev,
                highlightIndex: Math.max(prev.highlightIndex - 1, 0),
              }
            : prev,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const option = mentionOptions[mentionMenu.highlightIndex];
        if (option) handleMentionSelect(option);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionMenu(null);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const title = useMemo(
    () => activeWorkspace?.name || t("workspaceChatTitle"),
    [activeWorkspace?.name, t],
  );

  useEffect(() => {
    if (mode !== "workspace" || !activeWorkspace?.id) {
      setOpen(false);
    }
  }, [mode, activeWorkspace?.id, setOpen]);

  useEffect(() => {
    if (isMessagesPage) setOpen(false);
  }, [isMessagesPage, setOpen]);

  if (mode !== "workspace" || !activeWorkspace?.id || isMessagesPage) {
    return null;
  }

  const panelHeight = `calc(100dvh - ${topOffset}px)`;

  return (
    <>
      {open ? (
        <aside
          className="workspace-chat fixed right-2 z-30 flex flex-col overflow-hidden border-x-2 border-x-sky-400 bg-white shadow-[0_0_0_1px_rgba(125,211,252,0.35)] animate-in slide-in-from-right duration-300 max-lg:right-0 max-lg:max-w-sm sm:right-3"
          style={{
            top: topOffset,
            height: panelHeight,
            width: WORKSPACE_CHAT_SIDEBAR_WIDTH,
          }}
          role="complementary"
          aria-label={title}
        >
          {/* Header */}
          <div className="shrink-0 p-3">
            <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-100 px-3 py-3">
              <div className="relative shrink-0">
                <WorkspaceProfileAvatar
                  name={title}
                  profilePictureUrl={activeWorkspace.profilePictureUrl}
                  pictureRevision={activeWorkspace.profilePictureRevision}
                  className="h-10 w-10 ring-2 ring-sky-200"
                  fallbackClassName="bg-sky-400 text-xs font-bold text-white"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold leading-tight text-gray-900">{title}</p>
                <WorkspaceActiveUsersRow users={activeUsers} />
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-sky-200/70"
                      aria-label="Chat options"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => void loadMessages()}>
                      Refresh messages
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-sky-200/70"
                  aria-label={t("workspaceChatClose")}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

            {/* Messages */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <img
                  src={CHAT_BG_IMAGE}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-white/96" />
              </div>
              <div
                ref={listRef}
                onScroll={handleListScroll}
                className="relative z-10 h-full min-h-0 overflow-y-auto px-4 py-5 scroll-smooth"
              >
              {loading && messages.length === 0 ? (
                <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                  <span className="text-sm">{t("loading")}</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full min-h-[12rem] flex-col items-start justify-end pb-2">
                  <div className="flex w-full gap-2.5">
                    <WorkspaceProfileAvatar
                      name={title}
                      profilePictureUrl={activeWorkspace.profilePictureUrl}
                      pictureRevision={activeWorkspace.profilePictureRevision}
                      className="h-8 w-8 shrink-0"
                      fallbackClassName="bg-sky-400 text-[9px] font-bold text-white"
                    />
                    <div className="max-w-[85%]">
                      <p className="mb-1 text-xs font-medium text-gray-500">{title}</p>
                      <div className="rounded-[1.25rem] bg-[#F4F4F5] px-4 py-3 text-sm leading-relaxed text-gray-800">
                        {t("workspaceChatEmpty")}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((message, index) => {
                    const own = isOwnMessage(message, currentUserId);
                    const grouped = shouldGroupWithPrevious(messages, index, currentUserId);
                    const showDate = shouldShowDateDivider(messages, index);
                    const senderAvatar = resolveSenderAvatar(
                      message,
                      own,
                      currentUser?.profilePictureUrl,
                      memberPictureByUserId,
                    );
                    const receipt = own ? readReceiptState(message, currentUserId) : null;
                    const everyoneRead = allMembersHaveRead(
                      message,
                      currentUserId,
                      expectedReaderCount,
                    );

                    return (
                      <div key={message._id}>
                        {showDate ? (
                          <div className="my-4 flex justify-center">
                            <span className="text-[11px] font-medium text-gray-400">
                              {formatDateDivider(message.createdAt)}
                            </span>
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            "flex gap-2.5",
                            own ? "flex-row-reverse" : "flex-row",
                            grouped ? "mt-1" : "mt-4",
                          )}
                        >
                          {grouped ? (
                            <div className="w-8 shrink-0" aria-hidden />
                          ) : (
                            <UserProfileAvatar
                              name={own ? currentUser?.name || message.senderName : message.senderName}
                              profilePictureUrl={senderAvatar}
                              className="mt-0.5 h-8 w-8 shrink-0"
                              fallbackClassName={
                                own
                                  ? "bg-violet-100 text-[9px] font-semibold text-violet-700"
                                  : "bg-[#F4F4F5] text-[9px] font-semibold text-gray-600"
                              }
                            />
                          )}

                          <div
                            className={cn(
                              "flex max-w-[82%] flex-col",
                              own ? "items-end" : "items-start",
                            )}
                          >
                            {!own && !grouped ? (
                              <p className="mb-1 px-1 text-xs font-medium text-gray-500">
                                {message.senderName}
                              </p>
                            ) : null}

                            <div
                              className={cn(
                                "px-4 py-2.5 text-sm leading-relaxed",
                                own
                                  ? "rounded-[1.25rem] text-white"
                                  : "rounded-[1.25rem] bg-[#F4F4F5] text-gray-800",
                              )}
                              style={own ? { backgroundColor: CHAT_PURPLE } : undefined}
                            >
                              <WorkspaceChatMessageBody
                                body={message.body}
                                mentions={message.mentions}
                                mentionAll={message.mentionAll}
                                currentUserId={currentUserId}
                                own={own}
                              />
                            </div>

                            {own ? (
                              <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 px-1">
                                <MessageReadByAvatars
                                  readBy={message.readBy}
                                  currentUserId={currentUserId}
                                  memberPictureByUserId={memberPictureByUserId}
                                  memberNameByUserId={memberNameByUserId}
                                />
                                {receipt ? (
                                  <ReadReceiptIcon
                                    state={receipt}
                                    allRead={everyoneRead && receipt === "read"}
                                  />
                                ) : null}
                                <span className="text-[10px] text-gray-400 tabular-nums">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {showScrollDown ? (
                <div className="sticky bottom-0 flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => scrollToBottom("smooth")}
                    className="flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-sky-50"
                  >
                    <ChevronDown size={14} />
                    New messages
                  </button>
                </div>
              ) : null}
              </div>
            </div>

            {/* Composer */}
            <div className="relative shrink-0 border-t border-sky-200 bg-white px-4 py-3">
              {mentionMenu && mentionOptions.length > 0 ? (
                <WorkspaceChatMentionMenu
                  options={mentionOptions}
                  highlightIndex={Math.min(mentionMenu.highlightIndex, mentionOptions.length - 1)}
                  everyoneLabel={t("workspaceChatMentionEveryone")}
                  onHighlight={(index) =>
                    setMentionMenu((prev) => (prev ? { ...prev, highlightIndex: index } : prev))
                  }
                  onSelect={handleMentionSelect}
                />
              ) : null}
              <div
                className={cn(
                  "flex items-end gap-1 border border-sky-200 bg-sky-50/50 py-1 pl-4 pr-1 transition-colors focus-within:border-sky-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100",
                  inputExpanded ? "rounded-2xl" : "rounded-full",
                )}
              >
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) =>
                    handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)
                  }
                  onClick={(e) =>
                    handleTextChange(
                      e.currentTarget.value,
                      e.currentTarget.selectionStart ?? e.currentTarget.value.length,
                    )
                  }
                  onKeyUp={(e) =>
                    handleTextChange(
                      e.currentTarget.value,
                      e.currentTarget.selectionStart ?? e.currentTarget.value.length,
                    )
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={t("workspaceChatSend")}
                  rows={1}
                  className="max-h-[100px] min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  data-chat-send
                  disabled={!text.trim() || sending}
                  onClick={() => void handleSend()}
                  className={cn(
                    "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 transition-all",
                    text.trim()
                      ? "bg-sky-400 text-white hover:bg-sky-500"
                      : "cursor-not-allowed bg-sky-200/80 text-sky-400",
                  )}
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
        </aside>
      ) : null}

      {!open ? (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={toggleExpanded}
            className="pointer-events-auto relative flex h-16 w-16 shrink-0 items-center justify-center bg-transparent p-0 transition-transform hover:scale-105 active:scale-95 sm:h-[4.5rem] sm:w-[4.5rem]"
            aria-expanded={open}
            aria-label={t("workspaceChatOpen")}
          >
            <ChatIcon className="h-full w-full object-contain" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
    </>
  );
}
