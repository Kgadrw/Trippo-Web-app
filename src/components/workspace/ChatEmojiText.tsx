import { useMemo } from "react";
import { Emoji, EmojiStyle } from "emoji-picker-react";

/** Emoji sequences: flags, ZWJ, skin tones, keycaps, pictographs. */
const EMOJI_SEQUENCE_RE =
  /(?:\p{Regional_Indicator}{2})|(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)|(?:[0-9#*]\uFE0F?\u20E3)/gu;

export function nativeEmojiToUnified(emoji: string): string {
  return Array.from(emoji)
    .map((char) => {
      const hex = char.codePointAt(0)!.toString(16);
      return hex.length < 4 ? hex.padStart(4, "0") : hex;
    })
    .join("-");
}

export function splitEmojiParts(
  text: string,
): Array<{ type: "text" | "emoji"; value: string }> {
  if (!text) return [];
  const parts: Array<{ type: "text" | "emoji"; value: string }> = [];
  let lastIndex = 0;
  const re = new RegExp(EMOJI_SEQUENCE_RE.source, EMOJI_SEQUENCE_RE.flags);
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    parts.push({ type: "emoji", value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

export function isEmojiOnlyMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const without = trimmed
    .replace(new RegExp(EMOJI_SEQUENCE_RE.source, EMOJI_SEQUENCE_RE.flags), "")
    .replace(/\s+/g, "");
  return without.length === 0;
}

function countEmojis(text: string): number {
  const re = new RegExp(EMOJI_SEQUENCE_RE.source, EMOJI_SEQUENCE_RE.flags);
  return [...text.matchAll(re)].length;
}

export function resolveChatEmojiSize(text: string, forceSize?: number): number {
  if (typeof forceSize === "number") return forceSize;
  if (!isEmojiOnlyMessage(text)) return 20;
  const count = countEmojis(text);
  if (count <= 1) return 48;
  if (count <= 3) return 40;
  if (count <= 6) return 32;
  return 24;
}

type ChatEmojiTextProps = {
  text: string;
  /** Override auto size (emoji-only messages scale up). */
  size?: number;
  className?: string;
};

export function ChatEmojiText({ text, size, className }: ChatEmojiTextProps) {
  const parts = useMemo(() => splitEmojiParts(text), [text]);
  const emojiSize = resolveChatEmojiSize(text, size);

  if (!parts.some((p) => p.type === "emoji")) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.value}</span>;
        }
        const unified = nativeEmojiToUnified(part.value);
        return (
          <span
            key={`${index}-${unified}`}
            className="inline-flex items-center align-middle"
            style={{
              width: emojiSize,
              height: emojiSize,
              marginInline: "0.06em",
              verticalAlign: "middle",
            }}
          >
            <Emoji unified={unified} size={emojiSize} emojiStyle={EmojiStyle.APPLE} lazyLoad />
          </span>
        );
      })}
    </span>
  );
}
