import { PUBLIC_API_BASE_URL } from "./api";
import { invalidateFileAccessTokens } from "./fileAccessToken";
import { fetchAuthenticatedFileBlob, invalidateAuthenticatedFileCache } from "./authenticatedFileFetch";
import { invalidatePictureDisplayCache, resolvePictureDisplayUrl } from "./pictureDisplay";

export function profilePictureFetchUrl(profilePictureUrl: string): string {
  // Google serves small avatar thumbnails by default (commonly `=s96-c`).
  // Ask for a larger square image while preserving Google crop/format flags.
  if (/^https:\/\/(?:lh[3-6]|[a-z0-9-]+)\.googleusercontent\.com\//i.test(profilePictureUrl)) {
    return profilePictureUrl.replace(/=s\d+(?:-[a-z0-9-]+)?(?=([?#]|$))/i, "=s512-c");
  }
  return profilePictureUrl;
}

export async function getProfilePictureDisplayUrl(
  profilePictureUrl: string,
  options?: { revision?: number; force?: boolean },
): Promise<string | null> {
  return resolvePictureDisplayUrl(profilePictureFetchUrl(profilePictureUrl), options);
}

export async function fetchProfilePictureBlob(profilePictureUrl: string): Promise<Blob> {
  return fetchAuthenticatedFileBlob(profilePictureUrl);
}

export async function uploadProfilePicture(file: File): Promise<{ profilePictureUrl: string }> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${PUBLIC_API_BASE_URL}/uploads/profile-picture`, {
    method: "POST",
    headers: { "X-User-Id": userId },
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Failed to upload profile picture");
  }

  const profilePictureUrl =
    json.data?.profilePictureUrl || json.user?.profilePictureUrl;
  if (!profilePictureUrl) {
    throw new Error("Upload succeeded but no picture URL was returned");
  }

  invalidateAuthenticatedFileCache();
  invalidateFileAccessTokens();
  invalidatePictureDisplayCache();
  return { profilePictureUrl };
}

export async function removeProfilePicture(): Promise<void> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${PUBLIC_API_BASE_URL}/uploads/profile-picture`, {
    method: "DELETE",
    headers: { "X-User-Id": userId },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Failed to remove profile picture");
  }

  invalidateAuthenticatedFileCache();
  invalidateFileAccessTokens();
  invalidatePictureDisplayCache();
}
