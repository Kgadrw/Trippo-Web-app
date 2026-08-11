import { useEffect, useRef } from "react";
import { websocketManager } from "@/lib/websocketManager";
import {
  WORKSPACE_CHAT_DELETE_EVENT,
  WORKSPACE_CHAT_EDIT_EVENT,
  WORKSPACE_CHAT_EVENT,
  WORKSPACE_CHAT_READ_EVENT,
  type WorkspaceChatMessage,
} from "@/lib/workspaceChatRealtime";

type WorkspaceChatSocketHandlers = {
  onMessage?: (message: WorkspaceChatMessage) => void;
  onRead?: (message: WorkspaceChatMessage) => void;
  onEdit?: (message: WorkspaceChatMessage) => void;
  onDelete?: (message: WorkspaceChatMessage) => void;
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

    const matchesWorkspace = (message: WorkspaceChatMessage) =>
      Boolean(message && String(message.workspaceId) === String(workspaceId));

    const onMessage = (message: WorkspaceChatMessage) => {
      if (!matchesWorkspace(message)) return;
      handlersRef.current.onMessage?.(message);
    };

    const onRead = (message: WorkspaceChatMessage) => {
      if (!matchesWorkspace(message)) return;
      handlersRef.current.onRead?.(message);
    };

    const onEdit = (message: WorkspaceChatMessage) => {
      if (!matchesWorkspace(message)) return;
      handlersRef.current.onEdit?.(message);
    };

    const onDelete = (message: WorkspaceChatMessage) => {
      if (!matchesWorkspace(message)) return;
      handlersRef.current.onDelete?.(message);
    };

    const unsubMessage = websocketManager.subscribe(WORKSPACE_CHAT_EVENT, onMessage);
    const unsubRead = websocketManager.subscribe(WORKSPACE_CHAT_READ_EVENT, onRead);
    const unsubEdit = websocketManager.subscribe(WORKSPACE_CHAT_EDIT_EVENT, onEdit);
    const unsubDelete = websocketManager.subscribe(WORKSPACE_CHAT_DELETE_EVENT, onDelete);

    return () => {
      unsubMessage();
      unsubRead();
      unsubEdit();
      unsubDelete();
    };
  }, [enabled, workspaceId]);
}
