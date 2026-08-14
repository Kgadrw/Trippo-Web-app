import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

type HeaderAccountAvatarProps = {
  className?: string;
  fallbackClassName?: string;
  /** Ring color behind the inset photo (same fit as workspace avatars). */
  ringClassName?: string;
};

export function HeaderAccountAvatar({
  className,
  fallbackClassName,
  ringClassName = "bg-gray-300",
}: HeaderAccountAvatarProps) {
  const { user } = useCurrentUser();

  return (
    <UserProfileAvatar
      name={user?.name}
      profilePictureUrl={user?.profilePictureUrl}
      pictureRevision={user?.profilePictureRevision}
      enablePreview={false}
      ringClassName={ringClassName}
      className={cn("h-9 w-9 shrink-0", className)}
      fallbackClassName={cn(
        "bg-gray-100 text-xs font-semibold text-gray-700",
        fallbackClassName,
      )}
    />
  );
}
