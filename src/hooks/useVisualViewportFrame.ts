import { useEffect, useState } from "react";

export type VisualViewportFrame = {
  /** Pixels the visual viewport has scrolled from the layout top (iOS keyboard). */
  offsetTop: number;
  /** Visible viewport height (shrinks when the keyboard is open). */
  height: number;
  /** Pixels covered at the bottom by the on-screen keyboard (approx). */
  keyboardInset: number;
  /** True when the on-screen keyboard is likely covering the bottom. */
  keyboardOpen: boolean;
};

const INITIAL: VisualViewportFrame = {
  offsetTop: 0,
  height: typeof window !== "undefined" ? window.innerHeight : 0,
  keyboardInset: 0,
  keyboardOpen: false,
};

function nearlySame(a: VisualViewportFrame, b: VisualViewportFrame) {
  return (
    Math.abs(a.offsetTop - b.offsetTop) < 1 &&
    Math.abs(a.height - b.height) < 1 &&
    Math.abs(a.keyboardInset - b.keyboardInset) < 1 &&
    a.keyboardOpen === b.keyboardOpen
  );
}

/**
 * Tracks the visible viewport so mobile chat can keep chrome fixed
 * and sit the composer just above the native soft keyboard.
 * Updates are rAF-coalesced for smooth keyboard show/hide.
 */
export function useVisualViewportFrame(enabled: boolean): VisualViewportFrame {
  const [frame, setFrame] = useState<VisualViewportFrame>(INITIAL);

  useEffect(() => {
    if (!enabled) {
      setFrame(INITIAL);
      return;
    }

    let rafId = 0;
    let latest: VisualViewportFrame = INITIAL;

    const read = (): VisualViewportFrame => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const keyboardInset = Math.max(0, Math.round(layoutHeight - height - offsetTop));
      return {
        offsetTop,
        height,
        keyboardInset,
        keyboardOpen: keyboardInset > 48,
      };
    };

    const flush = () => {
      rafId = 0;
      const next = latest;
      setFrame((prev) => (nearlySame(prev, next) ? prev : next));
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      if (document.documentElement.scrollTop !== 0) {
        document.documentElement.scrollTop = 0;
      }
    };

    const schedule = () => {
      latest = read();
      if (rafId) return;
      rafId = window.requestAnimationFrame(flush);
    };

    schedule();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyHeight = document.body.style.height;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
    };
  }, [enabled]);

  return frame;
}
