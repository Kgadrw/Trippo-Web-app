import { useEffect, useRef } from "react";
import { websocketManager } from "@/lib/websocketManager";
import {
  WORKSPACE_CHAT_EVENT,
  WORKSPACE_CHAT_READ_EVENT,
  type WorkspaceChatMessage,
} from "@/lib/workspaceChatRealtime";

type WorkspaceChatSocketHandlers = {
  onMessage?: (message: WorkspaceChatMessage) => void;
  onRead?: (message: WorkspaceChatMessage) => void;
};

/** Stable workspace chat websocket subscriptions (no resubscribe on handler changes). */
export function useWorkspaceChatSocket(
  workspaceId: string,
  enabled: boolean,
  handlers: WorkspaceChatSocketHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    const onMessage = (message: WorkspaceChatMessage) => {
      if (!message || String(message.workspaceId) !== String(workspaceId)) return;
      handlersRef.current.onMessage?.(message);
    };

    const onRead = (message: WorkspaceChatMessage) => {
      if (!message || String(message.workspaceId) !== String(workspaceId)) return;
      handlersRef.current.onRead?.(message);
    };

    const unsubMessage = websocketManager.subscribe(WORKSPACE_CHAT_EVENT, onMessage);
    const unsubRead = websocketManager.subscribe(WORKSPACE_CHAT_READ_EVENT, onRead);

    return () => {
      unsubMessage();
      unsubRead();
    };
  }, [enabled, workspaceId]);
}
