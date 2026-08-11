import { useEffect, useRef, useState } from "react";
import { getProfilePictureDisplayUrl } from "@/lib/profilePicture";
import { normalizeStoredFileUrl } from "@/lib/storedFileUrl";
import { invalidatePictureDisplayCache } from "@/lib/pictureDisplay";
import { invalidateAuthenticatedFileCache } from "@/lib/authenticatedFileFetch";

export function useProfilePictureSrc(
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
    if (cached) {
      setSrc(cached);
      return;
    }

    // New revision → drop stale caches for this URL so bytes refetch.
    if (revision != null) {
      invalidateAuthenticatedFileCache(normalized);
      invalidatePictureDisplayCache(normalized);
    }

    let cancelled = false;

    void getProfilePictureDisplayUrl(normalized, { revision, force: revision != null })
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
