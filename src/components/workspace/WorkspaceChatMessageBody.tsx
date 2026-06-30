import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { splitMessageBodyParts, type WorkspaceChatMention } from "@/lib/workspaceChatMentions";

type WorkspaceChatMessageBodyProps = {
  body: string;
  mentions?: WorkspaceChatMention[];
  mentionAll?: boolean;
  currentUserId?: string | null;
  own?: boolean;
};

export function WorkspaceChatMessageBody({
  body,
  mentions = [],
  mentionAll = false,
  currentUserId,
  own = false,
}: WorkspaceChatMessageBodyProps) {
  const parts = useMemo(
    () => splitMessageBodyParts(body, mentions, mentionAll),
    [body, mentions, mentionAll],
  );

  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.text}</span>;
        }

        const isSelfMention =
          part.kind === "user" &&
          currentUserId &&
          part.userId &&
          String(part.userId) === String(currentUserId);
        const isEveryone = part.kind === "all";

        return (
          <span
            key={index}
            className={cn(
              "font-semibold",
              own
                ? isSelfMention || isEveryone
                  ? "rounded bg-white/20 px-0.5 text-white"
                  : "text-sky-200"
                : isSelfMention || isEveryone
                  ? "rounded bg-sky-100 px-0.5 text-sky-700"
                  : "text-sky-600",
            )}
          >
            @{part.label}
          </span>
        );
      })}
    </p>
  );
}
