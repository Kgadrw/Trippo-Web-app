import { PUBLIC_API_BASE_URL } from "./api";

export type ReceiptMeta = {
  receiptUrl: string;
  receiptFileName: string;
};

function receiptFetchUrl(receiptUrl: string): string {
  if (receiptUrl.startsWith("http")) return receiptUrl;
  if (receiptUrl.startsWith("/api")) return receiptUrl;
  return `${PUBLIC_API_BASE_URL}${receiptUrl}`;
}

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
  const userId = localStorage.getItem("profit-pilot-user-id");
  const url = receiptFetchUrl(receiptUrl);
  const res = await fetch(url, {
    headers: userId ? { "X-User-Id": userId } : {},
  });
  if (!res.ok) {
    throw new Error("Could not load receipt");
  }
  const blob = await res.blob();
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

export async function openCompanyDocumentInNewTab(fileUrl: string): Promise<void> {
  const userId = localStorage.getItem("profit-pilot-user-id");
  const url = receiptFetchUrl(fileUrl);
  const res = await fetch(url, {
    headers: userId ? { "X-User-Id": userId } : {},
  });
  if (!res.ok) {
    throw new Error("Could not load document");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
