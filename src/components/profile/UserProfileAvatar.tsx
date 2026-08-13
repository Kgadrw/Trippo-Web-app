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

  const avatarBody = (
    <>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-primary text-sm font-bold text-white",
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
            "absolute inset-0 h-full w-full rounded-full object-cover",
            showImage ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImgFailed(false)}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : null}
    </>
  );

  return (
    <>
      {canPreview ? (
        <button
          type="button"
          className={cn(
            "profile-avatar relative h-10 w-10 shrink-0 overflow-hidden rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
            className,
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
        <div
          className={cn(
            "profile-avatar relative h-10 w-10 shrink-0 overflow-hidden rounded-full",
            className,
          )}
          aria-label={name || "Profile"}
        >
          {avatarBody}
        </div>
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
