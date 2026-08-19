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
import { ChatComposerInput } from "@/components/workspace/ChatComposerInput";
import { ChatEmojiPicker, insertEmojiInText } from "@/components/workspace/ChatEmojiPicker";
import { ChatInteractiveBubble } from "@/components/workspace/ChatInteractiveBubble";
import {
  chatMessageLengthError,
  friendlyChatSendError,
  isOverChatMessageLimit,
} from "@/lib/chatMessageLimits";
import {
  ChatMessageAddReaction,
  ChatMessageReactions,
  hasChatReactions,
} from "@/components/workspace/ChatMessageReactions";
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
import { uploadWorkspaceChatAttachment, prepareChatAttachmentFiles } from "@/lib/chatUpload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { bumpMessagesUnread, refreshMessagesUnreadBadge } from "@/lib/messagesUnreadEvents";
import { clearGroupChatOsNotification } from "@/lib/workspaceChatNotifications";
import { isWorkspaceGroupChatPath } from "@/lib/workspaceGroupChat";
import { useChatComposerPad } from "@/hooks/useChatComposerPad";
import {
  scheduleJumpToLatest,
  useStickChatListToBottom,
} from "@/hooks/useStickChatListToBottom";
import {
  applyOptimisticPollVote,
  emitLocalGroupChatPreview,
  mergeChatMessages,
  newClientMessageId,
  reconcileChatMessagesAfterFetch,
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

function latestMessageCreatedAt(messages: Array<{ _id: string; createdAt?: string }>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i];
    if (String(row._id).startsWith("pending-")) continue;
    if (row.createdAt) return row.createdAt;
  }
  return null;
}

const GROUP_GAP_MS = 5 * 60 * 1000;
const SCROLL_NEAR_BOTTOM_PX = 96;
const MAX_READ_AVATARS = 4;
/** Full snapshot of the open thread after it has stayed open this long. */
const CHAT_FULL_RELOAD_MS = 12 * 60 * 60 * 1000;
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

function withLocalReadReceipt(
  message: WorkspaceChatMessage,
  userId: string | null,
  userName: string,
): WorkspaceChatMessage {
  if (!userId || hasUserRead(message, userId)) return message;
  return {
    ...message,
    readBy: [...(message.readBy || []), { userId, userName, readAt: new Date().toISOString() }],
  };
}

function withoutLocalReadReceipt(
  message: WorkspaceChatMessage,
  userId: string | null,
): WorkspaceChatMessage {
  if (!userId) return message;
  const readBy = message.readBy || [];
  const next = readBy.filter((entry) => String(entry.userId) !== String(userId));
  if (next.length === readBy.length) return message;
  return { ...message, readBy: next };
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
  _currentUserId: string | null,
) {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  // Never group across different senders — keeps own vs other bubbles clearly separated.
  if (String(prev.senderUserId) !== String(curr.senderUserId)) return false;
  if (isMessageDeleted(prev) || isMessageDeleted(curr)) return false;
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

function ReadByPopoverContent({
  readers,
}: {
  readers: { userId: string; name: string; profilePictureUrl?: string; readAt?: string }[];
}) {
  return (
    <div className="max-h-60 min-w-[180px] overflow-y-auto">
      <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-zinc-400">
        Read by
      </p>
      {readers.map((reader) => (
        <div
          key={reader.userId}
          className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded"
        >
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
            <UserProfileAvatar
              name={reader.name}
              profilePictureUrl={reader.profilePictureUrl}
              enablePreview={false}
              className="!m-0 !h-full !w-full !max-h-full !max-w-full !rounded-full !p-0"
              fallbackClassName="bg-sky-100 text-[10px] font-semibold leading-none text-sky-700"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-800 dark:text-zinc-200">
              {reader.name}
            </p>
            {reader.readAt ? (
              <p className="text-[10px] text-gray-400">
                {new Date(reader.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
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
        readAt: entry.readAt,
      };
    });
  }, [readBy, currentUserId, memberPictureByUserId, memberNameByUserId]);

  if (!readers.length) return null;

  const visibleReaders = readers.slice(0, MAX_READ_AVATARS);
  const overflowCount = readers.length - MAX_READ_AVATARS;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          aria-label={t("workspaceChatSeenBy")}
        >
          <div className="flex items-center">
            {visibleReaders.map((reader, index) => (
              <Tooltip key={reader.userId}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative h-4 w-4 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-[#0b0f14]",
                      index > 0 && "-ml-1.5",
                    )}
                    style={{ zIndex: visibleReaders.length - index }}
                  >
                    <UserProfileAvatar
                      name={reader.name}
                      profilePictureUrl={reader.profilePictureUrl}
                      enablePreview={false}
                      className="!m-0 !h-full !w-full !max-h-full !max-w-full !rounded-full !p-0"
                      fallbackClassName="bg-sky-100 text-[7px] font-semibold leading-none text-sky-700"
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
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="p-0 w-auto">
        <ReadByPopoverContent readers={readers} />
      </PopoverContent>
    </Popover>
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
  const { setUnreadCount, clearUnread, unreadCount } = useWorkspaceChatPanel();
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

  const [messages, setMessages] = useState<WorkspaceChatMessage[]>([]);

  const memberPictureByUserId = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    for (const member of workspaceMembers) {
      map.set(String(member.userId), member.profilePictureUrl);
    }
    if (currentUserId && currentUser?.profilePictureUrl) {
      map.set(String(currentUserId), currentUser.profilePictureUrl);
    }
    // Keep poll/reaction avatars current from message sender payloads too.
    for (const message of messages) {
      const senderId = String(message.senderUserId || "");
      if (senderId && message.senderProfilePictureUrl) {
        map.set(senderId, message.senderProfilePictureUrl);
      }
    }
    return map;
  }, [workspaceMembers, currentUserId, currentUser?.profilePictureUrl, messages]);

  const memberNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of workspaceMembers) {
      map.set(String(member.userId), member.name);
    }
    if (currentUserId) {
      map.set(String(currentUserId), currentUser?.name || "You");
    }
    for (const message of messages) {
      const senderId = String(message.senderUserId || "");
      if (senderId && message.senderName) {
        map.set(senderId, message.senderName);
      }
    }
    return map;
  }, [workspaceMembers, currentUserId, currentUser?.name, messages]);

  const memberPictureRevisionByUserId = useMemo(() => {
    const map = new Map<string, number | undefined>();
    if (currentUserId && currentUser?.profilePictureRevision != null) {
      map.set(String(currentUserId), currentUser.profilePictureRevision);
    }
    return map;
  }, [currentUserId, currentUser?.profilePictureRevision]);

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
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatAttachment[]>([]);
  const [attachingFiles, setAttachingFiles] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const markingReadRef = useRef(false);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const pendingMarkReadQueueRef = useRef<string[]>([]);
  const workspaceIdRef = useRef(workspaceId);
  const lastClearedGroupUnreadRef = useRef<string | null>(null);
  workspaceIdRef.current = workspaceId;
  const loadedWorkspaceRef = useRef<string | null>(null);
  const fetchStartedRef = useRef<string | null>(null);
  const loadGenerationRef = useRef(0);
  const lastLoadedMessageAtRef = useRef<string | null>(null);
  const lastSyncAtRef = useRef(0);
  const composerPad = useChatComposerPad(composerRef, [
    workspaceId,
    replyTo,
    editingMessageId,
    voiceRecording,
    text,
    pendingAttachments.length,
    attachingFiles,
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
    return scheduleJumpToLatest(listRef);
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

  useStickChatListToBottom(listRef, stickToBottomRef, [active, workspaceId]);

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < SCROLL_NEAR_BOTTOM_PX;
    stickToBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom && messages.length > 0);
  }, [messages.length]);

  const loadMessages = useCallback(
    async (options?: { silent?: boolean; after?: string | null; replace?: boolean }) => {
      if (!workspaceId) return;

      const targetWorkspaceId = workspaceId;
      const generation = ++loadGenerationRef.current;
      const replace = Boolean(options?.replace);
      const incremental = Boolean(options?.after) && !replace;
      const silent = Boolean(options?.silent || incremental || replace);
      if (!silent) setLoading(true);

      try {
        const res = await workspaceApi.getMessages(targetWorkspaceId, {
          limit: 50,
          after: incremental ? options?.after || undefined : undefined,
        });
        if (
          loadGenerationRef.current !== generation ||
          targetWorkspaceId !== workspaceId
        ) {
          return;
        }
        const loaded = ((res.data as WorkspaceChatMessage[]) || [])
          .map(enrichMessageProfiles)
          .filter((message) => {
            if (!message.expiresAt) return true;
            return new Date(message.expiresAt).getTime() > Date.now();
          });
        setMessages((prev) => {
          const pending = prev.filter((row) => String(row._id).startsWith("pending-"));
          const base = replace
            ? pending
            : incremental || loadedWorkspaceRef.current === targetWorkspaceId
              ? prev
              : [];
          const next = reconcileChatMessagesAfterFetch(base, loaded);
          const latest = latestMessageCreatedAt(next);
          if (latest) lastLoadedMessageAtRef.current = latest;
          return next;
        });
        loadedWorkspaceRef.current = targetWorkspaceId;
        if (!incremental) lastSyncAtRef.current = Date.now();
        if (active && !silent) stickToBottomRef.current = true;

        if (
          !active &&
          trackUnreadWhenInactive &&
          !incremental &&
          !(typeof window !== "undefined" && isWorkspaceGroupChatPath(window.location.pathname))
        ) {
          const unreadFromServer = loaded.filter(
            (message) =>
              !isOwnMessage(message, currentUserId) && !hasUserRead(message, currentUserId),
          ).length;
          setUnreadCount(unreadFromServer);
        }
      } catch {
        if (!silent) {
          toast({ title: t("workspaceChatLoadFailed"), variant: "destructive" });
        }
      } finally {
        if (!silent && loadGenerationRef.current === generation) {
          setLoading(false);
        }
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

  const flushGroupMarkRead = useCallback(async () => {
    if (markingReadRef.current) return;
    markingReadRef.current = true;
    try {
      while (pendingMarkReadQueueRef.current.length) {
        const targetWorkspaceId = workspaceIdRef.current;
        const batch = pendingMarkReadQueueRef.current.splice(0);
        if (!targetWorkspaceId || !batch.length) continue;
        try {
          const res = await workspaceApi.markMessagesRead(targetWorkspaceId, batch);
          const updated = (res.data as WorkspaceChatMessage[]) || [];
          if (updated.length && workspaceIdRef.current === targetWorkspaceId) {
            setMessages((prev) => {
              let next = prev;
              for (const message of updated) {
                next = mergeChatMessages(next, message);
              }
              return next;
            });
          }
          refreshMessagesUnreadBadge();
          clearGroupChatOsNotification(targetWorkspaceId);
        } catch {
          batch.forEach((id) => markedReadIdsRef.current.delete(id));
          if (workspaceIdRef.current === targetWorkspaceId) {
            const readerId = localStorage.getItem("profit-pilot-user-id");
            setMessages((prev) =>
              prev.map((row) =>
                batch.includes(String(row._id)) ? withoutLocalReadReceipt(row, readerId) : row,
              ),
            );
          }
        }
      }
    } finally {
      markingReadRef.current = false;
      if (pendingMarkReadQueueRef.current.length) {
        void flushGroupMarkRead();
      }
    }
  }, []);

  const markMessagesRead = useCallback(
    (ids: string[]) => {
      const targetWorkspaceId = workspaceIdRef.current;
      if (!targetWorkspaceId || !ids.length) return;

      const pending = ids.filter((id) => {
        const key = String(id);
        return Boolean(key) && !key.startsWith("pending-") && !markedReadIdsRef.current.has(key);
      });
      if (!pending.length) return;

      pending.forEach((id) => markedReadIdsRef.current.add(id));
      pendingMarkReadQueueRef.current.push(...pending);

      const readerId = currentUserId;
      const readerName = currentUser?.name || "";
      if (readerId) {
        setMessages((prev) =>
          prev.map((row) =>
            pending.includes(String(row._id))
              ? withLocalReadReceipt(row, readerId, readerName)
              : row,
          ),
        );
      }
      clearUnread();
      clearGroupChatOsNotification(targetWorkspaceId);
      void flushGroupMarkRead();
    },
    [currentUserId, currentUser?.name, clearUnread, flushGroupMarkRead],
  );

  useEffect(() => {
    if (!workspaceId || mode !== "workspace") {
      setMessages([]);
      clearUnread();
      loadedWorkspaceRef.current = null;
      fetchStartedRef.current = null;
      lastLoadedMessageAtRef.current = null;
      lastSyncAtRef.current = 0;
      markedReadIdsRef.current = new Set();
      return;
    }

    if (loadedWorkspaceRef.current && loadedWorkspaceRef.current !== workspaceId) {
      setMessages([]);
      markedReadIdsRef.current = new Set();
      fetchStartedRef.current = null;
      lastLoadedMessageAtRef.current = null;
      lastSyncAtRef.current = 0;
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

      setMessages((prev) => {
        const next = mergeChatMessages(prev, enrichMessageProfiles(message));
        const latest = latestMessageCreatedAt(next);
        if (latest) lastLoadedMessageAtRef.current = latest;
        return next;
      });

      if (!active && !fromSelf) {
        return;
      }

      if (active && !fromSelf) {
        clearUnread();
      }

      if (active && !fromSelf && !hasUserRead(message, currentUserId)) {
        void markMessagesRead([String(message._id)]);
      }

      if (active && (fromSelf || stickToBottomRef.current)) {
        stickToBottomRef.current = true;
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

  // Catch up after reconnect / tab focus — append only unless the thread has been open 12h.
  useEffect(() => {
    if (mode !== "workspace" || !workspaceId || !active) return;

    const shouldFullReload = () =>
      lastSyncAtRef.current > 0 && Date.now() - lastSyncAtRef.current >= CHAT_FULL_RELOAD_MS;

    const catchUp = () => {
      if (shouldFullReload()) {
        void loadMessages({ silent: true, replace: true });
        return;
      }
      const lastSeenMessageAt = lastLoadedMessageAtRef.current;
      if (!lastSeenMessageAt) return;
      void loadMessages({ silent: true, after: lastSeenMessageAt });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") catchUp();
    };

    window.addEventListener("app-websocket-open", catchUp);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (shouldFullReload()) void loadMessages({ silent: true, replace: true });
    }, CHAT_FULL_RELOAD_MS);
    return () => {
      window.removeEventListener("app-websocket-open", catchUp);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [mode, workspaceId, active, loadMessages]);

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
    if (!active) {
      lastClearedGroupUnreadRef.current = null;
      return;
    }

    const unread = Number(unreadCount) || 0;
    if (unread > 0 && lastClearedGroupUnreadRef.current !== workspaceId) {
      bumpMessagesUnread(-unread);
      lastClearedGroupUnreadRef.current = workspaceId;
    }
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
    if (loadedWorkspaceRef.current === workspaceId || fetchStartedRef.current === workspaceId) {
      return;
    }
    void loadMessages({ silent: true });
  }, [active, workspaceId, loadMessages]);

  useEffect(() => {
    if (!active) return;

    const unreadIds = messages
      .filter((message) => !String(message._id).startsWith("pending-"))
      .filter((message) => !isOwnMessage(message, currentUserId))
      .filter((message) => !hasUserRead(message, currentUserId))
      .filter((message) => !markedReadIdsRef.current.has(String(message._id)))
      .map((message) => String(message._id));

    if (unreadIds.length) {
      void markMessagesRead(unreadIds);
    }
  }, [active, messages, currentUserId, markMessagesRead]);

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
    if (
      (!trimmed && !staged.length) ||
      !workspaceId ||
      sending ||
      attachingFiles ||
      sendLockRef.current
    ) {
      return;
    }

    if (trimmed && isOverChatMessageLimit(trimmed)) {
      toast({
        title: t("workspaceChatSendFailed"),
        description: chatMessageLengthError(trimmed.length),
        variant: "destructive",
      });
      return;
    }

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
    const clientMessageId = newClientMessageId();
    const optimisticId = `pending-${clientMessageId}`;
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
      clientMessageId,
      replyTo: optimisticReply,
      attachments: optimisticAttachments,
      mentionAll,
      mentions,
      createdAt: new Date().toISOString(),
      deliveredTo: [],
      readBy: [],
    };

    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);
    emitLocalGroupChatPreview(optimisticMessage);
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
        clientMessageId,
      });
      const message = res.data as WorkspaceChatMessage;
      if (message) {
        pendingSendIdsRef.current.delete(optimisticId);
        const withReply: WorkspaceChatMessage = {
          ...message,
          clientMessageId: message.clientMessageId || clientMessageId,
          replyTo: message.replyTo?.messageId ? message.replyTo : optimisticReply,
        };
        setMessages((prev) => {
          const withoutPending = prev.filter((row) => String(row._id) !== optimisticId);
          return mergeChatMessages(withoutPending, enrichMessageProfiles(withReply));
        });
        requestAnimationFrame(() => scrollToBottom("smooth"));
      }
      revokePendingAttachments(staged);
    } catch (error) {
      pendingSendIdsRef.current.delete(optimisticId);
      setMessages((prev) => prev.filter((row) => String(row._id) !== optimisticId));
      setText(trimmed);
      if (optimisticReply) setReplyTo(optimisticReply);
      setPendingAttachments(staged);
      toast({
        title: t("workspaceChatSendFailed"),
        description:
          error instanceof Error && error.message
            ? friendlyChatSendError(error.message, trimmed.length)
            : staged.length
              ? "Failed to send attachment"
              : undefined,
        variant: "destructive",
      });
    } finally {
      setSending(false);
      sendLockRef.current = false;
      requestAnimationFrame(() => inputRef.current?.focus());
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
    if (!workspaceId || sending || editingMessageId) return;

    stopTyping();
    setSending(true);
    const clientMessageId = newClientMessageId();
    const optimisticId = `pending-voice-${clientMessageId}`;
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
      clientMessageId,
      attachments: [optimisticAttachment],
      createdAt: new Date().toISOString(),
      deliveredTo: [],
      readBy: [],
    };

    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);
    emitLocalGroupChatPreview(optimisticMessage);
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
        clientMessageId,
      });
      const message = res.data as WorkspaceChatMessage;
      if (message) {
        pendingSendIdsRef.current.delete(optimisticId);
        setMessages((prev) => {
          const withoutPending = prev.filter((row) => String(row._id) !== optimisticId);
          return mergeChatMessages(withoutPending, enrichMessageProfiles({
            ...message,
            clientMessageId: message.clientMessageId || clientMessageId,
          }));
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
      if (message) {
        setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
        emitLocalGroupChatPreview(message);
      }
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } catch {
      toast({ title: "Couldn't create poll", variant: "destructive" });
      throw new Error("Poll creation failed");
    } finally {
      setSending(false);
    }
  };

  const handleVotePoll = async (messageId: string, optionIndex: number) => {
    if (!workspaceId || votingMessageId || !currentUserId) return;
    setVotingMessageId(messageId);
    setMessages((prev) =>
      prev.map((message) =>
        String(message._id) === messageId
          ? applyOptimisticPollVote(message, currentUserId, optionIndex)
          : message,
      ),
    );
    try {
      const res = await workspaceApi.voteMessagePoll(workspaceId, messageId, optionIndex);
      const message = res.data as WorkspaceChatMessage;
      if (message) setMessages((prev) => mergeChatMessages(prev, enrichMessageProfiles(message)));
    } catch {
      // Reload from last known server state via silent refresh of this message is heavy;
      // reverse by re-fetching messages is safer if vote fails.
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

    // Mobile: Enter inserts a newline (easier captions). Desktop: Enter sends.
    if (event.key === "Enter" && !event.shiftKey && window.innerWidth >= 1024) {
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
        "relative flex h-full min-h-0 flex-col bg-white dark:bg-[#0b0f14]",
        className,
      )}
    >
          {/* Header — stay pinned on mobile while the thread scrolls */}
          <div
            className={cn(
              "z-20 shrink-0",
              variant === "panel"
                ? "p-3"
                : "sticky top-0 border-b border-sky-100 bg-white/95 px-2 py-2.5 backdrop-blur-sm max-lg:pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 lg:static lg:py-3 dark:border-white/10 dark:bg-[#11161d]/95",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 sm:gap-3",
                variant === "panel" &&
                  "rounded-2xl border border-sky-200 bg-sky-100 px-3 py-3 dark:border-sky-500/30 dark:bg-sky-500/20",
              )}
            >
              {onBack ? (
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sky-600 active:bg-sky-50 dark:text-sky-300 dark:active:bg-white/10 lg:hidden"
                  onClick={onBack}
                  aria-label={t("chatBack")}
                >
                  <ChevronLeft size={26} strokeWidth={2.25} />
                </button>
              ) : null}
              <WorkspaceProfileAvatar
                name={title}
                profilePictureUrl={activeWorkspace.profilePictureUrl}
                pictureRevision={activeWorkspace.profilePictureRevision}
                className="h-10 w-10 border-2 border-sky-300 dark:border-sky-500/50"
                fallbackClassName="bg-sky-400 text-xs font-bold text-white"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold leading-tight text-gray-900 dark:text-zinc-50">{title}</p>
                <WorkspaceActiveUsersRow users={activeUsers} />
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {headerActions}
                <ChatInfoButton label={t("chatInfo")} onClick={() => setChatInfoOpen(true)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-sky-200/70 dark:text-zinc-300 dark:hover:bg-white/10"
                      aria-label="Chat options"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={() => {
                        const after = lastLoadedMessageAtRef.current;
                        void loadMessages(
                          after ? { silent: true, after } : { silent: true },
                        );
                      }}
                    >
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
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-sky-200/70 dark:text-zinc-300 dark:hover:bg-white/10"
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
                    className={cn(
                      "relative z-10 h-full min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y px-3 pt-4 scroll-smooth sm:px-4",
                      variant !== "page" && "pb-5",
                    )}
                    style={variant === "page" ? { paddingBottom: composerPad } : undefined}
                    onContextMenu={(event) => event.preventDefault()}
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
                      <div className="rounded-[1.15rem] bg-[#F4F4F5] px-3 py-2 text-sm leading-snug text-gray-800 dark:bg-[#1e2732] dark:text-zinc-100">
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
                    const showReactions = !deleted && hasChatReactions(message.reactions);
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
                            <div className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full">
                              <UserProfileAvatar
                                name={message.senderName}
                                profilePictureUrl={senderAvatar}
                                className="!m-0 !h-full !w-full !rounded-full !p-0"
                                fallbackClassName="bg-[#F4F4F5] text-[9px] font-semibold text-gray-600"
                              />
                            </div>
                          ) : null}

                          <div
                            className={cn(
                              "group/msg flex min-w-0 max-w-[85%] flex-col",
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
                                  "rounded-[1.15rem] px-3 py-1.5 text-sm leading-snug",
                                  deleted
                                    ? own
                                      ? "bg-gray-200 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400"
                                      : "bg-[#F4F4F5] text-gray-400 dark:bg-[#1e2732] dark:text-zinc-500"
                                    : own
                                      ? "text-white"
                                      : "bg-[#F4F4F5] text-gray-800 dark:bg-[#1e2732] dark:text-zinc-100",
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
                                      memberPictureByUserId={memberPictureByUserId}
                                      memberNameByUserId={memberNameByUserId}
                                      memberPictureRevisionByUserId={memberPictureRevisionByUserId}
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
                                {showReactions ? (
                                  <ChatMessageReactions
                                    reactions={message.reactions}
                                    currentUserId={currentUserId}
                                    own={own}
                                    disabled={reactingMessageId === String(message._id)}
                                    onReact={(emoji) => void handleReact(String(message._id), emoji)}
                                  />
                                ) : null}
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
                                  receipt === "read" ? (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button type="button" className="cursor-pointer hover:opacity-70 transition-opacity">
                                          <ReadReceiptIcon
                                            state={receipt}
                                            allRead={everyoneRead}
                                          />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent side="top" align="end" className="p-0 w-auto">
                                        <ReadByPopoverContent
                                          readers={getMessageReaders(message.readBy, currentUserId).map((entry) => {
                                            const uid = String(entry.userId);
                                            return {
                                              userId: uid,
                                              name: entry.userName || memberNameByUserId.get(uid) || "User",
                                              profilePictureUrl: memberPictureByUserId.get(uid) || undefined,
                                              readAt: entry.readAt,
                                            };
                                          })}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  ) : (
                                    <ReadReceiptIcon
                                      state={receipt}
                                      allRead={false}
                                    />
                                  )
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
                    className="flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-sky-50 dark:border-white/10 dark:bg-[#1a222d] dark:text-zinc-200 dark:hover:bg-white/10"
                  >
                    <ChevronDown size={14} />
                    New messages
                  </button>
                </div>
              ) : null}
                  </div>
              </div>

            {/* Composer — sits above native soft keyboard via visualViewport shell */}
            <div
              ref={composerRef}
              data-chat-composer
              className={cn(
                variant === "panel"
                  ? "relative shrink-0 border-t-2 border-sky-300 bg-white px-4 py-3 dark:border-sky-500/40 dark:bg-[#11161d]"
                  : "pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white via-white/95 to-transparent px-2 chat-composer-pad pt-6 max-lg:pt-4 lg:bg-[#f0f2f5] lg:bg-none lg:px-3 lg:pb-0 lg:pt-4 dark:from-[#0b0f14] dark:via-[#0b0f14]/95 dark:to-transparent dark:lg:bg-[#11161d]",
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
                    "mb-1.5 flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-gray-700 dark:text-zinc-200",
                    variant === "panel"
                      ? "mb-2 rounded-xl bg-sky-50 dark:bg-sky-500/15"
                      : "bg-white/95 dark:bg-[#1a222d]",
                  )}
                >
                  <span>{t("directChatEditing")}</span>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
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
              {attachingFiles ? (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-500 ring-1 ring-black/5 dark:bg-[#1a222d] dark:text-zinc-400 dark:ring-white/10">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
                  Preparing photo…
                </div>
              ) : null}
              <div
                className={cn(
                  "flex items-center gap-1.5 py-1 transition-colors",
                    variant === "panel"
                      ? "border-2 border-sky-300 bg-sky-50/50 pl-2 pr-1 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:focus-within:bg-[#1a222d] dark:focus-within:ring-sky-500/20"
                      : "rounded-lg border-0 bg-white px-2.5 py-1.5 shadow-none ring-1 ring-black/5 sm:gap-2 sm:px-3 dark:bg-[#1a222d] dark:ring-white/10",
                    variant === "panel" && (inputExpanded ? "rounded-2xl" : "rounded-full"),
                    variant === "page" &&
                      voiceRecording &&
                      "border-transparent bg-transparent p-0 shadow-none ring-0 dark:bg-transparent",
                  )}
                >
                {!voiceRecording ? (
                  <button
                    type="button"
                    onClick={() => setPollDialogOpen(true)}
                    disabled={sending || Boolean(editingMessageId)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-sky-100 hover:text-sky-700 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-300"
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
                <ChatComposerInput
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
                  placeholder={
                    pendingAttachments.length ? "Add a caption…" : t("workspaceChatSend")
                  }
                  rows={1}
                  inputMode="text"
                  enterKeyHint={
                    typeof window !== "undefined" && window.innerWidth < 1024 ? "enter" : "send"
                  }
                  autoComplete="off"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  spellCheck
                  className={cn(
                    "w-full resize-none bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500",
                    variant === "panel"
                      ? "max-h-[100px] min-h-[2.5rem] py-2 text-sm"
                      : "max-h-[180px] min-h-[36px] py-2 text-[16px] leading-5 lg:text-[15px]",
                  )}
                />
                ) : null}
                {!voiceRecording ? (
                  <ChatAttachButton
                    className="h-9 w-9"
                    iconSize={18}
                    disabled={sending || attachingFiles || Boolean(editingMessageId)}
                    onFilesSelected={queuePendingAttachments}
                  />
                ) : null}
                {(!text.trim() && !pendingAttachments.length && !editingMessageId) ||
                voiceRecording ? (
                  <ChatVoiceRecorderButton
                    className={cn(voiceRecording ? "w-full" : "h-9 w-9")}
                    disabled={sending || attachingFiles || Boolean(editingMessageId)}
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
                  disabled={
                    (!text.trim() && !pendingAttachments.length) || sending || attachingFiles
                  }
                  onClick={() => void handleSend()}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 transition-all",
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
                      size={15}
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
