import { useEffect, useRef } from "react";
import { websocketManager } from "@/lib/websocketManager";
import {
  WORKSPACE_DM_MESSAGE_EVENT,
  WORKSPACE_DM_READ_EVENT,
  WORKSPACE_DM_EDIT_EVENT,
  WORKSPACE_DM_DELETE_EVENT,
  type DirectChatMessage,
} from "@/lib/workspaceDirectChatRealtime";

type DirectChatSocketHandlers = {
  onMessage?: (message: DirectChatMessage) => void;
  onRead?: (message: DirectChatMessage) => void;
  onEdit?: (message: DirectChatMessage) => void;
  onDelete?: (message: DirectChatMessage) => void;
};

export function useDirectChatSocket(
  workspaceId: string,
  enabled: boolean,
  handlers: DirectChatSocketHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    const onMessage = (message: DirectChatMessage) => {
      if (!message || String(message.workspaceId) !== String(workspaceId)) return;
      handlersRef.current.onMessage?.(message);
    };

    const onRead = (message: DirectChatMessage) => {
      if (!message || String(message.workspaceId) !== String(workspaceId)) return;
      handlersRef.current.onRead?.(message);
    };

    const onEdit = (message: DirectChatMessage) => {
      if (!message || String(message.workspaceId) !== String(workspaceId)) return;
      handlersRef.current.onEdit?.(message);
    };

    const onDelete = (message: DirectChatMessage) => {
      if (!message || String(message.workspaceId) !== String(workspaceId)) return;
      handlersRef.current.onDelete?.(message);
    };

    const unsubMessage = websocketManager.subscribe(WORKSPACE_DM_MESSAGE_EVENT, onMessage);
    const unsubRead = websocketManager.subscribe(WORKSPACE_DM_READ_EVENT, onRead);
    const unsubEdit = websocketManager.subscribe(WORKSPACE_DM_EDIT_EVENT, onEdit);
    const unsubDelete = websocketManager.subscribe(WORKSPACE_DM_DELETE_EVENT, onDelete);

    return () => {
      unsubMessage();
      unsubRead();
      unsubEdit();
      unsubDelete();
    };
  }, [enabled, workspaceId]);
}
