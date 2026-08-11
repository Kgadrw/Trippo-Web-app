import { useEffect, useMemo, useState } from "react";
import { useWorkspacePictureSrc } from "@/hooks/useWorkspacePictureSrc";
import { cn } from "@/lib/utils";

type WorkspaceProfileAvatarProps = {
  name?: string;
  profilePictureUrl?: string | null;
  previewUrl?: string | null;
  pictureRevision?: number;
  className?: string;
  fallbackClassName?: string;
};

function getInitials(name?: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "W";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function WorkspaceProfileAvatar({
  name,
  profilePictureUrl,
  previewUrl,
  pictureRevision,
  className,
  fallbackClassName,
}: WorkspaceProfileAvatarProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const imageSrc = useWorkspacePictureSrc(
    profilePictureUrl || undefined,
    previewUrl,
    pictureRevision,
  );
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [imageSrc, profilePictureUrl, previewUrl, pictureRevision]);

  const showImage = Boolean(imageSrc) && !imgFailed;

  return (
    <div
      className={cn(
        "relative h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      aria-label={name || "Workspace"}
    >
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white",
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
          alt={name || "Workspace"}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            showImage ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImgFailed(false)}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : null}
    </div>
  );
}
