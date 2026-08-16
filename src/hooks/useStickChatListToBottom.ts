import { useEffect, type RefObject } from "react";

function isMobileChatViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
}

/**
 * Keep a chat message list stuck to the latest bubble when its height changes
 * (composer resize / soft keyboard). On mobile, height *growth* (keyboard
 * closing) uses smooth scroll so messages slide down instead of jumping.
 */
export function useStickChatListToBottom(
  listRef: RefObject<HTMLElement | null>,
  stickToBottomRef: RefObject<boolean>,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let lastHeight = el.clientHeight;
    let raf = 0;

    const pin = (smooth: boolean) => {
      if (!stickToBottomRef.current) return;
      if (smooth && isMobileChatViewport()) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    };

    const observer = new ResizeObserver(() => {
      const nextHeight = el.clientHeight;
      const grew = nextHeight > lastHeight + 6;
      lastHeight = nextHeight;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        pin(grew);
      });
    });

    observer.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls when to rebind
  }, deps);
}

/**
 * Open-chat scroll: snap once, then smoothly catch layout/keyboard settle on mobile.
 */
export function scheduleJumpToLatest(
  listRef: RefObject<HTMLElement | null>,
  options?: { onStart?: () => void },
): () => void {
  options?.onStart?.();
  const timers: number[] = [];
  const el = () => listRef.current;

  const snap = () => {
    const node = el();
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  };

  const glide = () => {
    const node = el();
    if (!node) return;
    if (isMobileChatViewport()) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    } else {
      node.scrollTop = node.scrollHeight;
    }
  };

  snap();
  requestAnimationFrame(snap);

  if (isMobileChatViewport()) {
    // Follow keyboard/composer settle with a soft slide, not hard jumps.
    timers.push(window.setTimeout(glide, 90));
    timers.push(window.setTimeout(glide, 260));
    timers.push(window.setTimeout(glide, 480));
  } else {
    timers.push(window.setTimeout(snap, 50));
    timers.push(window.setTimeout(snap, 180));
    timers.push(window.setTimeout(snap, 400));
  }

  return () => {
    for (const id of timers) window.clearTimeout(id);
  };
}
