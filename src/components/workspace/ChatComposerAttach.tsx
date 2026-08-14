import { useRef } from "react";
import { FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isChatImageAttachment } from "@/lib/chatUpload";
import { cn } from "@/lib/utils";

export type PendingChatAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
};

const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf";
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export function filesToPendingAttachments(files: File[]): PendingChatAttachment[] {
  return files.map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: isChatImageAttachment(file.type, file.name) ? URL.createObjectURL(file) : null,
  }));
}

export function revokePendingAttachments(items: PendingChatAttachment[]) {
  for (const item of items) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }
}

export function formatPendingFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateChatAttachmentFiles(files: File[]) {
  const tooLarge = files.some((file) => file.size > MAX_ATTACHMENT_BYTES);
  return tooLarge
    ? { ok: false as const, message: "Each file must be 20 MB or smaller." }
    : { ok: true as const };
}

type ChatPendingAttachmentsProps = {
  items: PendingChatAttachment[];
  onRemove: (id: string) => void;
  className?: string;
};

export function ChatPendingAttachments({ items, onRemove, className }: ChatPendingAttachmentsProps) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "mb-2 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const isImage = Boolean(item.previewUrl);
        return (
          <div
            key={item.id}
            className="relative flex h-[4.5rem] min-w-[4.5rem] max-w-[11rem] shrink-0 items-stretch overflow-hidden rounded-xl bg-white ring-1 ring-black/10"
          >
            {isImage ? (
              <img
                src={item.previewUrl!}
                alt={item.file.name}
                className="h-full w-[4.5rem] object-cover"
              />
            ) : (
              <div className="flex w-full items-center gap-2 px-2.5 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 pr-5">
                  <p className="truncate text-xs font-medium text-gray-800">{item.file.name}</p>
                  <p className="text-[10px] text-gray-500">{formatPendingFileSize(item.file.size)}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
              aria-label="Remove attachment"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

type ChatAttachButtonProps = {
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
  className?: string;
  iconSize?: number;
};

export function ChatAttachButton({
  disabled,
  onFilesSelected,
  className,
  iconSize = 19,
}: ChatAttachButtonProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const pickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    onFilesSelected(Array.from(list));
  };

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple
        onChange={(event) => {
          pickFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        accept={DOC_ACCEPT}
        multiple
        onChange={(event) => {
          pickFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-sky-100 hover:text-sky-700 disabled:opacity-40",
              className,
            )}
            aria-label="Attach"
            title="Attach"
          >
            <Paperclip size={iconSize} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="min-w-[10.5rem]">
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              window.setTimeout(() => imageInputRef.current?.click(), 0);
            }}
          >
            <ImageIcon size={16} className="text-sky-600" />
            Photo
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              window.setTimeout(() => documentInputRef.current?.click(), 0);
            }}
          >
            <FileText size={16} className="text-sky-600" />
            Document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
