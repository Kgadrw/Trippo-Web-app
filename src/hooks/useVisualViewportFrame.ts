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

type VirtualKeyboardNavigator = Navigator & {
  virtualKeyboard?: {
    boundingRect: DOMRectReadOnly;
    overlaysContent: boolean;
    addEventListener: (type: "geometrychange", listener: () => void) => void;
    removeEventListener: (type: "geometrychange", listener: () => void) => void;
  };
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
 * Handles iOS visualViewport offset and Android Chrome keyboard resize /
 * VirtualKeyboard geometry (including overlays fallback).
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
    const timeoutIds: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timeoutIds.push(window.setTimeout(fn, ms));
    };
    /** Tallest layout height seen while keyboard is closed — Android baseline. */
    let baselineLayoutHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      window.visualViewport?.height ?? 0,
    );

    const readVkHeight = (): number => {
      const vk = (navigator as VirtualKeyboardNavigator).virtualKeyboard;
      const h = vk?.boundingRect?.height;
      return typeof h === "number" && Number.isFinite(h) ? Math.round(h) : 0;
    };

    const read = (): VisualViewportFrame => {
      const vv = window.visualViewport;
      let height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const layoutNow = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
        height + offsetTop,
      );

      // Grow baseline only when we look keyboard-closed (avoids locking onto shrunk height).
      const provisionalInset = Math.max(0, Math.round(layoutNow - height - offsetTop));
      const vkHeight = readVkHeight();
      if (provisionalInset < 48 && vkHeight < 48) {
        baselineLayoutHeight = Math.max(baselineLayoutHeight, layoutNow);
      }

      let keyboardInset = Math.max(
        0,
        Math.round(baselineLayoutHeight - height - offsetTop),
        vkHeight,
      );

      // Android overlays / WebView: keyboard covers content without shrinking vv.
      // Shrink the frame ourselves so fixed chat chrome sits above the keyboard.
      if (keyboardInset > 48) {
        const targetHeight = Math.max(120, baselineLayoutHeight - keyboardInset - offsetTop);
        if (height > targetHeight + 8) {
          height = targetHeight;
        }
      }

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
      if (document.body.scrollTop !== 0) {
        document.body.scrollTop = 0;
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
    // Android: keyboard often settles after focus; remeasure on composer focus.
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !target.isContentEditable) return;
      schedule();
      // Keyboard animation on Android is often ~250–400ms after focus.
      later(schedule, 50);
      later(schedule, 180);
      later(schedule, 350);
      later(schedule, 550);
    };
    const onFocusOut = () => {
      schedule();
      later(schedule, 180);
      later(schedule, 400);
    };
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);

    const vk = (navigator as VirtualKeyboardNavigator).virtualKeyboard;
    if (vk) {
      vk.addEventListener("geometrychange", schedule);
    }

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
      for (const id of timeoutIds) window.clearTimeout(id);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
      vk?.removeEventListener("geometrychange", schedule);
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
    };
  }, [enabled]);

  return frame;
}
