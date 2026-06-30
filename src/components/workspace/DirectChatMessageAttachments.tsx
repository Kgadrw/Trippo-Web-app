import { useEffect, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectChatAttachment } from "@/lib/workspaceDirectChatRealtime";
import {
  getChatAttachmentImageSrc,
  isChatImageAttachment,
  openChatAttachment,
} from "@/lib/chatUpload";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function ChatAttachmentImage({
  attachment,
  className,
  onOpenPreview,
}: {
  attachment: DirectChatAttachment;
  className?: string;
  onOpenPreview: (src: string, attachment: DirectChatAttachment) => void;
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
  attachments: DirectChatAttachment[];
  own?: boolean;
}) {
  const [preview, setPreview] = useState<{ src: string; attachment: DirectChatAttachment } | null>(
    null,
  );
  const [openingUrl, setOpeningUrl] = useState<string | null>(null);

  const handleOpenDocument = async (attachment: DirectChatAttachment) => {
    if (openingUrl) return;
    setOpeningUrl(attachment.url);
    try {
      await openChatAttachment(attachment.url, attachment.fileName, attachment.mimeType);
    } catch {
      // Keep the row clickable; user can retry.
    } finally {
      setOpeningUrl(null);
    }
  };

  if (!attachments.length) return null;

  return (
    <>
      <div className={cn("space-y-2", own ? "text-white" : "text-gray-800")}>
        {attachments.map((attachment) =>
          isChatImageAttachment(attachment.mimeType, attachment.fileName) ? (
            <ChatAttachmentImage
              key={`${attachment.url}-${attachment.fileName}`}
              attachment={attachment}
              onOpenPreview={(imageSrc, item) => setPreview({ src: imageSrc, attachment: item })}
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
              <span className="truncate underline">{attachment.fileName}</span>
            </button>
          ),
        )}
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="z-[200] max-w-[min(96vw,720px)] border-0 bg-black/90 p-2 shadow-none sm:p-4 [&>button:last-child]:hidden">
          {preview ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPreview(null)}
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
  attachment: DirectChatAttachment & { localPreviewUrl?: string };
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
