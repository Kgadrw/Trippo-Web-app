import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Send,
  Loader2,
  X,
  ChevronDown,
  Check,
  CheckCheck,
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Reply,
  Trash2,
  BarChart3,
} from "lucide-react";
import { workspaceApi } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { WorkspaceProfileAvatar } from "@/components/workspace/WorkspaceProfileAvatar";
import {
  ChatReplyComposerBar,
  ChatReplyQuote,
  normalizeReplyTo,
  scrollChatToMessage,
  type ChatReplyTo,
} from "@/components/workspace/ChatReplyQuote";
import { ChatEmojiPicker, insertEmojiInText } from "@/components/workspace/ChatEmojiPicker";
import { ChatInteractiveBubble } from "@/components/workspace/ChatInteractiveBubble";
import { ChatMessageReactions } from "@/components/workspace/ChatMessageReactions";
import { ChatTypingBubble } from "@/components/workspace/ChatTypingBubble";
import {
  ChatInfoButton,
  ChatInfoSheet,
} from "@/components/workspace/ChatInfoSheet";
import { DirectChatMessageAttachments } from "@/components/workspace/DirectChatMessageAttachments";
import {
  ChatVoiceRecorderButton,
  type VoiceNoteSendPayload,
} from "@/components/workspace/ChatVoiceNote";
import {
  ChatAttachButton,
  ChatPendingAttachments,
  filesToPendingAttachments,
  revokePendingAttachments,
  validateChatAttachmentFiles,
  type PendingChatAttachment,
} from "@/components/workspace/ChatComposerAttach";
import { uploadWorkspaceChatAttachment } from "@/lib/chatUpload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { refreshMessagesUnreadBadge } from "@/lib/messagesUnreadEvents";
import { clearGroupChatOsNotification } from "@/lib/workspaceChatNotifications";
import { useChatComposerPad } from "@/hooks/useChatComposerPad";
import {
  mergeChatMessages,
  WORKSPACE_CHAT_TYPING_EVENT,
  type WorkspaceChatMessage,
  type WorkspaceChatReceipt,
  type ChatPollInput,
} from "@/lib/workspaceChatRealtime";
import { useTypingEmitter, useTypingListener } from "@/hooks/useChatTyping";
import { useWorkspaceChatPanel } from "@/hooks/useWorkspaceChatPanel";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import { useWorkspaceChatSocket } from "@/hooks/useWorkspaceChatSocket";
import { WorkspaceActiveUsersRow } from "@/components/workspace/WorkspaceActiveUsersRow";
import { WorkspaceChatMentionMenu } from "@/components/workspace/WorkspaceChatMentionMenu";
import { WorkspaceChatMessageBody } from "@/components/workspace/WorkspaceChatMessageBody";
import { ChatPoll } from "@/components/workspace/ChatPoll";
import { ChatPollCreateDialog } from "@/components/workspace/ChatPollCreateDialog";
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

export type WorkspaceGroupChatPaneProps = {
  /** When true, mark messages read, focus composer, and clear unread badge. */
  active: boolean;
  /** Update FAB unread while inactive (floating panel). */
  trackUnreadWhenInactive?: boolean;
  variant?: "panel" | "page";
  className?: string;
  onClose?: () => void;
  onBack?: () => void;
  headerActions?: ReactNode;
  escapeCloses?: boolean;
};

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

function isMessageDeleted(message: WorkspaceChatMessage) {
  return Boolean(message.deletedAt);
}

function canModifyMessage(message: WorkspaceChatMessage, currentUserId: string | null) {
  if (!isOwnMessage(message, currentUserId)) return false;
  if (String(message._id).startsWith("pending-")) return false;
  return !isMessageDeleted(message);
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

export function WorkspaceGroupChatPane({
  active,
  trackUnreadWhenInactive = false,
  variant = "panel",
  className,
  onClose,
  onBack,
  headerActions,
  escapeCloses = false,
}: WorkspaceGroupChatPaneProps) {
  const { mode, activeWorkspace } = useWorkspace();
  const { user: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { setUnreadCount, clearUnread } = useWorkspaceChatPanel();
  const { members: workspaceMembers } = useWorkspaceMemberAvatars();
  const workspaceId = activeWorkspace?.id || "";
  const { activeUsers } = useWorkspacePresence();
  const currentUserId = localStorage.getItem("profit-pilot-user-id");

  const typingEnabled = Boolean(active && mode === "workspace" && workspaceId);
  const { onComposerChange: notifyTyping, stopTyping } = useTypingEmitter({
    enabled: typingEnabled,
    eventType: WORKSPACE_CHAT_TYPING_EVENT,
    buildPayload: (isTyping) => ({
      workspaceId,
      userName: currentUser?.name || "User",
      isTyping,
    }),
  });
  const { typingUsers, clearTypingUser } = useTypingListener({
    enabled: typingEnabled,
    eventType: WORKSPACE_CHAT_TYPING_EVENT,
    currentUserId,
    scopeKey: workspaceId,
    matches: (payload) => String(payload.workspaceId || "") === String(workspaceId),
  });

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatReplyTo | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<WorkspaceChatMessage | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [mentionMenu, setMentionMenu] = useState<{
    query: string;
    start: number;
    highlightIndex: number;
  } | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [chatInfoOpen, setChatInfoOpen] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [votingMessageId, setVotingMessageId] = useState<string | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatAttachment[]>([]);

  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const markingReadRef = useRef(false);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const loadedWorkspaceRef = useRef<string | null>(null);
  const fetchStartedRef = useRef<string | null>(null);
  const composerPad = useChatComposerPad(composerRef, [
    workspaceId,
    replyTo,
    editingMessageId,
    voiceRecording,
    text,
    pendingAttachments.length,
    variant,
  ]);
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
      notifyTyping(value);
    },
    [syncMentionMenu, notifyTyping],
  );

  const stickToBottomRef = useRef(true);
  const pendingSendIdsRef = useRef<Set<string>>(new Set());
  const sendLockRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stickToBottomRef.current = true;
    setShowScrollDown(false);
  }, []);

  const jumpToLatest = useCallback(() => {
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    const timers: number[] = [];
    const run = () => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };
    run();
    requestAnimationFrame(run);
    timers.push(window.setTimeout(run, 50));
    timers.push(window.setTimeout(run, 180));
    timers.push(window.setTimeout(run, 400));
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!typingUsers.length || !stickToBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [typingUsers.length, scrollToBottom]);

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
  }, [workspaceId]);

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
  }, [active, workspaceId]);

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
        const loaded = ((res.data as WorkspaceChatMessage[]) || [])
          .map(enrichMessageProfiles)
          .filter((message) => {
            if (!message.expiresAt) return true;
            return new Date(message.expiresAt).getTime() > Date.now();
          });
        setMessages(loaded);
        loadedWorkspaceRef.current = workspaceId;
        if (active) stickToBottomRef.current = true;

        if (!active && trackUnreadWhenInactive) {
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
    [
      workspaceId,
      toast,
      t,
      enrichMessageProfiles,
      active,
      trackUnreadWhenInactive,
      currentUserId,
      setUnreadCount,
    ],
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
        clearUnread();
        refreshMessagesUnreadBadge();
        clearGroupChatOsNotification(workspaceId);
      } catch {
        pending.forEach((id) => markedReadIdsRef.current.delete(id));
      } finally {
        markingReadRef.current = false;
      }
    },
    [workspaceId, clearUnread],
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
      if (!fromSelf) {
        clearTypingUser(String(message.senderUserId));
      }

      setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));

      if (!active && !fromSelf) {
        return;
      }

      if (active && !fromSelf && !hasUserRead(message, currentUserId)) {
        void markMessagesRead([String(message._id)]);
      }

      if (active && stickToBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom("smooth"));
      } else if (active && !fromSelf) {
        setShowScrollDown(true);
      }
    },
    onRead: (message) => {
      setMessages((prev) => mergeChatMessages(prev, message));
    },
    onEdit: (message) => {
      setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
    },
    onDelete: (message) => {
      setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
      if (editingMessageId === String(message._id)) {
        setEditingMessageId(null);
        setText("");
      }
    },
    onReaction: (message) => {
      setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
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
    if (!active) return;

    clearUnread();
    stickToBottomRef.current = true;
    const cancelJump = jumpToLatest();
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      cancelJump();
      window.clearTimeout(timer);
    };
    // Intentionally only when the pane opens / workspace changes — not when loadMessages identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, workspaceId]);

  useEffect(() => {
    if (!active || loading) return;
    return jumpToLatest();
  }, [active, loading, workspaceId, jumpToLatest]);

  useEffect(() => {
    if (!active || !workspaceId) return;
    if (loadedWorkspaceRef.current !== workspaceId) {
      void loadMessages();
    }
  }, [active, workspaceId, loadMessages]);

  useEffect(() => {
    if (!active || loading) return;

    const unreadIds = messages
      .filter((message) => !isOwnMessage(message, currentUserId))
      .filter((message) => !hasUserRead(message, currentUserId))
      .filter((message) => !markedReadIdsRef.current.has(String(message._id)))
      .map((message) => String(message._id));

    if (unreadIds.length) {
      void markMessagesRead(unreadIds);
    }
  }, [active, loading, messages, currentUserId, markMessagesRead]);

  useEffect(() => {
    if (!active || !escapeCloses) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editingMessageId) {
        setEditingMessageId(null);
        setText("");
        return;
      }
      onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, editingMessageId, escapeCloses, onClose]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    setInputExpanded(el.scrollHeight > 52 || text.includes("\n"));
  }, [text]);

  useEffect(() => {
    setPendingAttachments((prev) => {
      if (!prev.length) return prev;
      revokePendingAttachments(prev);
      return [];
    });
  }, [workspaceId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    const staged = pendingAttachments;
    if ((!trimmed && !staged.length) || !workspaceId || sending || sendLockRef.current) return;

    stopTyping();

    if (editingMessageId) {
      if (!trimmed) return;
      sendLockRef.current = true;
      setSending(true);
      try {
        const res = await workspaceApi.editMessage(workspaceId, editingMessageId, trimmed);
        const message = res.data as WorkspaceChatMessage;
        if (message) {
          setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
        }
        setEditingMessageId(null);
        setReplyTo(null);
        setText("");
        setMentionMenu(null);
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

    const { mentionAll, mentions } = buildMentionsFromBody(trimmed, mentionMembers);
    const optimisticId = `pending-${Date.now()}`;
    const optimisticReply = replyTo;
    const optimisticAttachments = staged.map((item) => ({
      url: item.previewUrl || "",
      fileName: item.file.name,
      mimeType: item.file.type || "application/octet-stream",
      size: item.file.size,
    }));
    const optimisticMessage: WorkspaceChatMessage = {
      _id: optimisticId,
      workspaceId,
      senderUserId: currentUserId || "",
      senderName: currentUser?.name || "You",
      senderProfilePictureUrl: currentUser?.profilePictureUrl || null,
      body: trimmed,
      replyTo: optimisticReply,
      attachments: optimisticAttachments,
      mentionAll,
      mentions,
      createdAt: new Date().toISOString(),
      deliveredTo: [],
      readBy: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    pendingSendIdsRef.current.add(optimisticId);
    setText("");
    setReplyTo(null);
    setMentionMenu(null);
    setPendingAttachments([]);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    try {
      const uploaded =
        staged.length > 0
          ? await Promise.all(
              staged.map((item) => uploadWorkspaceChatAttachment(workspaceId, item.file)),
            )
          : [];
      const res = await workspaceApi.sendMessage(workspaceId, trimmed, {
        attachments: uploaded,
        mentionAll,
        mentions,
        replyToMessageId: optimisticReply?.messageId || null,
        replyTo: optimisticReply,
      });
      const message = res.data as WorkspaceChatMessage;
      if (message) {
        pendingSendIdsRef.current.delete(optimisticId);
        const withReply: WorkspaceChatMessage = {
          ...message,
          replyTo: message.replyTo?.messageId ? message.replyTo : optimisticReply,
        };
        setMessages((prev) => {
          const withoutPending = prev.filter((row) => String(row._id) !== optimisticId);
          return mergeChatMessages(withoutPending, enrichMessageProfiles(withReply));
        });
        requestAnimationFrame(() => scrollToBottom("smooth"));
      }
      revokePendingAttachments(staged);
    } catch {
      pendingSendIdsRef.current.delete(optimisticId);
      setMessages((prev) => prev.filter((row) => String(row._id) !== optimisticId));
      setText(trimmed);
      if (optimisticReply) setReplyTo(optimisticReply);
      setPendingAttachments(staged);
      toast({
        title: t("workspaceChatSendFailed"),
        description: staged.length ? "Failed to send attachment" : undefined,
        variant: "destructive",
      });
    } finally {
      setSending(false);
      sendLockRef.current = false;
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const queuePendingAttachments = (files: File[]) => {
    const validation = validateChatAttachmentFiles(files);
    if (!validation.ok) {
      toast({
        title: "Attachment is too large",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
    setPendingAttachments((prev) => [...prev, ...filesToPendingAttachments(files)]);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) revokePendingAttachments([target]);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleSendVoice = async ({ file, duration, waveform }: VoiceNoteSendPayload) => {
    if (!workspaceId || sending || editingMessageId) return;

    stopTyping();
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
    const optimisticMessage: WorkspaceChatMessage = {
      _id: optimisticId,
      workspaceId,
      senderUserId: currentUserId || "",
      senderName: currentUser?.name || "You",
      senderProfilePictureUrl: currentUser?.profilePictureUrl || null,
      body: "",
      attachments: [optimisticAttachment],
      createdAt: new Date().toISOString(),
      deliveredTo: [],
      readBy: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    pendingSendIdsRef.current.add(optimisticId);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    try {
      const uploaded = await uploadWorkspaceChatAttachment(workspaceId, file);
      const res = await workspaceApi.sendMessage(workspaceId, "", {
        attachments: [
          {
            url: uploaded.url,
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
            duration,
            waveform,
          },
        ],
      });
      const message = res.data as WorkspaceChatMessage;
      if (message) {
        pendingSendIdsRef.current.delete(optimisticId);
        setMessages((prev) => {
          const withoutPending = prev.filter((row) => String(row._id) !== optimisticId);
          return mergeChatMessages(withoutPending, enrichMessageProfiles(message));
        });
        requestAnimationFrame(() => scrollToBottom("smooth"));
      }
    } catch {
      pendingSendIdsRef.current.delete(optimisticId);
      setMessages((prev) => prev.filter((row) => String(row._id) !== optimisticId));
      toast({ title: t("chatVoiceSendFailed"), variant: "destructive" });
    } finally {
      setSending(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  const handleCreatePoll = async (poll: ChatPollInput) => {
    if (!workspaceId || sending || editingMessageId) return;
    setSending(true);
    try {
      const res = await workspaceApi.sendMessage(workspaceId, "", { poll });
      const message = res.data as WorkspaceChatMessage;
      if (message) setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } catch {
      toast({ title: "Couldn't create poll", variant: "destructive" });
      throw new Error("Poll creation failed");
    } finally {
      setSending(false);
    }
  };

  const handleVotePoll = async (messageId: string, optionIndex: number) => {
    if (!workspaceId || votingMessageId) return;
    setVotingMessageId(messageId);
    try {
      const res = await workspaceApi.voteMessagePoll(workspaceId, messageId, optionIndex);
      const message = res.data as WorkspaceChatMessage;
      if (message) setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
    } catch {
      toast({ title: "Couldn't record vote", variant: "destructive" });
    } finally {
      setVotingMessageId(null);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!workspaceId || reactingMessageId) return;
    setReactingMessageId(messageId);
    try {
      const res = await workspaceApi.toggleMessageReaction(workspaceId, messageId, emoji);
      const message = res.data as WorkspaceChatMessage;
      if (message) setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
    } catch {
      toast({ title: "Couldn't add reaction", variant: "destructive" });
    } finally {
      setReactingMessageId(null);
    }
  };

  const startEdit = (message: WorkspaceChatMessage) => {
    setReplyTo(null);
    setEditingMessageId(String(message._id));
    setText(message.body || "");
    setMentionMenu(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const startReply = (message: WorkspaceChatMessage) => {
    if (isMessageDeleted(message)) return;
    setEditingMessageId(null);
    setMentionMenu(null);
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
        // ignore
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
    setMentionMenu(null);
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const jumpToMessage = useCallback((messageId: string) => {
    scrollChatToMessage(listRef.current, messageId);
  }, []);

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !workspaceId || deletingMessageId) return;

    const messageId = String(messageToDelete._id);
    setDeletingMessageId(messageId);
    try {
      const res = await workspaceApi.deleteMessage(workspaceId, messageId);
      const updated = res.data as WorkspaceChatMessage;
      if (updated) {
        setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(updated)));
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

  if (mode !== "workspace" || !activeWorkspace?.id) {
    return null;
  }

  return (
    <>
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col bg-white",
        className,
      )}
    >
          {/* Header */}
          <div className={cn("shrink-0", variant === "panel" ? "p-3" : "border-b border-sky-100 bg-white/95 px-2 py-2.5 backdrop-blur-sm max-lg:pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 lg:py-3")}>
            <div
              className={cn(
                "flex items-center gap-2 sm:gap-3",
                variant === "panel" && "rounded-2xl border border-sky-200 bg-sky-100 px-3 py-3",
              )}
            >
              {onBack ? (
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sky-600 active:bg-sky-50 lg:hidden"
                  onClick={onBack}
                  aria-label={t("chatBack")}
                >
                  <ChevronLeft size={26} strokeWidth={2.25} />
                </button>
              ) : null}
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
                {headerActions}
                <ChatInfoButton label={t("chatInfo")} onClick={() => setChatInfoOpen(true)} />
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
                    <DropdownMenuItem onClick={() => setChatInfoOpen(true)}>
                      {t("chatInfo")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-sky-200/70"
                    aria-label={t("workspaceChatClose")}
                  >
                    <X size={18} />
                  </button>
                ) : null}
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
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div
                    ref={listRef}
                    onScroll={handleListScroll}
                    className={cn(
                      "relative z-10 h-full min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y px-3 pt-4 scroll-smooth sm:px-4",
                      variant !== "page" && "pb-5",
                    )}
                    style={variant === "page" ? { paddingBottom: composerPad } : undefined}
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
                      <div className="rounded-[1.15rem] bg-[#F4F4F5] px-3 py-2 text-sm leading-snug text-gray-800">
                        {t("workspaceChatEmpty")}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((message, index) => {
                    const own = isOwnMessage(message, currentUserId);
                    const deleted = isMessageDeleted(message);
                    const canModify = canModifyMessage(message, currentUserId);
                    const canEdit = canModify && Boolean(message.body?.trim());
                    const grouped = shouldGroupWithPrevious(messages, index, currentUserId);
                    const showDate = shouldShowDateDivider(messages, index);
                    const senderAvatar = resolveSenderAvatar(
                      message,
                      own,
                      currentUser?.profilePictureUrl,
                      memberPictureByUserId,
                    );
                    const receipt = own && !deleted ? readReceiptState(message, currentUserId) : null;
                    const everyoneRead = allMembersHaveRead(
                      message,
                      currentUserId,
                      expectedReaderCount,
                    );

                    return (
                      <div
                        key={message._id}
                        data-chat-message-id={String(message._id)}
                        className="rounded-xl transition-shadow"
                      >
                        {showDate ? (
                          <div className="my-4 flex justify-center">
                            <span className="text-[11px] font-medium text-gray-400">
                              {formatDateDivider(message.createdAt)}
                            </span>
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            "flex w-full gap-2.5",
                            own ? "justify-end" : "justify-start",
                            grouped ? "mt-1" : "mt-4",
                          )}
                        >
                          {!own ? (
                            <UserProfileAvatar
                              name={message.senderName}
                              profilePictureUrl={senderAvatar}
                              className="mt-0.5 h-8 w-8 shrink-0"
                              fallbackClassName="bg-[#F4F4F5] text-[9px] font-semibold text-gray-600"
                            />
                          ) : null}

                          <div
                            className={cn(
                              "flex min-w-0 max-w-[85%] flex-col",
                              own ? "items-end" : "items-start",
                            )}
                          >
                            {!own && !grouped ? (
                              <p className="mb-1 px-1 text-xs font-medium text-gray-500">
                                {message.senderName}
                              </p>
                            ) : null}

                            <div className="flex max-w-full items-end gap-1.5">
                            <ChatInteractiveBubble
                              own={own}
                              disabled={deleted}
                              actionsTitle={t("chatMessageActions")}
                              onReply={() => startReply(message)}
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
                                  "rounded-[1.15rem] px-3 py-1.5 text-sm leading-snug",
                                  deleted
                                    ? own
                                      ? "bg-gray-200 text-gray-500"
                                      : "bg-[#F4F4F5] text-gray-400"
                                    : own
                                      ? "text-white"
                                      : "bg-[#F4F4F5] text-gray-800",
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
                                      <div className={cn(message.body?.trim() ? "mb-2" : undefined)}>
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
                                    />
                                  ) : null}
                                    {message.body?.trim() ? (
                                      <WorkspaceChatMessageBody
                                        body={message.body}
                                        mentions={message.mentions}
                                        mentionAll={message.mentionAll}
                                        currentUserId={currentUserId}
                                        own={own}
                                      />
                                    ) : null}
                                  </>
                                )}
                              </div>
                            </ChatInteractiveBubble>
                            {!deleted ? (
                              <ChatMessageReactions
                                reactions={message.reactions}
                                currentUserId={currentUserId}
                                own={own}
                                disabled={reactingMessageId === String(message._id)}
                                onReact={(emoji) => void handleReact(String(message._id), emoji)}
                              />
                            ) : null}
                            </div>

                            {own ? (
                              <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 px-1">
                                {!deleted ? (
                                  <MessageReadByAvatars
                                    readBy={message.readBy}
                                    currentUserId={currentUserId}
                                    memberPictureByUserId={memberPictureByUserId}
                                    memberNameByUserId={memberNameByUserId}
                                  />
                                ) : null}
                                {receipt ? (
                                  <ReadReceiptIcon
                                    state={receipt}
                                    allRead={everyoneRead && receipt === "read"}
                                  />
                                ) : null}
                                {message.editedAt && !deleted ? (
                                  <span className="text-[10px] text-gray-400">{t("directChatEdited")}</span>
                                ) : null}
                                <span className="text-[10px] text-gray-400 tabular-nums">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1 flex items-center gap-1.5 px-1">
                                {message.editedAt && !deleted ? (
                                  <span className="text-[10px] text-gray-400">{t("directChatEdited")}</span>
                                ) : null}
                                <span className="text-[10px] text-gray-400 tabular-nums">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!loading && typingUsers.length > 0 ? (
                <div className="pb-1">
                  {typingUsers.map((user) => (
                    <ChatTypingBubble
                      key={user.userId}
                      name={user.userName}
                      profilePictureUrl={memberPictureByUserId.get(user.userId)}
                      label={t("chatTypingBubble")}
                    />
                  ))}
                </div>
              ) : null}

              {showScrollDown ? (
                <div className="sticky bottom-0 flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => scrollToBottom("smooth")}
                    className="flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-sky-50"
                  >
                    <ChevronDown size={14} />
                    New messages
                  </button>
                </div>
              ) : null}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-[11rem] rounded-xl border border-gray-600 bg-white/95 p-1.5 text-gray-500 shadow-none">
                  <ContextMenuItem
                    className="font-normal text-gray-500 focus:bg-sky-50 focus:text-gray-700"
                    onSelect={() => setChatInfoOpen(true)}
                  >
                    Chat info
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="font-normal text-gray-500 focus:bg-sky-50 focus:text-gray-700"
                    onSelect={() => void loadMessages()}
                  >
                    Refresh messages
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-gray-100" />
                  <ContextMenuItem
                    className="font-normal text-gray-500 focus:bg-sky-50 focus:text-gray-700"
                    onSelect={() => {
                      setMessages([]);
                      setReplyTo(null);
                      setEditingMessageId(null);
                      toast({ title: "Chat cleared from this view" });
                    }}
                  >
                    Clear chat
                  </ContextMenuItem>
                  {onClose ? (
                    <ContextMenuItem
                      className="font-normal text-gray-500 focus:bg-sky-50 focus:text-gray-700"
                      onSelect={onClose}
                    >
                      Close chat
                    </ContextMenuItem>
                  ) : null}
                </ContextMenuContent>
              </ContextMenu>
            </div>

            {/* Composer — sits above native soft keyboard via visualViewport shell */}
            <div
              ref={composerRef}
              data-chat-composer
              className={cn(
                variant === "panel"
                  ? "relative shrink-0 border-t-2 border-sky-300 bg-white px-4 py-3"
                  : "pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white via-white/95 to-transparent px-2 chat-composer-pad pt-6 max-lg:pt-4 lg:bg-[#f0f2f5] lg:bg-none lg:px-3 lg:pb-0 lg:pt-4",
                variant === "page" && voiceRecording && "z-30 overflow-visible pt-3 max-lg:pt-3",
              )}
            >
              <div className={cn(variant === "page" && "pointer-events-auto w-full")}>
              {mentionMenu && mentionOptions.length > 0 && !editingMessageId ? (
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
              {editingMessageId && !voiceRecording ? (
                <div
                  className={cn(
                    "mb-1.5 flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-gray-700",
                    variant === "panel" ? "mb-2 rounded-xl bg-sky-50" : "bg-white/95",
                  )}
                >
                  <span>{t("directChatEditing")}</span>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="font-medium text-sky-600 hover:text-sky-700"
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
              <ChatPollCreateDialog
                open={pollDialogOpen}
                onOpenChange={setPollDialogOpen}
                onCreate={handleCreatePoll}
              />
              {!voiceRecording ? (
                <ChatPendingAttachments
                  items={pendingAttachments}
                  onRemove={removePendingAttachment}
                />
              ) : null}
              <div
                className={cn(
                  "flex items-center gap-1 py-1 transition-colors",
                    variant === "panel"
                      ? "border-2 border-sky-300 bg-sky-50/50 pl-2 pr-1 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100"
                      : "flex items-end gap-1.5 rounded-[1.75rem] border border-gray-300 bg-white px-2.5 py-1.5 shadow-none sm:gap-2 sm:px-4 max-lg:min-h-[3rem]",
                    variant === "panel" && (inputExpanded ? "rounded-2xl" : "rounded-full"),
                    variant === "page" &&
                      voiceRecording &&
                      "border-transparent bg-transparent p-0 shadow-none ring-0",
                  )}
                >
                {!voiceRecording ? (
                  <button
                    type="button"
                    onClick={() => setPollDialogOpen(true)}
                    disabled={sending || Boolean(editingMessageId)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-sky-100 hover:text-sky-700 disabled:opacity-40"
                    aria-label="Create poll"
                    title="Create poll"
                  >
                    <BarChart3 size={18} />
                  </button>
                ) : null}
                {!voiceRecording ? (
                <ChatEmojiPicker
                  label={t("chatEmoji")}
                  onSelect={(emoji) => {
                    const el = inputRef.current;
                    const start = el?.selectionStart ?? text.length;
                    const end = el?.selectionEnd ?? text.length;
                    const { next, caret } = insertEmojiInText(text, emoji, start, end);
                    handleTextChange(next, caret);
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
                  onFocus={() => {
                    window.scrollTo(0, 0);
                    stickToBottomRef.current = true;
                    const run = () => {
                      const el = listRef.current;
                      if (el) el.scrollTop = el.scrollHeight;
                    };
                    run();
                    requestAnimationFrame(run);
                    window.setTimeout(run, 120);
                    window.setTimeout(run, 320);
                    window.setTimeout(run, 520);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t("workspaceChatSend")}
                  rows={1}
                  inputMode="text"
                  enterKeyHint="send"
                  autoComplete="off"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  spellCheck
                  className={cn(
                    "flex-1 resize-none bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-none",
                    variant === "panel"
                      ? "max-h-[100px] min-h-[2.5rem] py-2 text-sm max-lg:min-h-[1.75rem] max-lg:py-1"
                      : "max-h-[140px] min-h-[44px] py-2.5 text-[16px] leading-5 lg:min-h-[40px] lg:text-[15px]",
                  )}
                />
                ) : null}
                {!voiceRecording ? (
                  <ChatAttachButton
                    className={variant === "page" ? "h-11 w-11" : "h-9 w-9"}
                    iconSize={18}
                    disabled={sending || Boolean(editingMessageId)}
                    onFilesSelected={queuePendingAttachments}
                  />
                ) : null}
                {(!text.trim() && !pendingAttachments.length && !editingMessageId) ||
                voiceRecording ? (
                  <ChatVoiceRecorderButton
                    className={cn(
                      voiceRecording ? "w-full" : undefined,
                      variant === "page" && !voiceRecording && "max-lg:h-11 max-lg:w-11",
                    )}
                    disabled={sending || Boolean(editingMessageId)}
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
                      const active = document.activeElement as HTMLElement | null;
                      active?.blur?.();
                      window.scrollTo(0, 0);
                      stickToBottomRef.current = true;
                      const run = () => {
                        const el = listRef.current;
                        if (el) el.scrollTop = el.scrollHeight;
                      };
                      run();
                      window.setTimeout(run, 120);
                      window.setTimeout(run, 320);
                      window.setTimeout(run, 520);
                    }}
                    onError={(message) =>
                      toast({
                        title: t("chatVoiceSendFailed"),
                        description: message,
                        variant: "destructive",
                      })
                    }
                    onSend={(payload) => void handleSendVoice(payload)}
                  />
                ) : !voiceRecording ? (
                <button
                  type="button"
                  data-chat-send
                  disabled={(!text.trim() && !pendingAttachments.length) || sending}
                  onClick={() => void handleSend()}
                  className={cn(
                    "mb-0.5 flex shrink-0 items-center justify-center rounded-full p-0 transition-all",
                    variant === "page" ? "h-11 w-11 lg:h-10 lg:w-10" : "h-9 w-9",
                    text.trim() || pendingAttachments.length
                      ? "bg-sky-400 text-white hover:bg-sky-500"
                      : "cursor-not-allowed bg-sky-200/80 text-sky-400",
                  )}
                  aria-label={t("workspaceChatSend")}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send
                      size={variant === "page" ? 16 : 15}
                      className={
                        text.trim() || pendingAttachments.length ? "translate-x-px" : undefined
                      }
                    />
                  )}
                </button>
                ) : null}
              </div>
              </div>
            </div>
    </div>

      {workspaceId ? (
        <ChatInfoSheet
          mode="group"
          open={chatInfoOpen}
          onOpenChange={setChatInfoOpen}
          workspaceId={workspaceId}
          workspaceName={title}
          workspaceProfilePictureUrl={activeWorkspace.profilePictureUrl}
        />
      ) : null}

      <DeleteConfirmDialog
        open={Boolean(messageToDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deletingMessageId) setMessageToDelete(null);
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
    </>
  );
}
