import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  downloadCompanyDocument,
  isExternalHttpUrl,
  isPreviewableDocument,
  loadCompanyDocumentBlob,
  openCompanyDocumentInNewTab,
  guessDocumentMimeType,
} from "@/lib/financeUpload";

type ReportAttachmentViewerProps = {
  fileUrl?: string | null;
  fileName?: string | null;
  className?: string;
  /** Compact inline buttons (table rows). */
  compact?: boolean;
};

type PreviewState = {
  mode: "pdf" | "image" | "text" | "file";
  blobUrl?: string;
  textContent?: string;
  error?: string;
};

export function ReportAttachmentViewer({
  fileUrl,
  fileName,
  className,
  compact = false,
}: ReportAttachmentViewerProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const label = fileName?.trim() || "Attachment";
  const url = fileUrl?.trim() || "";

  const revokeBlob = () => {
    if (blobUrlRef.current) {
      try {
        URL.revokeObjectURL(blobUrlRef.current);
      } catch {
        /* ignore */
      }
      blobUrlRef.current = null;
    }
  };

  useEffect(() => () => revokeBlob(), []);

  if (!url) return null;

  const closePreview = () => {
    setPreviewOpen(false);
    setPreview(null);
    revokeBlob();
  };

  const handleView = async () => {
    setBusy("view");
    try {
      // External links that aren't our uploads: try preview; fall back to new tab.
      if (isExternalHttpUrl(url)) {
        const kind = isPreviewableDocument("", label);
        if (!kind) {
          await openCompanyDocumentInNewTab(url);
          return;
        }
      }

      const blob = await loadCompanyDocumentBlob(url);
      const mime = guessDocumentMimeType(label, blob.type);
      const kind = isPreviewableDocument(mime, label);

      revokeBlob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;

      if (kind === "pdf") {
        setPreview({ mode: "pdf", blobUrl });
      } else if (kind === "image") {
        setPreview({ mode: "image", blobUrl });
      } else if (kind === "text") {
        const textContent = await blob.text();
        setPreview({ mode: "text", textContent });
      } else {
        setPreview({
          mode: "file",
          blobUrl,
          error: "In-app preview isn’t available for this file type. Download it to open.",
        });
      }
      setPreviewOpen(true);
    } catch (error) {
      if (error instanceof Error && error.message === "EXTERNAL_OPEN") {
        await openCompanyDocumentInNewTab(url);
        return;
      }
      toast({
        title: "Couldn’t open document",
        description: error instanceof Error ? error.message : "Try downloading instead.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      await downloadCompanyDocument(url, label);
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Could not download this file.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
        <span
          className={cn(
            "inline-flex min-w-0 max-w-[14rem] items-center gap-1 truncate text-sky-700 dark:text-sky-300",
            compact ? "text-xs" : "text-sm",
          )}
          title={label}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("gap-1", compact ? "h-7 px-2 text-xs" : "h-8")}
          disabled={busy !== null}
          onClick={() => void handleView()}
        >
          {busy === "view" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          View
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("gap-1", compact ? "h-7 px-2 text-xs" : "h-8")}
          disabled={busy !== null}
          onClick={() => void handleDownload()}
        >
          {busy === "download" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent
          overlayClassName="z-[220]"
          className={cn(
            "z-[221] max-h-[92vh] overflow-hidden border-0 bg-white p-0 shadow-xl [&>button:last-child]:hidden",
            preview?.mode === "pdf" || preview?.mode === "image"
              ? "max-w-[min(96vw,900px)]"
              : "max-w-[min(96vw,720px)]",
          )}
        >
          <div className="flex max-h-[92vh] flex-col">
            <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-sky-600" />
              <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                {label}
              </DialogTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs"
                disabled={busy !== null}
                onClick={() => void handleDownload()}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <button
                type="button"
                onClick={closePreview}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
            </div>

            {preview?.mode === "pdf" && preview.blobUrl ? (
              <object
                title={label}
                data={preview.blobUrl}
                type="application/pdf"
                className="h-[min(78vh,720px)] w-full bg-gray-100"
              >
                <iframe title={label} src={preview.blobUrl} className="h-[min(78vh,720px)] w-full bg-gray-100" />
              </object>
            ) : null}

            {preview?.mode === "image" && preview.blobUrl ? (
              <div className="flex max-h-[min(78vh,720px)] items-center justify-center overflow-auto bg-black/90 p-3">
                <img src={preview.blobUrl} alt={label} className="max-h-[min(76vh,700px)] max-w-full object-contain" />
              </div>
            ) : null}

            {preview?.mode === "text" ? (
              <pre className="max-h-[min(78vh,720px)] overflow-auto whitespace-pre-wrap break-words bg-gray-50 p-4 text-xs leading-relaxed text-gray-800">
                {preview.textContent || "Empty file"}
              </pre>
            ) : null}

            {preview?.mode === "file" ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <FileText size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {preview.error || "Download this file to open it on your device."}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => void handleDownload()} disabled={busy !== null}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
