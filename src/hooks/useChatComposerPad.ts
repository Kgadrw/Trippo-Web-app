import { useEffect, useState, type RefObject } from "react";

/**
 * Measures the floating chat composer and returns bottom padding (px)
 * so the last message stays clear of the input.
 */
export function useChatComposerPad(
  composerRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
  extraGap = 16,
  fallback = 112,
): number {
  const [pad, setPad] = useState(fallback);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) {
      setPad(fallback);
      return;
    }

    const measure = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height > 0) setPad(height + extraGap);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls when to rebind
  }, [composerRef, fallback, extraGap, ...deps]);

  return pad;
}
