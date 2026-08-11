import { PUBLIC_API_BASE_URL } from "./api";
import { normalizeStoredFileUrl } from "./storedFileUrl";

export { normalizeStoredFileUrl } from "./storedFileUrl";

type CacheEntry = {
  blob: Blob;
  at: number;
};

const blobCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Blob>>();
const BLOB_CACHE_MS = 30 * 60 * 1000;

export function resolveAuthenticatedFileUrl(fileUrl: string): string {
  if (fileUrl.startsWith("blob:") || fileUrl.startsWith("data:")) return fileUrl;

  const normalized = normalizeStoredFileUrl(fileUrl);
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const base = PUBLIC_API_BASE_URL.replace(/\/$/, "");

  if (normalized.startsWith("/api")) {
    if (base.startsWith("http")) {
      return `${base}${normalized.slice(4)}`;
    }
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${base}${normalized}`;
  }

  return `${base}/${normalized}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function invalidateAuthenticatedFileCache(fileUrl?: string) {
  if (!fileUrl) {
    blobCache.clear();
    return;
  }
  blobCache.delete(resolveAuthenticatedFileUrl(fileUrl));
}

export async function fetchAuthenticatedFileBlob(
  fileUrl: string,
  options?: { force?: boolean },
): Promise<Blob> {
  const url = resolveAuthenticatedFileUrl(fileUrl);

  if (!options?.force) {
    const cached = blobCache.get(url);
    if (cached && Date.now() - cached.at < BLOB_CACHE_MS) {
      return cached.blob;
    }

    const pending = inflight.get(url);
    if (pending) return pending;
  }

  const userId = localStorage.getItem("profit-pilot-user-id");

  const promise = (async () => {
    let retry = 0;

    while (true) {
      const res = await fetch(url, {
        cache: "no-store",
        headers: userId ? { "X-User-Id": userId } : {},
      });

      if (res.status === 429 && retry < 4) {
        const json = await res.json().catch(() => ({}));
        const retryAfter =
          typeof json.retryAfter === "number"
            ? json.retryAfter
            : typeof json.retryAfter === "string"
              ? parseInt(json.retryAfter, 10)
              : NaN;
        const waitMs = Number.isFinite(retryAfter)
          ? Math.min(retryAfter * 1000, 30_000)
          : Math.min(1000 * 2 ** retry, 30_000);
        await sleep(waitMs);
        retry += 1;
        continue;
      }

      if (!res.ok) {
        if ((res.status >= 500 || res.status === 408) && retry < 3) {
          await sleep(Math.min(400 * 2 ** retry, 4_000));
          retry += 1;
          continue;
        }
        throw new Error(`Could not load file (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || undefined;
      const rawBlob = await res.blob();
      if (!rawBlob || rawBlob.size === 0) {
        throw new Error("Empty file response");
      }
      const blob =
        contentType && !rawBlob.type
          ? new Blob([rawBlob], { type: contentType.split(";")[0]?.trim() || "application/octet-stream" })
          : rawBlob;
      blobCache.set(url, { blob, at: Date.now() });
      return blob;
    }
  })();

  inflight.set(url, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(url);
  }
}
