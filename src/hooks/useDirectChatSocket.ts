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

function messageWorkspaceId(message: DirectChatMessage) {
  const raw = message?.workspaceId as unknown;
  if (raw && typeof raw === "object") {
    return String((raw as { _id?: string })._id || raw || "");
  }
  return String(raw || "");
}

/**
 * @param workspaceId - When set, only events for that workspace are forwarded.
 *   Pass empty string / null to accept DMs from every organisation.
 */
export function useDirectChatSocket(
  workspaceId: string | null | undefined,
  enabled: boolean,
  handlers: DirectChatSocketHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const filterId = workspaceId ? String(workspaceId) : "";

  useEffect(() => {
    if (!enabled) return;

    const matchesWorkspace = (message: DirectChatMessage) => {
      if (!filterId) return true;
      const rawWorkspace = messageWorkspaceId(message);
      return !rawWorkspace || rawWorkspace === filterId;
    };

    const onMessage = (message: DirectChatMessage) => {
      if (!message || !matchesWorkspace(message)) return;
      handlersRef.current.onMessage?.(message);
    };

    const onRead = (message: DirectChatMessage) => {
      if (!message || !matchesWorkspace(message)) return;
      handlersRef.current.onRead?.(message);
    };

    const onEdit = (message: DirectChatMessage) => {
      if (!message || !matchesWorkspace(message)) return;
      handlersRef.current.onEdit?.(message);
    };

    const onDelete = (message: DirectChatMessage) => {
      if (!message || !matchesWorkspace(message)) return;
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
  }, [enabled, filterId]);
}
