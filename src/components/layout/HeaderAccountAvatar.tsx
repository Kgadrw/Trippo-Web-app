import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

type HeaderAccountAvatarProps = {
  className?: string;
  fallbackClassName?: string;
  /** Kept for callers; animated orbit replaces static ring color. */
  ringClassName?: string;
};

export function HeaderAccountAvatar({
  className,
  fallbackClassName,
}: HeaderAccountAvatarProps) {
  const { user } = useCurrentUser();

  return (
    <div
      className={cn(
        "header-avatar-orbit relative aspect-square shrink-0 rounded-full",
        className,
      )}
    >
      <span className="header-avatar-orbit-ring" aria-hidden>
        <span className="header-avatar-orbit-wave header-avatar-orbit-wave--base" />
        <span className="header-avatar-orbit-wave header-avatar-orbit-wave--surge" />
        <span className="header-avatar-orbit-wave header-avatar-orbit-wave--spark" />
      </span>
      <div className="header-avatar-orbit-inner">
        <UserProfileAvatar
          name={user?.name}
          profilePictureUrl={user?.profilePictureUrl}
          pictureRevision={user?.profilePictureRevision}
          enablePreview={false}
          className="h-full w-full"
          fallbackClassName={cn(
            "bg-gray-100 text-xs font-semibold text-gray-700",
            fallbackClassName,
          )}
        />
      </div>
    </div>
  );
}
