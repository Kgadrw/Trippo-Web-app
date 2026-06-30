import { PUBLIC_API_BASE_URL } from "./api";
import { getAuthenticatedFileUrl } from "./fileAccessToken";
import {
  fetchAuthenticatedFileBlob,
  invalidateAuthenticatedFileCache,
  resolveAuthenticatedFileUrl,
} from "./authenticatedFileFetch";

export function workspacePictureFetchUrl(
  profilePictureUrl: string,
  revision?: number,
): string {
  let url = resolveAuthenticatedFileUrl(profilePictureUrl);
  if (revision == null) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${revision}`;
}

export async function getWorkspacePictureDisplayUrl(
  profilePictureUrl: string,
  revision?: number,
): Promise<string | null> {
  if (!profilePictureUrl) return null;
  if (profilePictureUrl.startsWith("blob:") || profilePictureUrl.startsWith("data:")) {
    return profilePictureUrl;
  }

  try {
    let displayUrl = await getAuthenticatedFileUrl(profilePictureUrl);
    if (revision != null) {
      const separator = displayUrl.includes("?") ? "&" : "?";
      displayUrl = `${displayUrl}${separator}v=${revision}`;
    }
    return displayUrl;
  } catch {
    const blob = await fetchWorkspacePictureBlob(profilePictureUrl);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not load workspace profile picture"));
      reader.readAsDataURL(blob);
    });
  }
}

export async function fetchWorkspacePictureBlob(profilePictureUrl: string): Promise<Blob> {
  return fetchAuthenticatedFileBlob(profilePictureUrl);
}

export async function uploadWorkspaceProfilePicture(
  workspaceId: string,
  file: File,
): Promise<{ profilePictureUrl: string }> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/workspaces/${encodeURIComponent(workspaceId)}/profile-picture`,
    {
      method: "POST",
      headers: { "X-User-Id": userId },
      body: formData,
    },
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Failed to upload workspace profile picture");
  }

  const profilePictureUrl =
    json.data?.profilePictureUrl || json.workspace?.profilePictureUrl;
  if (!profilePictureUrl) {
    throw new Error("Upload succeeded but no picture URL was returned");
  }

  invalidateAuthenticatedFileCache();
  return { profilePictureUrl };
}

export async function removeWorkspaceProfilePicture(workspaceId: string): Promise<void> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/workspaces/${encodeURIComponent(workspaceId)}/profile-picture`,
    {
      method: "DELETE",
      headers: { "X-User-Id": userId },
    },
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Failed to remove workspace profile picture");
  }

  invalidateAuthenticatedFileCache();
}