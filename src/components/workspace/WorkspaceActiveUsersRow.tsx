import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 4;

type WorkspaceActiveUsersRowProps = {
  users: Array<{
    userId: string;
    name: string;
    profilePictureUrl?: string | null;
  }>;
};

export function WorkspaceActiveUsersRow({ users }: WorkspaceActiveUsersRowProps) {
  const { t } = useTranslation();

  if (!users.length) {
    return (
      <p className="mt-1 text-xs text-gray-500">{t("workspaceChatNoActiveUsers")}</p>
    );
  }

  const visibleUsers = users.slice(0, MAX_VISIBLE);
  const overflowCount = users.length - MAX_VISIBLE;

  return (
    <div
      className="mt-1 flex items-center gap-1.5"
      aria-label={t("workspaceChatActiveUsers")}
    >
      <div className="flex items-center">
        {visibleUsers.map((user, index) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "relative rounded-full ring-2 ring-sky-100",
                  index > 0 && "-ml-1.5",
                )}
                style={{ zIndex: index + 1 }}
              >
                <UserProfileAvatar
                  name={user.name}
                  profilePictureUrl={user.profilePictureUrl || undefined}
                  className="h-5 w-5"
                  fallbackClassName="bg-sky-200 text-[7px] font-semibold text-sky-800"
                />
                <span
                  className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-white bg-emerald-500"
                  aria-hidden
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {user.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      {overflowCount > 0 ? (
        <span className="whitespace-nowrap text-[10px] text-gray-500">
          {t("workspaceMembersOthers").replace("{count}", String(overflowCount))}
        </span>
      ) : null}
    </div>
  );
}
