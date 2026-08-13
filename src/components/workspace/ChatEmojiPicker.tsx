import { useMemo, useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const EMOJI_GROUPS: Array<{ label: string; emojis: string[] }> = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤩", "😇",
      "🙂", "😉", "😢", "😭", "😤", "😡", "🤔", "😴", "🤗", "🫡",
      "😅", "😆", "😋", "😜", "😏", "😔", "😮", "😱", "🤢", "🫠",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👏", "🙌", "🙏", "👌", "✌️", "🤞", "🤝", "💪",
      "👋", "🫶", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "💔", "💯", "🔥", "✨", "⭐", "🎉", "✅", "❌", "⚡", "📌",
    ],
  },
  {
    label: "People",
    emojis: [
      "👀", "💬", "👤", "👥", "🧑‍💻", "👩‍💼", "👨‍💼", "🙋", "💁", "🕺",
    ],
  },
  {
    label: "Work",
    emojis: [
      "📅", "⏰", "📝", "📁", "📎", "📧", "📞", "💡", "📊", "🛒",
      "💰", "🧾", "📦", "🚚", "🏠", "🌍", "☕", "🍕", "🚀", "🎯",
    ],
  },
];

export function insertEmojiInText(
  value: string,
  emoji: string,
  selectionStart: number,
  selectionEnd: number,
) {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  return {
    next: `${value.slice(0, start)}${emoji}${value.slice(end)}`,
    caret: start + emoji.length,
  };
}

type ChatEmojiPickerProps = {
  onSelect: (emoji: string) => void;
  label?: string;
  className?: string;
  buttonClassName?: string;
};

export function ChatEmojiPicker({
  onSelect,
  label = "Emoji",
  className,
  buttonClassName,
}: ChatEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const groups = useMemo(() => EMOJI_GROUPS, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-sky-100 hover:text-sky-700",
            buttonClassName,
          )}
          aria-label={label}
          title={label}
        >
          <Smile size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={10}
        className={cn(
          "z-[130] w-[min(20rem,calc(100vw-1.5rem))] border-sky-100 p-2 shadow-xl",
          className,
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
          {groups.map((group, index) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(index)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                activeGroup === index
                  ? "bg-sky-500 text-white"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100",
              )}
            >
              {group.label}
            </button>
          ))}
        </div>
        <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto pr-0.5">
          {groups[activeGroup]?.emojis.map((emoji) => (
            <button
              key={`${groups[activeGroup].label}-${emoji}`}
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-sky-50"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
