/** Keep in sync with mongoose `body.maxlength` on WorkspaceMessage / WorkspaceDirectMessage. */
export const CHAT_MESSAGE_MAX_CHARS = 4000;

export function chatMessageLengthError(length: number, max = CHAT_MESSAGE_MAX_CHARS) {
  const over = Math.max(0, length - max);
  return `Your message is too long (${length.toLocaleString()} / ${max.toLocaleString()} characters). Remove about ${over.toLocaleString()} character${over === 1 ? "" : "s"} and try again.`;
}

/** Turn cryptic mongoose / API body-length errors into a clear explanation. */
export function friendlyChatSendError(message: string | undefined, draftLength?: number) {
  const raw = String(message || "").trim();
  if (!raw) return raw;
  if (
    /longer than the maximum allowed length\s*\(4000\)/i.test(raw) ||
    (/Path [`']?body[`']?/i.test(raw) && /4000/.test(raw)) ||
    /message is too long/i.test(raw)
  ) {
    return chatMessageLengthError(draftLength && draftLength > 0 ? draftLength : CHAT_MESSAGE_MAX_CHARS);
  }
  return raw;
}

export function isOverChatMessageLimit(text: string, max = CHAT_MESSAGE_MAX_CHARS) {
  return text.trim().length > max;
}
