/** Reserved Messages route segment for the workspace team/group channel (not a user id). */
export const WORKSPACE_GROUP_CHAT_SEGMENT = "group";

export const WORKSPACE_GROUP_CHAT_PATH = `/messages/${WORKSPACE_GROUP_CHAT_SEGMENT}`;

export function isWorkspaceGroupChatPath(pathname: string) {
  return (
    pathname === WORKSPACE_GROUP_CHAT_PATH ||
    pathname.startsWith(`${WORKSPACE_GROUP_CHAT_PATH}/`)
  );
}

export function isWorkspaceGroupChatSegment(segment: string | undefined | null) {
  return String(segment || "") === WORKSPACE_GROUP_CHAT_SEGMENT;
}
