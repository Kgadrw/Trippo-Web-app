import { forwardRef, useLayoutEffect, useMemo, useRef, type TextareaHTMLAttributes } from "react";
import { ChatEmojiText, splitEmojiParts } from "@/components/workspace/ChatEmojiText";
import { cn } from "@/lib/utils";

type ChatComposerInputProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "children"
> & {
  value: string;
};

/**
 * Composer that shows Apple-style HD emoji while keeping a real textarea for typing.
 * Mirror overlay is only used when the draft contains emoji, so the caret stays
 * flush against normal typed letters on desktop. Bold (`**text**`) is rendered in
 * sent messages, not while typing, to avoid caret misalignment.
 */
export const ChatComposerInput = forwardRef<HTMLTextAreaElement, ChatComposerInputProps>(
  function ChatComposerInput({ value, className, onScroll, placeholder, ...props }, ref) {
    const mirrorRef = useRef<HTMLDivElement>(null);
    const localRef = useRef<HTMLTextAreaElement | null>(null);
    const showEmojiMirror = useMemo(
      () => splitEmojiParts(value).some((part) => part.type === "emoji"),
      [value],
    );

    const setRefs = (node: HTMLTextAreaElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    useLayoutEffect(() => {
      const el = localRef.current;
      const mirror = mirrorRef.current;
      if (!el || !mirror || !showEmojiMirror) return;
      mirror.scrollTop = el.scrollTop;
      mirror.scrollLeft = el.scrollLeft;
    }, [value, showEmojiMirror]);

    return (
      <div className="relative min-h-0 min-w-0 flex-1 self-center">
        {showEmojiMirror ? (
          <div
            ref={mirrorRef}
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words text-gray-800 dark:text-zinc-100",
              className,
            )}
          >
            <ChatEmojiText text={value} size={20} />
          </div>
        ) : null}
        <textarea
          {...props}
          ref={setRefs}
          value={value}
          placeholder={placeholder}
          onScroll={(event) => {
            if (mirrorRef.current) {
              mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
              mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
            onScroll?.(event);
          }}
          className={cn(
            className,
            "relative z-[1] w-full bg-transparent caret-gray-900 selection:bg-sky-200/60 dark:caret-zinc-100 dark:selection:bg-sky-500/40",
            showEmojiMirror ? "text-transparent" : "text-gray-800 dark:text-zinc-100",
          )}
        />
      </div>
    );
  },
);
