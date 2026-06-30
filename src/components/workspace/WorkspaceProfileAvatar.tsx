import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  return (
    <Avatar className={cn("relative h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}>
      {imageSrc ? (
        <AvatarImage
          key={`${profilePictureUrl || "none"}-${pictureRevision ?? 0}`}
          src={imageSrc}
          alt={name || "Workspace"}
          className="relative z-10 h-full w-full object-cover"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "absolute inset-0 z-0 flex items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
