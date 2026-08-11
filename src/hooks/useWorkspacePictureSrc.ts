import { useEffect, useRef, useState } from "react";
import { getWorkspacePictureDisplayUrl } from "@/lib/workspacePicture";
import { normalizeStoredFileUrl } from "@/lib/storedFileUrl";

export function useWorkspacePictureSrc(
  profilePictureUrl?: string,
  previewUrl?: string | null,
  revision?: number,
): string | null {
  const [src, setSrc] = useState<string | null>(previewUrl ?? null);
  const lastGoodByKey = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (previewUrl) {
      setSrc(previewUrl);
      return;
    }

    if (!profilePictureUrl) {
      setSrc(null);
      return;
    }

    const normalized = normalizeStoredFileUrl(profilePictureUrl);
    const key = `${normalized}#${revision ?? 0}`;
    const cached = lastGoodByKey.current.get(key);
    if (cached) setSrc(cached);

    let cancelled = false;

    void getWorkspacePictureDisplayUrl(normalized, revision)
      .then((displayUrl) => {
        if (cancelled || !displayUrl) return;
        lastGoodByKey.current.set(key, displayUrl);
        setSrc(displayUrl);
      })
      .catch(() => {
        if (cancelled) return;
        const previous = lastGoodByKey.current.get(key);
        if (previous) setSrc(previous);
      });

    return () => {
      cancelled = true;
    };
  }, [profilePictureUrl, previewUrl, revision]);

  return src;
}
