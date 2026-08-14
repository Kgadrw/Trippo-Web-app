import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { MoreVertical, Reply } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ChatBubbleAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

const LONG_PRESS_MS = 420;
const SWIPE_REPLY_THRESHOLD = 56;
const SWIPE_MAX = 72;
const MOVE_CANCEL_PX = 12;

function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // ignore
  }
}

/**
 * WhatsApp/Telegram-style message interactions:
 * - swipe horizontally to reply (mobile) — locked to the bubble only
 * - long-press for action sheet (mobile)
 * - hover actions + double-click reply (desktop)
 */
export function ChatInteractiveBubble({
  own = false,
  disabled = false,
  actions,
  onReply,
  actionsTitle = "Message",
  children,
  className,
}: {
  own?: boolean;
  disabled?: boolean;
  actions: ChatBubbleAction[];
  onReply?: () => void;
  actionsTitle?: string;
  children: ReactNode;
  className?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [replyArmed, setReplyArmed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const trackingSwipe = useRef(false);
  const replyArmedRef = useRef(false);
  const offsetXRef = useRef(0);
  const suppressClick = useRef(false);
  const didLongPress = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const openActions = useCallback(() => {
    if (disabled || !actions.length) return;
    didLongPress.current = true;
    suppressClick.current = true;
    haptic(18);
    setSheetOpen(true);
  }, [actions.length, disabled]);

  // Non-passive listeners so we can preventDefault once a horizontal reply swipe locks —
  // stops the whole chat thread from rubber-banding sideways on mobile.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || disabled) return;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      startRef.current = { x: touch.clientX, y: touch.clientY };
      trackingSwipe.current = false;
      didLongPress.current = false;
      replyArmedRef.current = false;
      setReplyArmed(false);
      clearLongPress();
      longPressTimer.current = window.setTimeout(() => {
        openActions();
      }, LONG_PRESS_MS);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!startRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;

      if (!trackingSwipe.current) {
        if (Math.abs(dx) > MOVE_CANCEL_PX || Math.abs(dy) > MOVE_CANCEL_PX) {
          clearLongPress();
        }
        if (Math.abs(dx) > MOVE_CANCEL_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
          trackingSwipe.current = true;
        } else {
          return;
        }
      }

      event.preventDefault();
      const directed = own ? Math.min(0, dx) : Math.max(0, dx);
      const next = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, directed));
      offsetXRef.current = next;
      setOffsetX(next);
      const armed = Math.abs(next) >= SWIPE_REPLY_THRESHOLD;
      if (armed && !replyArmedRef.current) haptic(8);
      replyArmedRef.current = armed;
      setReplyArmed(armed);
    };

    const finishGesture = () => {
      clearLongPress();
      const shouldReply = replyArmedRef.current && onReply;
      if (shouldReply) {
        suppressClick.current = true;
        haptic(14);
        onReply();
      }
      offsetXRef.current = 0;
      setOffsetX(0);
      replyArmedRef.current = false;
      setReplyArmed(false);
      trackingSwipe.current = false;
      startRef.current = null;
      window.setTimeout(() => {
        suppressClick.current = false;
        didLongPress.current = false;
      }, 280);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", finishGesture);
    el.addEventListener("touchcancel", finishGesture);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", finishGesture);
      el.removeEventListener("touchcancel", finishGesture);
    };
  }, [clearLongPress, disabled, onReply, openActions, own]);

  const replyHintOpacity = Math.min(1, Math.abs(offsetX) / SWIPE_REPLY_THRESHOLD);
  const showDesktopChrome = !disabled && (hovered || sheetOpen);

  return (
    <>
      <div
        className={cn(
          "group/bubble relative max-w-full",
          own ? "ml-auto" : "mr-auto",
          className,
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {!disabled && (onReply || (own && actions.length > 0)) ? (
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 z-20 hidden -translate-y-1/2 items-center gap-0.5 lg:flex",
              own ? "right-full mr-1.5" : "left-full ml-1.5",
              showDesktopChrome
                ? "pointer-events-auto opacity-100"
                : "opacity-0 group-hover/bubble:pointer-events-auto group-hover/bubble:opacity-100",
              "transition-opacity duration-150",
            )}
          >
            {onReply ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onReply();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow-none ring-1 ring-black/[0.04] hover:bg-sky-50 hover:text-sky-700"
                aria-label="Reply"
                title="Reply"
              >
                <Reply size={15} />
              </button>
            ) : null}
            {own && actions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-none ring-1 ring-black/[0.04] hover:bg-sky-50 hover:text-sky-700"
                    aria-label={actionsTitle}
                    title={actionsTitle}
                  >
                    <MoreVertical size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="min-w-[10rem] border-0 bg-white/95 text-gray-500 shadow-none"
                >
                  {actions.map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      disabled={action.disabled}
                      className={cn(
                        "font-normal text-gray-500 focus:bg-sky-50 focus:text-gray-700",
                        action.destructive && "text-red-400 focus:text-red-500",
                      )}
                      onClick={action.onSelect}
                    >
                      {action.icon ? <span className="mr-2 inline-flex">{action.icon}</span> : null}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}

        <div className="relative max-w-full overflow-x-clip">
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 z-0 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-sky-500 text-white shadow-none transition-opacity lg:hidden",
              own ? "right-full mr-2" : "left-full ml-2",
            )}
            style={{ opacity: replyHintOpacity }}
            aria-hidden
          >
            <Reply size={15} />
          </div>

          <div
            ref={surfaceRef}
            className="relative z-10 touch-pan-y select-none lg:select-text"
            style={{
              transform: offsetX ? `translateX(${offsetX}px)` : undefined,
              transition: trackingSwipe.current ? "none" : "transform 160ms ease-out",
              touchAction: "pan-y",
            }}
            onDoubleClick={(event) => {
              if (disabled || !onReply) return;
              if (window.matchMedia("(max-width: 1023px)").matches) return;
              event.preventDefault();
              onReply();
            }}
            onContextMenu={(event) => {
              if (window.matchMedia("(max-width: 1023px)").matches) {
                event.preventDefault();
                openActions();
              }
            }}
            onClickCapture={(event) => {
              if (suppressClick.current || didLongPress.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            {children}
          </div>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="gap-4 rounded-t-2xl border-0 bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-none lg:hidden"
        >
          <SheetHeader className="pb-1 text-left">
            <SheetTitle className="text-base font-normal text-gray-500">{actionsTitle}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  setSheetOpen(false);
                  window.setTimeout(() => action.onSelect(), 80);
                }}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl border-0 px-3 text-left text-[15px] font-normal shadow-none transition-colors active:scale-[0.99] disabled:opacity-40",
                  action.destructive
                    ? "text-red-400 hover:bg-red-50"
                    : "text-gray-500 hover:bg-sky-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    action.destructive
                      ? "bg-red-50 text-red-400"
                      : "bg-sky-50 text-sky-500",
                  )}
                >
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Edge swipe-right (from left) to leave a conversation — WhatsApp back gesture. */
export function useChatBackSwipe(onBack: () => void, enabled = true) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (event: ReactTouchEvent) => {
      if (!enabled || window.innerWidth >= 1024) return;
      const touch = event.touches[0];
      if (!touch || touch.clientX > 28) {
        startRef.current = null;
        return;
      }
      startRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (event: ReactTouchEvent) => {
      if (!enabled) return;
      const start = startRef.current;
      if (!start) return;
      const touch = event.changedTouches[0];
      startRef.current = null;
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (dx > 64 && Math.abs(dy) < 48) {
        haptic(10);
        onBack();
      }
    },
    [enabled, onBack],
  );

  return { onTouchStart, onTouchEnd };
}
