import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { useTranslation } from "@/hooks/useTranslation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type WorkspaceMemberAvatarStackProps = {
  className?: string;
  avatarClassName?: string;
};

export function WorkspaceMemberAvatarStack({
  className,
  avatarClassName,
}: WorkspaceMemberAvatarStackProps) {
  const { t } = useTranslation();
  const {
    visibleMembers,
    overflowMembers,
    overflowCount,
    currentUserId,
    isWorkspaceMode,
    loading,
  } = useWorkspaceMemberAvatars();

  if (!isWorkspaceMode || loading || visibleMembers.length === 0) {
    return null;
  }

  const othersLabel = overflowCount > 0
    ? t("workspaceMembersOthers").replace("{count}", String(overflowCount))
    : null;

  return (
    <div
      className={cn("flex items-center", className)}
      aria-label={t("workspaceMembersAvatars")}
    >
      <div className="flex items-center">
        {visibleMembers.map((member, index) => {
          const isCurrentUser =
            Boolean(currentUserId) && String(member.userId) === currentUserId;

          return (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn("relative", index > 0 && "-ml-2.5")}
                  style={{ zIndex: index + 1 }}
                >
                  <UserProfileAvatar
                    name={member.name}
                    profilePictureUrl={member.profilePictureUrl || undefined}
                    enablePreview={false}
                    ringClassName={isCurrentUser ? "bg-sky-300" : "bg-white ring-1 ring-gray-200"}
                    className={cn("h-8 w-8 bg-white", avatarClassName)}
                    fallbackClassName="bg-sky-100 text-[10px] font-semibold text-sky-700"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {member.name}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {othersLabel ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="relative -ml-1 cursor-default whitespace-nowrap pl-1.5 text-xs text-muted-foreground"
                style={{ zIndex: visibleMembers.length + 1 }}
              >
                {othersLabel}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
              {overflowMembers.map((member) => member.name).join(", ")}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
