import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useProfilePictureSrc } from "@/hooks/useProfilePictureSrc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type UserProfileAvatarProps = {
  name?: string;
  profilePictureUrl?: string;
  previewUrl?: string | null;
  pictureRevision?: number;
  className?: string;
  fallbackClassName?: string;
  /** When true (default), clicking a real photo opens a full-size viewer. */
  enablePreview?: boolean;
  /**
   * Colored ring around the avatar (e.g. "bg-yellow-400", "bg-sky-400").
   * Photo is inset so it stays inside the ring, same as workspace member stack.
   */
  ringClassName?: string;
};

function getInitials(name?: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function UserProfileAvatar({
  name,
  profilePictureUrl,
  previewUrl,
  pictureRevision,
  className,
  fallbackClassName,
  enablePreview = true,
  ringClassName,
}: UserProfileAvatarProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const imageSrc = useProfilePictureSrc(profilePictureUrl, previewUrl, pictureRevision);
  const [imgFailed, setImgFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [imageSrc, profilePictureUrl, previewUrl, pictureRevision]);

  const showImage = Boolean(imageSrc) && !imgFailed;
  const canPreview = enablePreview && showImage && Boolean(imageSrc);

  const shellClass = cn(
    "profile-avatar relative aspect-square shrink-0 overflow-hidden rounded-full box-border",
    ringClassName ? "h-full w-full border-0" : className || "h-10 w-10",
  );

  const avatarBody = (
    <>
      <span
        className={cn(
          "absolute inset-0 z-0 flex items-center justify-center rounded-full bg-primary text-sm font-bold text-white",
          fallbackClassName,
        )}
        aria-hidden={showImage}
      >
        {initials}
      </span>
      {imageSrc ? (
        <img
          key={`${imageSrc.slice(0, 64)}-${pictureRevision ?? 0}`}
          src={imageSrc}
          alt={name || "Profile"}
          className={cn(
            "profile-avatar-img absolute inset-0 z-[1] block h-full w-full max-w-none rounded-full object-cover object-center",
            showImage ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImgFailed(false)}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : null}
    </>
  );

  const avatarNode = canPreview ? (
    <button
      type="button"
      className={cn(
        shellClass,
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
      )}
      aria-label={`View ${name || "profile"} photo`}
      onClick={(e) => {
        e.stopPropagation();
        setPreviewOpen(true);
      }}
    >
      {avatarBody}
    </button>
  ) : (
    <div className={shellClass} aria-label={name || "Profile"}>
      {avatarBody}
    </div>
  );

  return (
    <>
      {ringClassName ? (
        <div
          className={cn(
            "box-border shrink-0 overflow-hidden rounded-full p-[2px]",
            ringClassName,
            className,
          )}
        >
          {avatarNode}
        </div>
      ) : (
        avatarNode
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="z-[200] max-w-[min(96vw,520px)] border-0 bg-black/90 p-2 shadow-none sm:p-4 [&>button:last-child]:hidden">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute right-1 top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={name || "Profile"}
                className="mx-auto max-h-[85vh] w-full rounded-lg object-contain"
              />
            ) : null}
            {name ? (
              <p className="mt-3 text-center text-sm font-medium text-white/90">{name}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
