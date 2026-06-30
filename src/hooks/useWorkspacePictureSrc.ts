import { useEffect, useState } from "react";
import { getWorkspacePictureDisplayUrl } from "@/lib/workspacePicture";

export function useWorkspacePictureSrc(
  profilePictureUrl?: string,
  previewUrl?: string | null,
  revision?: number,
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

    void getWorkspacePictureDisplayUrl(profilePictureUrl, revision)
      .then((displayUrl) => {
        if (!cancelled) setSrc(displayUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [profilePictureUrl, previewUrl, revision]);

  return src;
}