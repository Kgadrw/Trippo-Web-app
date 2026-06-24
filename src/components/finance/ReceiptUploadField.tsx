import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { openReceiptInNewTab } from "@/lib/financeUpload";

type ReceiptUploadFieldProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  existingUrl?: string;
  existingName?: string;
  disabled?: boolean;
};

export function ReceiptUploadField({
  file,
  onFileChange,
  existingUrl,
  existingName,
  disabled,
}: ReceiptUploadFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = file?.name || existingName;

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] sm:text-xs">{t("uploadReceipt")}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          onFileChange(picked);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} />
          {displayName ? t("changeReceipt") : t("uploadReceipt")}
        </Button>
        {displayName && (
          <span className="text-xs text-muted-foreground truncate max-w-[12rem] flex items-center gap-1">
            <FileText size={14} className="shrink-0" />
            {displayName}
          </span>
        )}
        {(file || existingUrl) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            disabled={disabled}
            onClick={() => {
              onFileChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X size={14} />
          </Button>
        )}
        {existingUrl && !file && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-9 px-1 text-xs"
            onClick={() => void openReceiptInNewTab(existingUrl).catch(() => undefined)}
          >
            {t("viewReceipt")}
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">{t("receiptUploadHint")}</p>
    </div>
  );
}
