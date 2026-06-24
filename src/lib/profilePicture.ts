import { PUBLIC_API_BASE_URL } from "./api";

export function profilePictureFetchUrl(profilePictureUrl: string): string {
  if (profilePictureUrl.startsWith("http")) return profilePictureUrl;
  if (profilePictureUrl.startsWith("/api")) return profilePictureUrl;
  return `${PUBLIC_API_BASE_URL}${profilePictureUrl}`;
}

export async function fetchProfilePictureBlob(profilePictureUrl: string): Promise<Blob> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  const url = profilePictureFetchUrl(profilePictureUrl);
  const res = await fetch(url, {
    headers: userId ? { "X-User-Id": userId } : {},
  });
  if (!res.ok) {
    throw new Error("Could not load profile picture");
  }
  return res.blob();
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
}
