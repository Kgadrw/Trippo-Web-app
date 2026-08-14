import { BarChart3, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatPoll } from "@/lib/workspaceChatRealtime";

type ChatPollProps = {
  poll: ChatPoll;
  currentUserId?: string | null;
  own?: boolean;
  pending?: boolean;
  onVote: (optionIndex: number) => void;
};

export function ChatPoll({ poll, currentUserId, own = false, pending = false, onVote }: ChatPollProps) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.voteCount, 0);
  return (
    <section className="min-w-[13rem] space-y-2 py-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-80">
        <BarChart3 size={14} /> Poll
      </div>
      <p className="font-semibold leading-snug">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((option, index) => {
          const selected = Boolean(currentUserId && option.voterIds.some((id) => String(id) === String(currentUserId)));
          const percent = totalVotes ? Math.round((option.voteCount / totalVotes) * 100) : 0;
          return (
            <button
              key={`${option.text}-${index}`}
              type="button"
              disabled={pending}
              onClick={() => onVote(index)}
              className={cn(
                "relative flex w-full overflow-hidden rounded-lg border px-2.5 py-2 text-left text-sm disabled:cursor-wait disabled:opacity-70",
                own ? "border-white/35 bg-white/10 hover:bg-white/20" : "border-gray-200 bg-white hover:bg-sky-50",
              )}
            >
              <span
                className={cn("absolute inset-y-0 left-0 opacity-20", own ? "bg-white" : "bg-sky-400")}
                style={{ width: `${percent}%` }}
              />
              <span className="relative flex min-w-0 flex-1 items-center gap-1.5">
                {selected ? <Check size={14} className="shrink-0" /> : null}
                <span className="truncate">{option.text}</span>
              </span>
              <span className="relative ml-2 text-xs tabular-nums opacity-80">{option.voteCount}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] opacity-75">{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</p>
    </section>
  );
}
