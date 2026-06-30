import { useEffect, useState } from "react";
import { getProfilePictureDisplayUrl } from "@/lib/profilePicture";

export function useProfilePictureSrc(
  profilePictureUrl?: string,
  previewUrl?: string | null,
): string | null {
  const [src, setSrc] = useState<string | null>(previewUrl ?? null);

  useEffect(() => {
    if (previewUrl) {
      setSrc(previewUrl);
      return;
    }

    if (!profilePictureUrl) {
      setSrc(null);
      return;
    }

    let cancelled = false;

    void getProfilePictureDisplayUrl(profilePictureUrl)
      .then((displayUrl) => {
        if (!cancelled) setSrc(displayUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [profilePictureUrl, previewUrl]);

  return src;
}
