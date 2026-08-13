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

/**
 * Tracks the visible viewport so mobile chat can keep chrome fixed
 * and sit the composer just above the native soft keyboard.
 */
export function useVisualViewportFrame(enabled: boolean): VisualViewportFrame {
  const [frame, setFrame] = useState<VisualViewportFrame>(INITIAL);

  useEffect(() => {
    if (!enabled) {
      setFrame(INITIAL);
      return;
    }

    const update = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      // Prefer layout viewport height so we measure keyboard cover correctly
      // even when interactive-widget / browser chrome differs by platform.
      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const keyboardInset = Math.max(0, Math.round(layoutHeight - height - offsetTop));
      setFrame({
        offsetTop,
        height,
        keyboardInset,
        keyboardOpen: keyboardInset > 48,
      });
      // Stop iOS from leaving the layout scrolled under the keyboard.
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement.scrollTop !== 0) {
        document.documentElement.scrollTop = 0;
      }
    };

    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyHeight = document.body.style.height;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
    };
  }, [enabled]);

  return frame;
}
