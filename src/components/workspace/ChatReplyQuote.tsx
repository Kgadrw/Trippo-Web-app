import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatEmojiText } from "@/components/workspace/ChatEmojiText";

export type ChatReplyTo = {
  messageId: string;
  senderUserId?: string | null;
  senderName?: string;
  body?: string;
  deletedAt?: string | null;
};

type ChatReplyQuoteProps = {
  replyTo: ChatReplyTo;
  own?: boolean;
  deletedLabel: string;
  onJump?: (messageId: string) => void;
  className?: string;
};

export function ChatReplyQuote({
  replyTo,
  own = false,
  deletedLabel,
  onJump,
  className,
}: ChatReplyQuoteProps) {
  const messageId = String(replyTo.messageId || "");
  const deleted = Boolean(replyTo.deletedAt);
  const preview = deleted ? deletedLabel : (replyTo.body || "").trim() || "…";

  return (
    <button
      type="button"
      disabled={!messageId || !onJump}
      onClick={() => {
        if (messageId && onJump) onJump(messageId);
      }}
      className={cn(
        "mb-1.5 w-full rounded-md border-l-[3px] px-2.5 py-1.5 text-left shadow-none transition-colors",
        own
          ? "border-white/50 bg-black/10 text-white/95 hover:bg-black/15"
          : "border-sky-300 bg-black/[0.03] text-gray-700 hover:bg-black/[0.05] dark:border-sky-400/50 dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/[0.1]",
        className,
      )}
    >
      <p
        className={cn(
          "truncate text-[11px] font-semibold",
          own ? "text-white" : "text-sky-700 dark:text-sky-300",
        )}
      >
        {replyTo.senderName || "User"}
      </p>
      <p
        className={cn(
          "line-clamp-2 text-[11px] leading-snug",
          deleted && "italic opacity-80",
          own ? "text-white/85" : "text-gray-600 dark:text-zinc-400",
        )}
      >
        {deleted ? preview : <ChatEmojiText text={preview} size={14} />}
      </p>
    </button>
  );
}

type ChatReplyComposerBarProps = {
  replyTo: ChatReplyTo;
  title: string;
  deletedLabel: string;
  cancelLabel: string;
  onCancel: () => void;
};

export function ChatReplyComposerBar({
  replyTo,
  title,
  deletedLabel,
  cancelLabel,
  onCancel,
}: ChatReplyComposerBarProps) {
  const deleted = Boolean(replyTo.deletedAt);
  const preview = deleted ? deletedLabel : (replyTo.body || "").trim() || "…";

  return (
    <div className="mb-1.5 flex items-start justify-between gap-2 rounded-t-xl border-b border-sky-100/80 bg-sky-50/80 px-3 py-2 shadow-none dark:border-sky-500/20 dark:bg-sky-500/15">
      <div className="min-w-0 border-l-[3px] border-sky-300 pl-2.5 dark:border-sky-400">
        <p className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
          {title}{replyTo.senderName ? ` · ${replyTo.senderName}` : ""}
        </p>
        <p className={cn("truncate text-xs text-gray-600 dark:text-zinc-300", deleted && "italic")}>
          {deleted ? preview : <ChatEmojiText text={preview} size={14} />}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sky-600 hover:bg-sky-100 hover:text-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/20 dark:hover:text-sky-200"
        aria-label={cancelLabel}
        title={cancelLabel}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function normalizeReplyTo(
  message: {
    _id: string;
    senderUserId?: string | null;
    senderName?: string;
    body?: string;
    deletedAt?: string | null;
  },
): ChatReplyTo {
  return {
    messageId: String(message._id),
    senderUserId: message.senderUserId ? String(message.senderUserId) : null,
    senderName: message.senderName || "User",
    body: String(message.body || "").trim().slice(0, 280),
    deletedAt: message.deletedAt || null,
  };
}

export function scrollChatToMessage(
  listEl: HTMLElement | null,
  messageId: string,
) {
  if (!listEl || !messageId) return;
  const target = listEl.querySelector(
    `[data-chat-message-id="${CSS.escape(messageId)}"]`,
  ) as HTMLElement | null;
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("ring-1", "ring-sky-200");
  window.setTimeout(() => {
    target.classList.remove("ring-1", "ring-sky-200");
  }, 1200);
}
