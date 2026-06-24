import { useEffect, useState } from "react";
import { fetchProfilePictureBlob } from "@/lib/profilePicture";

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
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const blob = await fetchProfilePictureBlob(profilePictureUrl);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profilePictureUrl, previewUrl]);

  return src;
}
