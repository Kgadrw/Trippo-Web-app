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
  /** Extra classes on the photo shell (prefer border-* over ring-* so the outline hugs the circle). */
  avatarClassName?: string;
  /** CSS ring color for the online / disappearing badges. */
  ringClassName?: string;
};

/**
 * Profile avatar with optional online green dot (WhatsApp-style).
 * Status badges sit on the photo corner inside the circle so they never
 * stretch the outer border into an oval.
 */
export function PresenceAvatar({
  online = false,
  disappearing = false,
  className,
  avatarClassName,
  ringClassName = "ring-white",
  ...avatarProps
}: PresenceAvatarProps) {
  return (
    <div
      className={cn(
        "relative aspect-square shrink-0 self-center overflow-hidden rounded-full",
        className,
      )}
    >
      <UserProfileAvatar
        {...avatarProps}
        profilePictureUrl={avatarProps.profilePictureUrl || undefined}
        enablePreview={false}
        className={cn(
          "box-border !h-full !w-full max-h-full max-w-full rounded-full",
          avatarClassName,
        )}
      />
      {online ? (
        <span
          className={cn(
            // Keep the dot inside the circle (bottom-right of the photo).
            "pointer-events-none absolute bottom-[7%] right-[7%] z-10 h-[22%] w-[22%] min-h-[8px] min-w-[8px] max-h-3 max-w-3 rounded-full bg-emerald-500 ring-2",
            ringClassName,
          )}
          aria-label="Online"
          title="Online"
        />
      ) : null}
      {disappearing ? (
        <span
          className={cn(
            "pointer-events-none absolute bottom-[5%] left-[5%] z-10 flex h-[26%] w-[26%] min-h-[14px] min-w-[14px] max-h-4 max-w-4 items-center justify-center rounded-full bg-amber-500 text-white ring-2",
            ringClassName,
          )}
          aria-label="Disappearing messages on"
          title="Disappearing messages on"
        >
          <Timer size={9} strokeWidth={2.5} />
        </span>
      ) : null}
    </div>
  );
}
