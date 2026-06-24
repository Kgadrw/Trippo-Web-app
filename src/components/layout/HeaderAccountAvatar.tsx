import { UserCircle } from "lucide-react";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

type HeaderAccountAvatarProps = {
  className?: string;
  iconSize?: number;
  fallbackClassName?: string;
};

export function HeaderAccountAvatar({
  className,
  iconSize = 18,
  fallbackClassName,
}: HeaderAccountAvatarProps) {
  const { user } = useCurrentUser();

  if (user?.profilePictureUrl) {
    return (
      <UserProfileAvatar
        name={user.name}
        profilePictureUrl={user.profilePictureUrl}
        className={cn("h-9 w-9 shrink-0", className)}
        fallbackClassName={cn(
          "bg-gray-200 text-xs font-semibold text-gray-700",
          fallbackClassName,
        )}
      />
    );
  }

  return <UserCircle size={iconSize} />;
}
