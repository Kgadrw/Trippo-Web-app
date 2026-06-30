import { PUBLIC_API_BASE_URL } from "./api";
import { resolveAuthenticatedFileUrl } from "./authenticatedFileFetch";

type TokenCacheEntry = {
  token: string;
  expiresAt: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();
const inflight = new Map<string, Promise<string>>();

function cacheKeyForFileUrl(fileUrl: string) {
  return resolveAuthenticatedFileUrl(fileUrl);
}

async function requestFileAccessToken(fileUrl: string): Promise<string> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${PUBLIC_API_BASE_URL}/files/access-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ url: fileUrl }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not authorize file access");
  }

  const token = json.data?.token;
  const expiresIn = Number(json.data?.expiresIn) || 3600;
  if (!token) {
    throw new Error("No access token returned");
  }

  return token;
}

export async function getAuthenticatedFileUrl(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith("blob:") || fileUrl.startsWith("data:")) {
    return fileUrl;
  }

  const resolved = cacheKeyForFileUrl(fileUrl);
  const cached = tokenCache.get(resolved);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return appendAccessToken(resolved, cached.token);
  }

  const pending = inflight.get(resolved);
  if (pending) {
    const token = await pending;
    return appendAccessToken(resolved, token);
  }

  const promise = requestFileAccessToken(fileUrl.startsWith("/api") ? fileUrl : resolved);
  inflight.set(resolved, promise);

  try {
    const token = await promise;
    tokenCache.set(resolved, {
      token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    });
    return appendAccessToken(resolved, token);
  } finally {
    inflight.delete(resolved);
  }
}

function appendAccessToken(resolvedUrl: string, token: string) {
  const separator = resolvedUrl.includes("?") ? "&" : "?";
  return `${resolvedUrl}${separator}access=${encodeURIComponent(token)}`;
}

export function invalidateFileAccessTokens() {
  tokenCache.clear();
}
