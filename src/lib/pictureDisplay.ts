import { getAuthenticatedFileUrl } from "./fileAccessToken";
import {
  fetchAuthenticatedFileBlob,
  resolveAuthenticatedFileUrl,
} from "./authenticatedFileFetch";
import { normalizeStoredFileUrl } from "./storedFileUrl";
import { PUBLIC_API_BASE_URL } from "./api";

const displayCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
const SESSION_PREFIX = "profit-pilot-pic-display:";
const MAX_SESSION_DATA_URL_CHARS = 450_000;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result.startsWith("data:")) {
        reject(new Error("Invalid image data"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read image data"));
    reader.readAsDataURL(blob);
  });
}

function isAlreadyDisplayable(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:");
}

function isPublicExternalUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  try {
    if (/res\.cloudinary\.com\//i.test(url)) return true;
    const base = PUBLIC_API_BASE_URL.replace(/\/$/, "");
    if (base.startsWith("http") && url.startsWith(base)) return false;
    if (url.includes("/api/files/") || url.includes("/uploads/")) return false;
    return true;
  } catch {
    return false;
  }
}

function sessionKeyFor(cacheKey: string): string {
  // Avoid huge/awkward keys from absolute URLs.
  let hash = 0;
  for (let i = 0; i < cacheKey.length; i += 1) {
    hash = (hash * 31 + cacheKey.charCodeAt(i)) | 0;
  }
  return `${SESSION_PREFIX}${hash.toString(36)}`;
}

function readSessionCache(cacheKey: string): string | null {
  try {
    const value = sessionStorage.getItem(sessionKeyFor(cacheKey));
    return value?.startsWith("data:") ? value : null;
  } catch {
    return null;
  }
}

function writeSessionCache(cacheKey: string, dataUrl: string) {
  if (!dataUrl.startsWith("data:") || dataUrl.length > MAX_SESSION_DATA_URL_CHARS) return;
  try {
    sessionStorage.setItem(sessionKeyFor(cacheKey), dataUrl);
  } catch {
    // Quota exceeded — ignore.
  }
}

/**
 * Resolve a profile/workspace picture into a URL safe for <img src>.
 * Prefers data URLs from authenticated blob fetch so the image stays visible
 * without relying on access-token query params.
 */
export async function resolvePictureDisplayUrl(
  fileUrl: string,
  options?: { revision?: number; force?: boolean },
): Promise<string | null> {
  if (!fileUrl) return null;
  if (isAlreadyDisplayable(fileUrl)) return fileUrl;
  if (isPublicExternalUrl(fileUrl)) return fileUrl;

  const canonical = normalizeStoredFileUrl(fileUrl);
  const resolved = resolveAuthenticatedFileUrl(canonical);
  const cacheKey =
    options?.revision != null ? `${resolved}#v=${options.revision}` : resolved;

  if (!options?.force) {
    const cached = displayCache.get(cacheKey) || readSessionCache(cacheKey);
    if (cached) {
      displayCache.set(cacheKey, cached);
      return cached;
    }

    const pending = inflight.get(cacheKey);
    if (pending) return pending;
  }

  const promise = (async () => {
    // 1) Authenticated blob → data URL (most reliable for <img>)
    try {
      const blob = await fetchAuthenticatedFileBlob(canonical, { force: options?.force });
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) {
        displayCache.set(cacheKey, dataUrl);
        writeSessionCache(cacheKey, dataUrl);
        return dataUrl;
      }
    } catch {
      // fall through
    }

    const stale = displayCache.get(cacheKey) || readSessionCache(cacheKey);
    if (stale) {
      displayCache.set(cacheKey, stale);
      return stale;
    }

    // 2) Tokenized URL fallback for <img src>
    try {
      let tokenUrl = await getAuthenticatedFileUrl(canonical);
      if (options?.revision != null) {
        const separator = tokenUrl.includes("?") ? "&" : "?";
        tokenUrl = `${tokenUrl}${separator}v=${options.revision}`;
      }
      return tokenUrl;
    } catch {
      return null;
    }
  })();

  inflight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(cacheKey);
  }
}

export function invalidatePictureDisplayCache(fileUrl?: string) {
  if (!fileUrl) {
    displayCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(SESSION_PREFIX)) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    } catch {
      // ignore
    }
    return;
  }

  const resolved = resolveAuthenticatedFileUrl(normalizeStoredFileUrl(fileUrl));
  for (const key of [...displayCache.keys()]) {
    if (key === resolved || key.startsWith(`${resolved}#`)) {
      displayCache.delete(key);
      try {
        sessionStorage.removeItem(sessionKeyFor(key));
      } catch {
        // ignore
      }
    }
  }
}
