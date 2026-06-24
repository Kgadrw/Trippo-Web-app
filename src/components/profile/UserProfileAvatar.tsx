import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfilePictureSrc } from "@/hooks/useProfilePictureSrc";
import { cn } from "@/lib/utils";

type UserProfileAvatarProps = {
  name?: string;
  profilePictureUrl?: string;
  previewUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
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
  className,
  fallbackClassName,
}: UserProfileAvatarProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const imageSrc = useProfilePictureSrc(profilePictureUrl, previewUrl);

  return (
    <Avatar className={cn("h-10 w-10 shrink-0 rounded-full", className)}>
      {imageSrc ? <AvatarImage src={imageSrc} alt={name || "Profile"} className="object-cover" /> : null}
      <AvatarFallback
        className={cn(
          "rounded-full bg-primary text-sm font-bold text-white",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
