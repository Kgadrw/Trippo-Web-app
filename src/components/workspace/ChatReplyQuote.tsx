import { cn } from "@/lib/utils";

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
        "mb-1.5 w-full rounded-lg border-l-[3px] px-2.5 py-1.5 text-left transition-colors",
        own
          ? "border-white/70 bg-white/15 text-white/95 hover:bg-white/20"
          : "border-sky-400 bg-white/80 text-gray-700 hover:bg-white",
        className,
      )}
    >
      <p
        className={cn(
          "truncate text-[11px] font-semibold",
          own ? "text-white" : "text-sky-700",
        )}
      >
        {replyTo.senderName || "User"}
      </p>
      <p
        className={cn(
          "line-clamp-2 text-[11px] leading-snug",
          deleted && "italic opacity-80",
          own ? "text-white/85" : "text-gray-600",
        )}
      >
        {preview}
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
    <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
      <div className="min-w-0 border-l-[3px] border-sky-400 pl-2.5">
        <p className="text-xs font-semibold text-sky-700">
          {title}
          {replyTo.senderName ? ` · ${replyTo.senderName}` : ""}
        </p>
        <p className={cn("truncate text-xs text-gray-600", deleted && "italic")}>{preview}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 text-xs font-medium text-sky-600 hover:text-sky-700"
      >
        {cancelLabel}
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
  target.classList.add("ring-2", "ring-sky-300", "ring-offset-1");
  window.setTimeout(() => {
    target.classList.remove("ring-2", "ring-sky-300", "ring-offset-1");
  }, 1200);
}
