import { ChatEmojiPicker } from "@/components/workspace/ChatEmojiPicker";
import { cn } from "@/lib/utils";

type ChatReaction = {
  emoji: string;
  userIds: string[];
};

export function ChatMessageReactions({
  reactions,
  currentUserId,
  own,
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
}) {
  const visible = (reactions || []).filter((reaction) => reaction.emoji && reaction.userIds?.length);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-nowrap items-center gap-0.5 self-end",
        own ? "order-first" : "order-last",
        className,
      )}
    >
      {visible.map((reaction) => {
        const selected = Boolean(currentUserId && reaction.userIds.includes(String(currentUserId)));
        return (
          <button
            key={reaction.emoji}
            type="button"
            disabled={disabled}
            onClick={() => onReact(reaction.emoji)}
            className={cn(
              "inline-flex min-h-6 items-center gap-0.5 rounded-full px-1.5 text-xs transition-colors disabled:opacity-50",
              selected
                ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
                : "bg-gray-100/90 text-gray-600 hover:bg-gray-200",
            )}
          >
            <span>{reaction.emoji}</span>
            <span className="text-[11px] font-medium">{reaction.userIds.length}</span>
          </button>
        );
      })}
      {!disabled ? (
        <ChatEmojiPicker
          label="Add reaction"
          onSelect={onReact}
          buttonClassName="mb-0 h-6 w-6 rounded-full text-gray-400 hover:bg-gray-100 hover:text-sky-600 lg:h-6 lg:w-6"
          className="z-[180]"
        />
      ) : null}
    </div>
  );
}
