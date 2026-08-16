import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 4;
const AVATAR_PX = 20;

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
                className={cn("relative shrink-0", index > 0 && "-ml-1.5")}
                style={{
                  zIndex: index + 1,
                  width: AVATAR_PX,
                  height: AVATAR_PX,
                }}
              >
                {/* Locked square circle — photo fills edge-to-edge; no button padding. */}
                <div
                  className="overflow-hidden rounded-full bg-sky-100 ring-2 ring-sky-100"
                  style={{ width: AVATAR_PX, height: AVATAR_PX }}
                >
                  <UserProfileAvatar
                    name={user.name}
                    profilePictureUrl={user.profilePictureUrl || undefined}
                    enablePreview={false}
                    className="!m-0 !h-full !w-full !max-h-full !max-w-full !rounded-full !p-0 !leading-none"
                    fallbackClassName="bg-sky-200 text-[7px] font-semibold leading-none text-sky-800"
                  />
                </div>
                <span
                  className="pointer-events-none absolute rounded-full border border-white bg-emerald-500"
                  style={{
                    width: 7,
                    height: 7,
                    bottom: -1,
                    right: -1,
                  }}
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
