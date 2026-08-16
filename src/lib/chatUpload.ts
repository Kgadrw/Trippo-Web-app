import { PUBLIC_API_BASE_URL } from "./api";
import { fetchAuthenticatedFileBlob, resolveAuthenticatedFileUrl } from "./authenticatedFileFetch";
import { getAuthenticatedFileUrl } from "./fileAccessToken";

export type ChatAttachmentMeta = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** Voice-note length in seconds. */
  duration?: number;
  /** Normalized 0–1 peak heights for waveform UI. */
  waveform?: number[];
  /** Local blob URL for unsent previews (not persisted). */
  localPreviewUrl?: string;
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);
const AUDIO_EXTENSIONS = new Set(["webm", "ogg", "mp3", "m4a", "aac", "wav", "mp4"]);

/** Must stay aligned with backend `chatAttachmentUpload` limit. */
export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_MAX_EDGE = 1920;
const IMAGE_JPEG_QUALITY = 0.84;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  webm: "audio/webm",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  mp4: "audio/mp4",
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

/**
 * Mobile cameras often produce HEIC / huge JPEGs that the chat API rejects.
 * Re-encode displayable images to a JPEG under the upload size limit.
 */
export async function prepareChatAttachmentFile(file: File): Promise<File> {
  if (!isChatImageAttachment(file.type, file.name)) {
    if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      throw new Error("Each file must be 10 MB or smaller.");
    }
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("Could not process image");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let quality = IMAGE_JPEG_QUALITY;
    let blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    while (blob && blob.size > CHAT_ATTACHMENT_MAX_BYTES && quality > 0.5) {
      quality -= 0.1;
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    }
    if (!blob) throw new Error("Could not process image");
    if (blob.size > CHAT_ATTACHMENT_MAX_BYTES) {
      throw new Error("Each file must be 10 MB or smaller.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    if (error instanceof Error && /10 MB|process image/i.test(error.message)) {
      throw error;
    }
    // Fallback for browsers that cannot decode HEIC, etc.
    if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      throw new Error("Each file must be 10 MB or smaller.");
    }
    const ext = extensionFromFileName(file.name);
    if (ext === "heic" || ext === "heif" || /heic|heif/i.test(file.type)) {
      throw new Error("This photo format isn’t supported. Please choose a JPG or PNG.");
    }
    return file;
  }
}

export async function prepareChatAttachmentFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => prepareChatAttachmentFile(file)));
}

export function isChatAudioAttachment(mimeType?: string, fileName?: string) {
  const resolved = inferChatAttachmentMimeType(fileName, mimeType);
  if (resolved.startsWith("audio/")) return true;
  // Some browsers record voice as video/webm; treat chat voice filenames as audio.
  if (resolved === "video/webm" && /voice|audio/i.test(fileName || "")) return true;
  return AUDIO_EXTENSIONS.has(extensionFromFileName(fileName));
}

export function isChatPdfAttachment(mimeType?: string, fileName?: string) {
  const resolved = inferChatAttachmentMimeType(fileName, mimeType).toLowerCase();
  if (resolved === "application/pdf") return true;
  return extensionFromFileName(fileName) === "pdf";
}

export function isChatTextAttachment(mimeType?: string, fileName?: string) {
  const resolved = inferChatAttachmentMimeType(fileName, mimeType).toLowerCase();
  if (resolved.startsWith("text/")) return true;
  const ext = extensionFromFileName(fileName);
  return ext === "txt" || ext === "csv" || ext === "md" || ext === "json" || ext === "log";
}

/** Documents we can preview in-app via blob URL (PDF iframe or text pane). */
export function isChatInlineDocumentPreview(mimeType?: string, fileName?: string) {
  return isChatPdfAttachment(mimeType, fileName) || isChatTextAttachment(mimeType, fileName);
}

/**
 * Fetch attachment as a blob: object URL for iframe/img preview.
 * Caller must revoke the URL when done.
 */
export async function getChatAttachmentBlobUrl(
  fileUrl: string,
  mimeType?: string,
  fileName?: string,
): Promise<string> {
  if (fileUrl.startsWith("blob:") || fileUrl.startsWith("data:")) {
    return fileUrl;
  }
  const blob = await fetchChatAttachmentBlob(fileUrl, mimeType, fileName);
  return URL.createObjectURL(blob);
}

export async function readChatAttachmentText(
  fileUrl: string,
  mimeType?: string,
  fileName?: string,
): Promise<string> {
  const blob = await fetchChatAttachmentBlob(fileUrl, mimeType, fileName);
  const text = await blob.text();
  // Cap preview size so huge CSVs don't freeze the UI.
  return text.length > 200_000 ? `${text.slice(0, 200_000)}\n\n… (preview truncated)` : text;
}

/** Pick a MediaRecorder mime + file extension that this browser supports. */
export function pickVoiceRecordingFormat(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "audio/mp4", extension: "m4a" };
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAppleMobile =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Prefer mp4/m4a on iOS (WebM often won't play back). Prefer WebM elsewhere.
  const candidates: Array<{ mimeType: string; extension: string }> = isAppleMobile
    ? [
        { mimeType: "audio/mp4", extension: "m4a" },
        { mimeType: "audio/aac", extension: "m4a" },
        { mimeType: "audio/webm;codecs=opus", extension: "webm" },
        { mimeType: "audio/webm", extension: "webm" },
      ]
    : [
        { mimeType: "audio/webm;codecs=opus", extension: "webm" },
        { mimeType: "audio/webm", extension: "webm" },
        { mimeType: "audio/mp4", extension: "m4a" },
        { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
        { mimeType: "audio/ogg", extension: "ogg" },
      ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
  }
  return { mimeType: "", extension: isAppleMobile ? "m4a" : "webm" };
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

export async function uploadWorkspaceChatAttachment(
  workspaceId: string,
  file: File,
): Promise<ChatAttachmentMeta> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/workspaces/${encodeURIComponent(workspaceId)}/messages/attachments`,
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
