/**
 * Normalize legacy or absolute file paths to canonical `/api/files/...` form
 * so auth-token + GET routes always match.
 */
export function normalizeStoredFileUrl(fileUrl: string): string {
  if (!fileUrl) return fileUrl;
  if (fileUrl.startsWith("blob:") || fileUrl.startsWith("data:")) return fileUrl;

  let pathname = fileUrl;
  try {
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      pathname = new URL(fileUrl).pathname;
    }
  } catch {
    // keep as-is
  }

  const legacy = pathname.match(
    /\/uploads\/(profiles|receipts|documents)\/([^/?#]+)\/([^/?#]+)/,
  );
  if (legacy) {
    const folder = legacy[1];
    const ownerId = legacy[2];
    const filename = legacy[3].split(/[?#]/)[0];
    const segment =
      folder === "profiles" ? "profile" : folder === "receipts" ? "receipts" : "documents";
    return `/api/files/${segment}/${ownerId}/${filename}`;
  }

  const filesMatch = pathname.match(
    /\/(?:api\/)?files\/(receipts|documents|profile|workspace-profile|chat-attachments)(\/.*)$/,
  );
  if (filesMatch) {
    return `/api/files/${filesMatch[1]}${filesMatch[2].split(/[?#]/)[0]}`;
  }

  if (pathname.startsWith("/api/")) {
    return pathname.split(/[?#]/)[0];
  }

  return fileUrl;
}
