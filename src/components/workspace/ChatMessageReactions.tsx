import {
  ChatEmojiText,
  nativeEmojiToUnified,
} from "@/components/workspace/ChatEmojiText";
import { ChatEmojiPicker } from "@/components/workspace/ChatEmojiPicker";
import { Emoji, EmojiStyle } from "emoji-picker-react";
import { cn } from "@/lib/utils";

type ChatReaction = {
  emoji: string;
  userIds: string[];
};

export function hasChatReactions(reactions?: ChatReaction[]) {
  return Boolean(reactions?.some((reaction) => reaction.emoji && reaction.userIds?.length));
}

/** Reaction emoji control — hidden until message hover; can open from message click. */
export function ChatMessageAddReaction({
  disabled = false,
  onReact,
  className,
  open,
  onOpenChange,
}: {
  disabled?: boolean;
  onReact: (emoji: string) => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  if (disabled) return null;
  return (
    <ChatEmojiPicker
      label="Add reaction"
      onSelect={onReact}
      open={open}
      onOpenChange={onOpenChange}
      buttonClassName={cn(
        "mb-0 h-8 w-8 shrink-0 rounded-full border-0 bg-transparent p-0 text-gray-500 shadow-none",
        "h-8 w-8 transition-[opacity,color,background-color] duration-150",
        "hover:bg-sky-50 hover:text-sky-600 active:bg-transparent",
        // Hidden by default — only appear on message hover / open picker
        "pointer-events-none opacity-0",
        "group-hover/msg:pointer-events-auto group-hover/msg:opacity-100",
        "group-focus-within/msg:pointer-events-auto group-focus-within/msg:opacity-100",
        "data-[state=open]:pointer-events-auto data-[state=open]:opacity-100",
        className,
      )}
      className="z-[180]"
    />
  );
}

/**
 * Small reacted chips in the bottom-right of their own message bubble (in-flow),
 * so they never float onto another user's message.
 */
export function ChatMessageReactions({
  reactions,
  currentUserId,
  own = false,
  disabled = false,
  onReact,
  className,
}: {
  reactions?: ChatReaction[];
  currentUserId: string | null;
  own?: boolean;
  disabled?: boolean;
  onReact: (emoji: string) => void;
  className?: string;
  /** @deprecated Add control is rendered separately via ChatMessageAddReaction. */
  showAdd?: boolean;
}) {
  const visible = (reactions || []).filter((reaction) => reaction.emoji && reaction.userIds?.length);
  if (!visible.length) return null;

  return (
    <div
      className={cn("mt-1 flex justify-end gap-0.5", className)}
      data-chat-reactions
    >
      {visible.map((reaction) => {
        const selected = Boolean(currentUserId && reaction.userIds.includes(String(currentUserId)));
        const unified = nativeEmojiToUnified(reaction.emoji);
        return (
          <button
            key={reaction.emoji}
            type="button"
            disabled={disabled}
            onClick={() => onReact(reaction.emoji)}
            className={cn(
              "inline-flex items-end gap-0.5 border-0 bg-transparent p-0 shadow-none",
              "transition-opacity disabled:opacity-50",
              selected ? "opacity-100" : "opacity-95 hover:opacity-100",
            )}
            aria-label={`React with ${reaction.emoji}`}
          >
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-visible drop-shadow-sm">
              <Emoji unified={unified} size={14} emojiStyle={EmojiStyle.APPLE} lazyLoad={false} />
            </span>
            {reaction.userIds.length > 1 ? (
              <span
                className={cn(
                  "pb-px text-[10px] font-semibold leading-none tabular-nums drop-shadow-sm",
                  own ? "text-white/90" : "text-gray-600",
                )}
              >
                {reaction.userIds.length}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ChatReactionEmoji({ emoji, size = 18 }: { emoji: string; size?: number }) {
  return (
    <span className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <Emoji unified={nativeEmojiToUnified(emoji)} size={size} emojiStyle={EmojiStyle.APPLE} lazyLoad />
    </span>
  );
}

export function ChatReactionLabel({ emoji }: { emoji: string }) {
  return <ChatEmojiText text={emoji} size={18} />;
}
