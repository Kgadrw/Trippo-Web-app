import { useState } from "react";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { useWorkspaceMemberAvatars } from "@/hooks/useWorkspaceMemberAvatars";
import { useTranslation } from "@/hooks/useTranslation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    members,
    visibleMembers,
    overflowCount,
    currentUserId,
    isWorkspaceMode,
    loading,
  } = useWorkspaceMemberAvatars();
  const [membersOpen, setMembersOpen] = useState(false);

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
              <button
                type="button"
                className="relative -ml-1 whitespace-nowrap rounded-full pl-1.5 pr-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                style={{ zIndex: visibleMembers.length + 1 }}
                onClick={() => setMembersOpen(true)}
                aria-label={t("workspaceMembersAvatars")}
              >
                {othersLabel}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {t("workspaceMembersAvatars")}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-sm gap-3 p-0 sm:max-w-md">
          <DialogHeader className="px-5 pt-5 pr-12 text-left">
            <DialogTitle>{t("workspaceMembersAvatars")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain px-2 pb-3">
            {members.map((member) => {
              const isCurrentUser =
                Boolean(currentUserId) && String(member.userId) === currentUserId;
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                >
                  <UserProfileAvatar
                    name={member.name}
                    profilePictureUrl={member.profilePictureUrl || undefined}
                    ringClassName={isCurrentUser ? "bg-sky-300" : "bg-white ring-1 ring-gray-200"}
                    className="h-10 w-10 bg-white"
                    fallbackClassName="bg-sky-100 text-xs font-semibold text-sky-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                    {member.email ? (
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    ) : null}
                  </div>
                  {isCurrentUser ? (
                    <span className="shrink-0 text-xs font-medium text-sky-600">
                      {t("directChatYou")}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
