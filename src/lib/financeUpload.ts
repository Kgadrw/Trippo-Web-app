import { PUBLIC_API_BASE_URL } from "./api";
import { fetchAuthenticatedFileBlob, resolveAuthenticatedFileUrl } from "./authenticatedFileFetch";

export type ReceiptMeta = {
  receiptUrl: string;
  receiptFileName: string;
};

export async function uploadReceipt(file: File): Promise<ReceiptMeta> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${PUBLIC_API_BASE_URL}/uploads/receipt`, {
    method: "POST",
    headers: { "X-User-Id": userId },
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Failed to upload receipt");
  }

  return json.data as ReceiptMeta;
}

export async function openReceiptInNewTab(receiptUrl: string): Promise<void> {
  const blob = await fetchAuthenticatedFileBlob(receiptUrl);
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export type CompanyDocumentFileMeta = {
  fileUrl: string;
  fileName: string;
  fileSize?: number;
};

export async function uploadCompanyDocument(file: File): Promise<CompanyDocumentFileMeta> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${PUBLIC_API_BASE_URL}/uploads/document`, {
    method: "POST",
    headers: { "X-User-Id": userId },
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Failed to upload document");
  }

  return json.data as CompanyDocumentFileMeta;
}

export function isExternalHttpUrl(fileUrl: string): boolean {
  return /^https?:\/\//i.test(fileUrl.trim());
}

export function guessDocumentMimeType(fileName?: string, blobType?: string): string {
  if (blobType && blobType !== "application/octet-stream") return blobType;
  const name = (fileName || "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv") || name.endsWith(".json")) {
    return "text/plain";
  }
  return blobType || "application/octet-stream";
}

export function isPreviewableDocument(
  mimeType: string,
  fileName?: string,
): "pdf" | "image" | "text" | null {
  const mime = guessDocumentMimeType(fileName, mimeType).toLowerCase();
  const name = (fileName || "").toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    /\.(txt|md|csv|json|log)$/.test(name)
  ) {
    return "text";
  }
  return null;
}

/** Load a stored upload (or public http URL) as a Blob for in-app preview/download. */
export async function loadCompanyDocumentBlob(fileUrl: string): Promise<Blob> {
  const trimmed = fileUrl.trim();
  if (!trimmed) throw new Error("Missing file");

  if (isExternalHttpUrl(trimmed)) {
    const res = await fetch(trimmed, { mode: "cors" }).catch(() => null);
    if (res?.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
    // CORS-blocked public links: fall back by opening them directly.
    throw new Error("EXTERNAL_OPEN");
  }

  return fetchAuthenticatedFileBlob(trimmed);
}

export async function openCompanyDocumentInNewTab(fileUrl: string): Promise<void> {
  const trimmed = fileUrl.trim();
  if (isExternalHttpUrl(trimmed)) {
    window.open(trimmed, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const blob = await loadCompanyDocumentBlob(trimmed);
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    if (error instanceof Error && error.message === "EXTERNAL_OPEN") {
      window.open(trimmed, "_blank", "noopener,noreferrer");
      return;
    }
    throw error;
  }
}

export async function downloadCompanyDocument(fileUrl: string, fileName?: string): Promise<void> {
  const trimmed = fileUrl.trim();
  if (!trimmed) throw new Error("Missing file");

  try {
    const blob = await loadCompanyDocumentBlob(trimmed);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName?.trim() || "document";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    if (error instanceof Error && error.message === "EXTERNAL_OPEN" && isExternalHttpUrl(trimmed)) {
      window.open(trimmed, "_blank", "noopener,noreferrer");
      return;
    }
    throw error;
  }
}

// Keep resolve helper available for callers that imported via this module path historically.
export { resolveAuthenticatedFileUrl };
