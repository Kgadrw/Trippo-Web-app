import { useCallback, useEffect, useRef, useState } from "react";
import { websocketManager } from "@/lib/websocketManager";

export type ChatTypingUser = {
  userId: string;
  userName: string;
};

const IDLE_STOP_MS = 2_000;
const REMOTE_EXPIRE_MS = 4_000;

type TypingEmitterOptions = {
  enabled: boolean;
  buildPayload: (isTyping: boolean) => Record<string, unknown>;
  eventType: string;
};

/** Debounced typing start/stop emits for a chat composer. */
export function useTypingEmitter({ enabled, buildPayload, eventType }: TypingEmitterOptions) {
  const typingRef = useRef(false);
  const stopTimerRef = useRef<number | null>(null);
  const buildPayloadRef = useRef(buildPayload);
  buildPayloadRef.current = buildPayload;

  const emit = useCallback(
    (isTyping: boolean) => {
      if (!enabled) return;
      websocketManager.emit(eventType, buildPayloadRef.current(isTyping));
    },
    [enabled, eventType],
  );

  const stopTyping = useCallback(() => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (!typingRef.current) return;
    typingRef.current = false;
    emit(false);
  }, [emit]);

  const onComposerChange = useCallback(
    (value: string) => {
      if (!enabled) return;

      if (!value.trim()) {
        stopTyping();
        return;
      }

      if (!typingRef.current) {
        typingRef.current = true;
        emit(true);
      }

      if (stopTimerRef.current != null) {
        window.clearTimeout(stopTimerRef.current);
      }
      stopTimerRef.current = window.setTimeout(() => {
        typingRef.current = false;
        stopTimerRef.current = null;
        emit(false);
      }, IDLE_STOP_MS);
    },
    [enabled, emit, stopTyping],
  );

  useEffect(() => {
    if (!enabled) {
      stopTyping();
    }
  }, [enabled, stopTyping]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current != null) {
        window.clearTimeout(stopTimerRef.current);
      }
      if (typingRef.current) {
        typingRef.current = false;
        websocketManager.emit(eventType, buildPayloadRef.current(false));
      }
    };
  }, [eventType]);

  return { onComposerChange, stopTyping };
}

type TypingListenerOptions = {
  enabled: boolean;
  eventType: string;
  matches: (payload: Record<string, unknown>) => boolean;
  currentUserId?: string | null;
  /** Change this when the active thread changes so stale typing users are cleared. */
  scopeKey?: string;
};

/** Tracks remote users currently typing in the active chat. */
export function useTypingListener({
  enabled,
  eventType,
  matches,
  currentUserId,
  scopeKey,
}: TypingListenerOptions) {
  const [typingUsers, setTypingUsers] = useState<ChatTypingUser[]>([]);
  const expireTimersRef = useRef<Map<string, number>>(new Map());
  const matchesRef = useRef(matches);
  matchesRef.current = matches;

  const clearExpire = useCallback((userId: string) => {
    const timer = expireTimersRef.current.get(userId);
    if (timer != null) {
      window.clearTimeout(timer);
      expireTimersRef.current.delete(userId);
    }
  }, []);

  const removeUser = useCallback(
    (userId: string) => {
      clearExpire(userId);
      setTypingUsers((prev) => prev.filter((row) => row.userId !== userId));
    },
    [clearExpire],
  );

  const clearTypingUser = useCallback(
    (userId: string) => {
      removeUser(String(userId));
    },
    [removeUser],
  );

  const clearAll = useCallback(() => {
    for (const timer of expireTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    expireTimersRef.current.clear();
    setTypingUsers([]);
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearAll();
      return;
    }

    clearAll();

    const onTyping = (payload: {
      userId?: string;
      userName?: string;
      isTyping?: boolean;
      [key: string]: unknown;
    }) => {
      if (!payload?.userId) return;
      if (!matchesRef.current(payload as Record<string, unknown>)) return;
      const userId = String(payload.userId);
      if (currentUserId && userId === String(currentUserId)) return;

      if (!payload.isTyping) {
        removeUser(userId);
        return;
      }

      setTypingUsers((prev) => {
        const next = prev.filter((row) => row.userId !== userId);
        next.push({
          userId,
          userName: payload.userName?.trim() || "User",
        });
        return next;
      });

      clearExpire(userId);
      expireTimersRef.current.set(
        userId,
        window.setTimeout(() => removeUser(userId), REMOTE_EXPIRE_MS),
      );
    };

    const unsub = websocketManager.subscribe(eventType, onTyping);
    return () => {
      unsub();
      clearAll();
    };
  }, [enabled, eventType, currentUserId, scopeKey, clearAll, clearExpire, removeUser]);

  return { typingUsers, clearTypingUser, clearAllTyping: clearAll };
}

export function formatTypingLabel(
  users: ChatTypingUser[],
  t: (key: string) => string,
): string | null {
  if (!users.length) return null;
  if (users.length === 1) {
    return t("chatTypingOne").replace("{name}", users[0].userName);
  }
  if (users.length === 2) {
    return t("chatTypingTwo")
      .replace("{name1}", users[0].userName)
      .replace("{name2}", users[1].userName);
  }
  return t("chatTypingMany").replace("{count}", String(users.length));
}
