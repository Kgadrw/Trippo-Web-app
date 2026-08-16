import { Timer } from "lucide-react";
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
  /** Timer badge when disappearing messages are on for this chat. */
  disappearing?: boolean;
  /** Extra classes on the photo itself, e.g. a "ring-2 ring-sky-300" border. */
  avatarClassName?: string;
  /** CSS ring color for the online / disappearing badges. */
  ringClassName?: string;
};

/** Profile avatar with optional online green dot (WhatsApp-style). */
export function PresenceAvatar({
  online = false,
  disappearing = false,
  className,
  avatarClassName,
  ringClassName = "ring-white",
  ...avatarProps
}: PresenceAvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <UserProfileAvatar
        {...avatarProps}
        profilePictureUrl={avatarProps.profilePictureUrl || undefined}
        enablePreview={false}
        className={cn("h-full w-full", avatarClassName)}
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
      {disappearing ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -left-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white ring-2",
            ringClassName,
          )}
          aria-label="Disappearing messages on"
          title="Disappearing messages on"
        >
          <Timer size={10} strokeWidth={2.5} />
        </span>
      ) : null}
    </div>
  );
}
