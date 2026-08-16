import { useMemo } from "react";
import { BarChart3, Check } from "lucide-react";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatPoll as ChatPollData } from "@/lib/workspaceChatRealtime";

const MAX_VOTER_AVATARS = 3;

type VoterProfile = {
  userId: string;
  name: string;
  profilePictureUrl?: string | null;
  pictureRevision?: number;
};

type ChatPollProps = {
  poll: ChatPollData;
  currentUserId?: string | null;
  own?: boolean;
  pending?: boolean;
  onVote: (optionIndex: number) => void;
  memberPictureByUserId?: Map<string, string | null | undefined>;
  memberNameByUserId?: Map<string, string>;
  memberPictureRevisionByUserId?: Map<string, number | undefined>;
};

function resolveVoters(
  voterIds: string[],
  memberPictureByUserId?: Map<string, string | null | undefined>,
  memberNameByUserId?: Map<string, string>,
  memberPictureRevisionByUserId?: Map<string, number | undefined>,
): VoterProfile[] {
  return voterIds.map((rawId) => {
    const userId = String(rawId);
    return {
      userId,
      name: memberNameByUserId?.get(userId) || "User",
      profilePictureUrl: memberPictureByUserId?.get(userId) || undefined,
      pictureRevision: memberPictureRevisionByUserId?.get(userId),
    };
  });
}

function PollVoterAvatars({
  voters,
  own,
}: {
  voters: VoterProfile[];
  own: boolean;
}) {
  if (!voters.length) return null;

  const visible = voters.slice(0, MAX_VOTER_AVATARS);
  const overflow = voters.length - visible.length;

  return (
    <div className="relative ml-2 flex shrink-0 items-center">
      {visible.map((voter, index) => (
        <Tooltip key={`${voter.userId}:${voter.pictureRevision ?? 0}:${voter.profilePictureUrl || ""}`}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative rounded-full",
                own ? "ring-2 ring-[#5B2EFF]" : "ring-2 ring-white",
                index > 0 && "-ml-1.5",
              )}
              style={{ zIndex: visible.length - index }}
            >
              <UserProfileAvatar
                name={voter.name}
                profilePictureUrl={voter.profilePictureUrl || undefined}
                pictureRevision={voter.pictureRevision}
                enablePreview={false}
                className="h-5 w-5"
                fallbackClassName={cn(
                  "text-[7px] font-semibold",
                  own ? "bg-white/25 text-white" : "bg-sky-100 text-sky-700",
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {voter.name}
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "relative -ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-semibold",
            own
              ? "bg-white/25 text-white ring-2 ring-[#5B2EFF]"
              : "bg-gray-100 text-gray-600 ring-2 ring-white",
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

export function ChatPoll({
  poll,
  currentUserId,
  own = false,
  pending = false,
  onVote,
  memberPictureByUserId,
  memberNameByUserId,
  memberPictureRevisionByUserId,
}: ChatPollProps) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.voteCount, 0);

  const optionsWithVoters = useMemo(
    () =>
      poll.options.map((option) => ({
        ...option,
        voters: resolveVoters(
          option.voterIds || [],
          memberPictureByUserId,
          memberNameByUserId,
          memberPictureRevisionByUserId,
        ),
      })),
    [poll.options, memberPictureByUserId, memberNameByUserId, memberPictureRevisionByUserId],
  );

  return (
    <section className="min-w-[14rem] space-y-2 py-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-80">
        <BarChart3 size={14} /> Poll
      </div>
      <p className="font-semibold leading-snug">{poll.question}</p>
      <div className="space-y-1.5">
        {optionsWithVoters.map((option, index) => {
          const selected = Boolean(
            currentUserId && option.voterIds.some((id) => String(id) === String(currentUserId)),
          );
          const percent = totalVotes ? Math.round((option.voteCount / totalVotes) * 100) : 0;
          return (
            <button
              key={`${option.text}-${index}`}
              type="button"
              disabled={pending}
              onClick={() => onVote(index)}
              className={cn(
                "relative flex w-full items-center overflow-hidden rounded-lg border px-2.5 py-2 text-left text-sm disabled:cursor-wait disabled:opacity-70",
                own ? "border-white/35 bg-white/10 hover:bg-white/20" : "border-gray-200 bg-white hover:bg-sky-50",
              )}
            >
              <span
                className={cn("absolute inset-y-0 left-0 opacity-20", own ? "bg-white" : "bg-sky-400")}
                style={{ width: `${percent}%` }}
              />
              <span className="relative flex min-w-0 flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    selected
                      ? own
                        ? "border-white bg-white text-[#5B2EFF]"
                        : "border-sky-500 bg-sky-500 text-white"
                      : own
                        ? "border-white/50"
                        : "border-gray-300",
                  )}
                >
                  {selected ? <Check size={10} strokeWidth={3} /> : null}
                </span>
                <span className="truncate">{option.text}</span>
              </span>
              <PollVoterAvatars voters={option.voters} own={own} />
              <span className="relative ml-1.5 shrink-0 text-xs tabular-nums opacity-80">
                {option.voteCount > 0 ? option.voteCount : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] opacity-75">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
      </p>
    </section>
  );
}
