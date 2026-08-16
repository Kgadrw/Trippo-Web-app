import { forwardRef, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { ChatEmojiText } from "@/components/workspace/ChatEmojiText";
import { cn } from "@/lib/utils";

type ChatComposerInputProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "children"
> & {
  value: string;
};

/**
 * Composer that shows Apple-style HD emoji while keeping a real textarea for typing.
 * The visible layer mirrors text; the textarea caret/selection stay interactive.
 */
export const ChatComposerInput = forwardRef<HTMLTextAreaElement, ChatComposerInputProps>(
  function ChatComposerInput({ value, className, onScroll, placeholder, ...props }, ref) {
    const mirrorRef = useRef<HTMLDivElement>(null);
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (node: HTMLTextAreaElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    useLayoutEffect(() => {
      const el = localRef.current;
      const mirror = mirrorRef.current;
      if (!el || !mirror) return;
      mirror.scrollTop = el.scrollTop;
      mirror.scrollLeft = el.scrollLeft;
    }, [value]);

    return (
      <div className="relative min-h-0 min-w-0 flex-1 self-center">
        <div
          ref={mirrorRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words",
            className,
            !value && "opacity-0",
          )}
        >
          {value ? <ChatEmojiText text={value} size={20} /> : null}
        </div>
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
            "relative z-[1] w-full bg-transparent caret-gray-900 selection:bg-sky-200/60",
            value ? "text-transparent" : "text-gray-800",
          )}
        />
      </div>
    );
  },
);
