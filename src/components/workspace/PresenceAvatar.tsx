import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { cn } from "@/lib/utils";

type PresenceAvatarProps = {
  name?: string;
  profilePictureUrl?: string | null;
  previewUrl?: string | null;
  pictureRevision?: number;
  className?: string;
  fallbackClassName?: string;
  /** Green status dot (bottom-right). Hidden when false/undefined. */
  online?: boolean;
  ringClassName?: string;
};

/** Profile avatar with optional online green dot (WhatsApp-style). */
export function PresenceAvatar({
  online = false,
  className,
  ringClassName = "ring-white",
  ...avatarProps
}: PresenceAvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <UserProfileAvatar
        {...avatarProps}
        profilePictureUrl={avatarProps.profilePictureUrl || undefined}
        className="h-full w-full"
      />
      {online ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 z-10 h-3 w-3 rounded-full bg-emerald-500 ring-2",
            ringClassName,
          )}
          aria-label="Online"
          title="Online"
        />
      ) : null}
    </div>
  );
}
