export type WorkspaceChatMention = {
  userId: string;
  userName: string;
};

export type MentionMember = {
  userId: string;
  name: string;
  profilePictureUrl?: string | null;
};

export type MentionMenuOption =
  | { type: "all"; label: string }
  | { type: "user"; userId: string; name: string; profilePictureUrl?: string | null };

export type MessageBodyPart =
  | { type: "text"; text: string }
  | { type: "mention"; label: string; kind: "all" | "user"; userId?: string };

export function getActiveMentionQuery(
  text: string,
  cursor: number,
): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) return null;
  return {
    query: match[1],
    start: cursor - match[0].length,
  };
}

export function filterMentionOptions(
  members: MentionMember[],
  query: string,
  allLabel: string,
  currentUserId: string | null,
): MentionMenuOption[] {
  const normalized = query.trim().toLowerCase();
  const options: MentionMenuOption[] = [];

  if (!normalized || "all".startsWith(normalized) || allLabel.toLowerCase().startsWith(normalized)) {
    options.push({ type: "all", label: allLabel });
  }

  for (const member of members) {
    if (currentUserId && String(member.userId) === String(currentUserId)) continue;
    const name = member.name.trim();
    if (!name) continue;
    if (!normalized || name.toLowerCase().includes(normalized)) {
      options.push({
        type: "user",
        userId: String(member.userId),
        name,
        profilePictureUrl: member.profilePictureUrl,
      });
    }
  }

  return options;
}

export function buildMentionsFromBody(
  body: string,
  members: MentionMember[],
): { mentionAll: boolean; mentions: WorkspaceChatMention[] } {
  const mentionAll = /@all\b/i.test(body);
  const mentions: WorkspaceChatMention[] = [];
  const seen = new Set<string>();

  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  for (const member of sorted) {
    const name = member.name.trim();
    if (!name) continue;
    const pattern = new RegExp(`@${escapeRegExp(name)}(?=\\s|$|[.,!?])`, "i");
    if (!pattern.test(body)) continue;
    const userId = String(member.userId);
    if (seen.has(userId)) continue;
    seen.add(userId);
    mentions.push({ userId, userName: name });
  }

  return { mentionAll, mentions };
}

export function splitMessageBodyParts(
  body: string,
  mentions: WorkspaceChatMention[] = [],
  mentionAll = false,
): MessageBodyPart[] {
  const targets: Array<{ label: string; kind: "all" | "user"; userId?: string }> = [];
  if (mentionAll) targets.push({ label: "all", kind: "all" });
  for (const mention of [...mentions].sort((a, b) => b.userName.length - a.userName.length)) {
    targets.push({ label: mention.userName, kind: "user", userId: mention.userId });
  }

  const parts: MessageBodyPart[] = [];
  let index = 0;

  while (index < body.length) {
    const at = body.indexOf("@", index);
    if (at === -1) {
      parts.push({ type: "text", text: body.slice(index) });
      break;
    }

    if (at > index) {
      parts.push({ type: "text", text: body.slice(index, at) });
    }

    let matched = false;
    for (const target of targets) {
      const needle = `@${target.label}`;
      const slice = body.slice(at, at + needle.length);
      if (slice.toLowerCase() !== needle.toLowerCase()) continue;
      const nextChar = body[at + needle.length];
      if (nextChar && !/[\s,.!?]/.test(nextChar)) continue;
      parts.push({ type: "mention", label: target.label, kind: target.kind, userId: target.userId });
      index = at + needle.length;
      matched = true;
      break;
    }

    if (!matched) {
      parts.push({ type: "text", text: "@" });
      index = at + 1;
    }
  }

  return parts.length ? parts : [{ type: "text", text: body }];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
