import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectChatAttachment } from "@/lib/workspaceDirectChatRealtime";
import type { WorkspaceChatAttachment } from "@/lib/workspaceChatRealtime";
import {
  getChatAttachmentBlobUrl,
  getChatAttachmentImageSrc,
  isChatAudioAttachment,
  isChatImageAttachment,
  isChatPdfAttachment,
  isChatTextAttachment,
  openChatAttachment,
  readChatAttachmentText,
} from "@/lib/chatUpload";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChatVoicePlayer } from "@/components/workspace/ChatVoiceNote";

type ChatAttachment = DirectChatAttachment | WorkspaceChatAttachment;

type ImagePreviewState = { kind: "image"; src: string; attachment: ChatAttachment };

type DocumentPreviewState = {
  kind: "document";
  attachment: ChatAttachment;
  mode: "pdf" | "text" | "file";
  blobUrl?: string;
  textContent?: string;
};

type PreviewState = ImagePreviewState | DocumentPreviewState;

function ChatAttachmentImage({
  attachment,
  className,
  onOpenPreview,
}: {
  attachment: ChatAttachment;
  className?: string;
  onOpenPreview: (src: string, attachment: ChatAttachment) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void getChatAttachmentImageSrc(attachment.url, attachment.mimeType, attachment.fileName)
      .then((imageSrc) => {
        if (cancelled) return;
        if (!imageSrc || imageSrc === "data:,") {
          setFailed(true);
          setSrc(null);
          return;
        }
        setSrc(imageSrc);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attachment.url, attachment.mimeType, attachment.fileName, reloadKey]);

  if (loading) {
    return (
      <div className={cn("flex h-40 w-56 items-center justify-center rounded-lg bg-black/5", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!src || failed) {
    return (
      <button
        type="button"
        onClick={() => void openChatAttachment(attachment.url, attachment.fileName, attachment.mimeType)}
        className={cn(
          "flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-left text-xs underline",
          className,
        )}
      >
        {attachment.fileName}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenPreview(src, attachment)}
      className="block max-w-full overflow-hidden rounded-lg text-left"
      aria-label={attachment.fileName}
    >
      <img
        src={src}
        alt={attachment.fileName}
        className={cn("max-h-56 max-w-full rounded-lg object-contain", className)}
        onError={() => {
          if (reloadKey < 2) {
            setReloadKey((value) => value + 1);
            return;
          }
          setFailed(true);
        }}
      />
    </button>
  );
}

export function DirectChatMessageAttachments({
  attachments,
  own,
}: {
  attachments: ChatAttachment[];
  own?: boolean;
}) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [openingUrl, setOpeningUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.kind === "document" && preview.blobUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(preview.blobUrl);
      }
    };
  }, [preview]);

  const closePreview = () => {
    setPreview((current) => {
      if (current?.kind === "document" && current.blobUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(current.blobUrl);
      }
      return null;
    });
  };

  const handleOpenDocument = async (attachment: ChatAttachment) => {
    if (openingUrl) return;
    setOpeningUrl(attachment.url);

    try {
      if (isChatPdfAttachment(attachment.mimeType, attachment.fileName)) {
        const blobUrl = await getChatAttachmentBlobUrl(
          attachment.url,
          attachment.mimeType,
          attachment.fileName,
        );
        setPreview({ kind: "document", attachment, mode: "pdf", blobUrl });
        return;
      }

      if (isChatTextAttachment(attachment.mimeType, attachment.fileName)) {
        const [blobUrl, textContent] = await Promise.all([
          getChatAttachmentBlobUrl(attachment.url, attachment.mimeType, attachment.fileName),
          readChatAttachmentText(attachment.url, attachment.mimeType, attachment.fileName),
        ]);
        setPreview({ kind: "document", attachment, mode: "text", blobUrl, textContent });
        return;
      }

      // Office / other docs: preview sheet with open/download.
      setPreview({ kind: "document", attachment, mode: "file" });
    } catch {
      // Soft fail — offer download sheet so messaging never hard-breaks.
      setPreview({ kind: "document", attachment, mode: "file" });
    } finally {
      setOpeningUrl(null);
    }
  };

  if (!attachments.length) return null;

  return (
    <>
      <div className={cn("space-y-2", own ? "text-white" : "text-gray-800")}>
        {attachments.map((attachment) =>
          isChatAudioAttachment(attachment.mimeType, attachment.fileName) ? (
            <ChatVoicePlayer
              key={`${attachment.url}-${attachment.fileName}`}
              attachment={attachment}
              own={own}
            />
          ) : isChatImageAttachment(attachment.mimeType, attachment.fileName) ? (
            <ChatAttachmentImage
              key={`${attachment.url}-${attachment.fileName}`}
              attachment={attachment}
              onOpenPreview={(imageSrc, item) =>
                setPreview({ kind: "image", src: imageSrc, attachment: item })
              }
            />
          ) : (
            <button
              key={attachment.url}
              type="button"
              disabled={openingUrl === attachment.url}
              onClick={() => void handleOpenDocument(attachment)}
              className={cn(
                "flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs",
                own ? "bg-white/15 hover:bg-white/20" : "bg-black/5 hover:bg-black/10",
                openingUrl === attachment.url && "opacity-70",
              )}
            >
              {openingUrl === attachment.url ? (
                <Loader2 size={16} className="shrink-0 animate-spin" />
              ) : (
                <FileText size={16} className="shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate underline">{attachment.fileName}</span>
              <span className={cn("shrink-0 text-[10px] opacity-70", own ? "text-white/80" : "text-gray-500")}>
                Preview
              </span>
            </button>
          ),
        )}
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent
          className={cn(
            "z-[200] border-0 p-0 shadow-xl [&>button:last-child]:hidden",
            preview?.kind === "document" && preview.mode === "pdf"
              ? "max-h-[92vh] max-w-[min(96vw,900px)] overflow-hidden bg-white"
              : preview?.kind === "document"
                ? "max-h-[92vh] max-w-[min(96vw,720px)] overflow-hidden bg-white"
                : "max-w-[min(96vw,720px)] bg-black/90 p-2 sm:p-4",
          )}
        >
          {preview?.kind === "image" ? (
            <div className="relative">
              <DialogTitle className="sr-only">{preview.attachment.fileName}</DialogTitle>
              <button
                type="button"
                onClick={closePreview}
                className="absolute right-1 top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
              <img
                src={preview.src}
                alt={preview.attachment.fileName}
                className="mx-auto max-h-[85vh] w-full object-contain"
              />
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    void openChatAttachment(
                      preview.attachment.url,
                      preview.attachment.fileName,
                      preview.attachment.mimeType,
                    )
                  }
                  className="rounded-full bg-white px-4 py-2 text-xs font-medium text-gray-900 shadow"
                >
                  Open / download
                </button>
              </div>
            </div>
          ) : null}

          {preview?.kind === "document" ? (
            <div className="flex max-h-[92vh] flex-col">
              <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-sky-600" />
                <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                  {preview.attachment.fileName}
                </DialogTitle>
                <button
                  type="button"
                  onClick={() =>
                    void openChatAttachment(
                      preview.attachment.url,
                      preview.attachment.fileName,
                      preview.attachment.mimeType,
                    )
                  }
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                >
                  <ExternalLink size={12} />
                  Open
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                  aria-label="Close preview"
                >
                  <X size={16} />
                </button>
              </div>

              {preview.mode === "pdf" && preview.blobUrl ? (
                <iframe
                  title={preview.attachment.fileName}
                  src={preview.blobUrl}
                  className="h-[min(78vh,720px)] w-full bg-gray-100"
                />
              ) : null}

              {preview.mode === "text" ? (
                <pre className="max-h-[min(78vh,720px)] overflow-auto whitespace-pre-wrap break-words bg-gray-50 p-4 text-xs leading-relaxed text-gray-800">
                  {preview.textContent || "Empty file"}
                </pre>
              ) : null}

              {preview.mode === "file" ? (
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                    <FileText size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{preview.attachment.fileName}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      In-app preview isn’t available for this file type. Open it to view or download.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void openChatAttachment(
                        preview.attachment.url,
                        preview.attachment.fileName,
                        preview.attachment.mimeType,
                      )
                    }
                    className="rounded-full bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700"
                  >
                    Open / download
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Thumbnail preview for attachments waiting to be sent. */
export function DirectChatPendingAttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: ChatAttachment & { localPreviewUrl?: string };
  onRemove: () => void;
}) {
  const previewUrl = attachment.localPreviewUrl || attachment.url;
  const isImage = isChatImageAttachment(attachment.mimeType, attachment.fileName);
  const [src, setSrc] = useState<string | null>(
    isImage && (previewUrl.startsWith("blob:") || previewUrl.startsWith("data:")) ? previewUrl : null,
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isImage) return;

    if (previewUrl.startsWith("blob:") || previewUrl.startsWith("data:")) {
      setSrc(previewUrl);
      return;
    }

    let cancelled = false;
    void getChatAttachmentImageSrc(previewUrl, attachment.mimeType, attachment.fileName)
      .then((imageSrc) => {
        if (!cancelled) setSrc(imageSrc);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [previewUrl, attachment.mimeType, attachment.fileName, isImage, reloadKey]);

  if (isImage && src) {
    return (
      <div className="relative inline-block">
        <img
          src={src}
          alt={attachment.fileName}
          className="h-16 w-16 rounded-lg object-cover"
          onError={() => {
            if (reloadKey < 2) setReloadKey((value) => value + 1);
          }}
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white"
          aria-label="Remove attachment"
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
      <span className="truncate">{attachment.fileName}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
        aria-label="Remove attachment"
      >
        <X size={12} />
      </button>
    </span>
  );
}
