import { PUBLIC_API_BASE_URL } from "./api";
import { fetchAuthenticatedFileBlob, resolveAuthenticatedFileUrl } from "./authenticatedFileFetch";
import { getAuthenticatedFileUrl } from "./fileAccessToken";

export type ChatAttachmentMeta = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** Local blob URL for unsent previews (not persisted). */
  localPreviewUrl?: string;
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
};

function extensionFromFileName(fileName?: string) {
  if (!fileName) return "";
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function resolveChatFileUrl(fileUrl: string): string {
  return resolveAuthenticatedFileUrl(fileUrl);
}

export function inferChatAttachmentMimeType(fileName?: string, mimeType?: string): string {
  const normalized = mimeType?.split(";")[0]?.trim();
  if (normalized && normalized !== "application/octet-stream") return normalized;
  const fromExt = MIME_BY_EXT[extensionFromFileName(fileName)];
  if (fromExt) return fromExt;
  return normalized || "application/octet-stream";
}

export function isChatImageAttachment(mimeType?: string, fileName?: string) {
  const resolved = inferChatAttachmentMimeType(fileName, mimeType);
  if (resolved.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.has(extensionFromFileName(fileName));
}

export async function uploadDirectChatAttachment(
  workspaceId: string,
  conversationId: string,
  file: File,
): Promise<ChatAttachmentMeta> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/workspaces/${encodeURIComponent(workspaceId)}/direct-chats/${encodeURIComponent(conversationId)}/attachments`,
    {
      method: "POST",
      headers: { "X-User-Id": userId },
      body: formData,
    },
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Failed to upload attachment");
  }

  return json.data as ChatAttachmentMeta;
}

function normalizeBlob(blob: Blob, mimeType?: string, fileName?: string): Blob {
  const resolvedType = inferChatAttachmentMimeType(fileName, mimeType || blob.type || undefined);
  if (blob.type === resolvedType) return blob;
  return new Blob([blob], { type: resolvedType });
}

export async function fetchChatAttachmentBlob(
  fileUrl: string,
  mimeType?: string,
  fileName?: string,
): Promise<Blob> {
  if (fileUrl.startsWith("blob:")) {
    const res = await fetch(fileUrl);
    const blob = await res.blob();
    return normalizeBlob(blob, mimeType || blob.type, fileName);
  }

  const blob = await fetchAuthenticatedFileBlob(fileUrl);
  return normalizeBlob(blob, mimeType || blob.type, fileName);
}

/** URL suitable for <img src> — uses signed access token (no custom headers needed). */
export async function getChatAttachmentImageSrc(
  fileUrl: string,
  mimeType?: string,
  fileName?: string,
): Promise<string> {
  if (fileUrl.startsWith("blob:") || fileUrl.startsWith("data:")) {
    return fileUrl;
  }

  try {
    return await getAuthenticatedFileUrl(fileUrl);
  } catch {
    const blob = await fetchChatAttachmentBlob(fileUrl, mimeType, fileName);
    return blobToDataUrl(blob);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read attachment"));
    reader.readAsDataURL(blob);
  });
}

export function openBlobAttachment(blob: Blob, fileName: string, mimeType?: string): void {
  const type = inferChatAttachmentMimeType(fileName, mimeType || blob.type);
  const typedBlob = normalizeBlob(blob, type, fileName);
  const objectUrl = URL.createObjectURL(typedBlob);

  const canPreviewInline =
    type.startsWith("image/") ||
    type === "application/pdf" ||
    type.startsWith("text/");

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.rel = "noopener noreferrer";

  if (canPreviewInline) {
    anchor.target = "_blank";
  } else {
    anchor.download = fileName || "download";
  }

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export async function openChatAttachment(
  fileUrl: string,
  fileName: string,
  mimeType?: string,
): Promise<void> {
  if (fileUrl.startsWith("blob:")) {
    const blob = await fetchChatAttachmentBlob(fileUrl, mimeType, fileName);
    openBlobAttachment(blob, fileName, mimeType || blob.type);
    return;
  }

  const viewUrl = await getAuthenticatedFileUrl(fileUrl);
  window.open(viewUrl, "_blank", "noopener,noreferrer");
}

/** @deprecated Use openChatAttachment */
export async function openChatAttachmentInNewTab(
  fileUrl: string,
  fileName?: string,
  mimeType?: string,
): Promise<void> {
  await openChatAttachment(fileUrl, fileName || "attachment", mimeType);
}

export async function createChatAttachmentObjectUrl(
  fileUrl: string,
  mimeType?: string,
  fileName?: string,
): Promise<string> {
  return getChatAttachmentImageSrc(fileUrl, mimeType, fileName);
}

export function createLocalAttachmentPreview(file: File): ChatAttachmentMeta {
  const previewUrl = URL.createObjectURL(file);
  return {
    url: previewUrl,
    fileName: file.name,
    mimeType: file.type || inferChatAttachmentMimeType(file.name),
    size: file.size,
    localPreviewUrl: previewUrl,
  };
}

export function replaceLocalAttachmentPreview(
  localAttachment: ChatAttachmentMeta,
  uploaded: ChatAttachmentMeta,
): ChatAttachmentMeta {
  return {
    ...uploaded,
    localPreviewUrl: localAttachment.localPreviewUrl,
  };
}

export function revokeLocalAttachmentPreview(attachment: ChatAttachmentMeta) {
  if (attachment.localPreviewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(attachment.localPreviewUrl);
  }
}
