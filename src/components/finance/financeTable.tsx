import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, FileText, Plus, RefreshCw, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { useTranslation } from "@/hooks/useTranslation";
import { resolvePageHelpKey } from "@/lib/pageHelp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { openReceiptInNewTab } from "@/lib/financeUpload";

export const FINANCE_TH_CLASS =
  "px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 whitespace-nowrap bg-sidebar";
export const FINANCE_TD_CLASS = "px-3 py-2.5 text-sm text-gray-800 align-middle";

export function formatFinanceTableDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatPaymentMode(method: string | undefined, t: (key: string) => string) {
  const map: Record<string, string> = {
    cash: t("cash"),
    momo: t("momoPay"),
    airtel: t("airtelPay"),
    card: t("card"),
    transfer: t("bankTransfer"),
    other: t("other"),
  };
  return map[method || ""] || method || "—";
}

export function makeFinanceRef(prefix: string, id: string, index: number) {
  if (id && id.length > 4) return `${prefix}${id.slice(-4)}`;
  return `${prefix}${index + 1}`;
}

export type FinanceReceiptRef = {
  receiptFileName?: string | null;
  receiptUrl?: string | null;
};

/** Label for the # column — only when a document was uploaded. */
export function getFinanceDocumentRef(
  entry: FinanceReceiptRef,
  _fallbackPrefix?: string,
  _id?: string,
  _index?: number,
) {
  const name = entry.receiptFileName?.trim();
  if (name) return name;

  const url = entry.receiptUrl?.trim();
  if (!url) return "";

  try {
    const segment = url.split("?")[0].split("/").pop();
    return segment ? decodeURIComponent(segment) : "";
  } catch {
    return "";
  }
}

export function FinanceDocumentRefCell({
  entry,
  fallbackPrefix,
  id,
  index,
  onEdit,
  readOnly = false,
}: {
  entry: FinanceReceiptRef;
  fallbackPrefix: string;
  id: string;
  index: number;
  onEdit?: () => void;
  readOnly?: boolean;
}) {
  const ref = getFinanceDocumentRef(entry, fallbackPrefix, id, index);
  if (!ref) return null;

  const hasReceipt = Boolean(entry.receiptUrl?.trim());
  const canClick = hasReceipt || (!readOnly && onEdit);

  const content = (
    <>
      <span className="truncate max-w-[160px]">{ref}</span>
      <FileText size={14} className="shrink-0 opacity-70" />
    </>
  );

  if (!canClick) {
    return (
      <span
        className="inline-flex max-w-[160px] items-center gap-1.5 text-gray-600 font-normal"
        title={ref}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (hasReceipt) {
          void openReceiptInNewTab(entry.receiptUrl!).catch(() => undefined);
          return;
        }
        onEdit?.();
      }}
      className="inline-flex max-w-[160px] items-center gap-1.5 text-primary hover:underline font-normal"
      title={ref}
    >
      {content}
    </button>
  );
}

export function FinanceTableCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
  className,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        "h-[18px] w-[18px] shrink-0 rounded border border-gray-300 bg-white shadow-sm",
        "hover:border-gray-400",
        "data-[state=checked]:bg-sky-400 data-[state=checked]:border-sky-400 data-[state=checked]:text-white",
        "focus-visible:ring-sky-300 focus-visible:ring-offset-1",
        className,
      )}
    />
  );
}

export function FinanceTableLoading() {
  return (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

type FinanceTableMenuItem = {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
};

type FinanceTableToolbarProps = {
  title?: string;
  helpText?: string;
  onAdd?: () => void;
  addLabel?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showAdd?: boolean;
  menuItems?: FinanceTableMenuItem[];
};

export function FinanceTableToolbar({
  title = "",
  helpText,
  onAdd = () => {},
  addLabel = "",
  onRefresh = () => {},
  isRefreshing = false,
  showAdd = true,
  menuItems = [],
}: FinanceTableToolbarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const routeHelpKey = resolvePageHelpKey(location.pathname);
  const resolvedHelp = helpText ?? (routeHelpKey ? t(routeHelpKey) : undefined);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[15px] font-semibold text-gray-800 hover:text-gray-900"
        >
          {title}
          <ChevronDown size={16} className="text-primary" />
        </button>
        {resolvedHelp ? <HelpTip text={resolvedHelp} /> : null}
      </div>

      <div className="flex items-center gap-2">
        {showAdd ? (
          <Button
            className="h-9 gap-1.5 rounded-none bg-sky-400 px-4 text-white hover:bg-sky-500 border border-sky-400"
            onClick={onAdd}
          >
            <Plus size={16} />
            {addLabel}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-none border-gray-200"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
        </Button>
        {menuItems.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-none border-gray-200"
                aria-label="Actions"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map((item) => (
                <DropdownMenuItem key={item.label} onClick={item.onSelect}>
                  {item.icon}
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

export function FinanceTableShell({
  title,
  helpText,
  onAdd,
  addLabel,
  onRefresh,
  isRefreshing,
  showAdd,
  menuItems,
  children,
}: FinanceTableToolbarProps & { children: ReactNode }) {
  return (
    <div className="overflow-hidden bg-white">
      {title ? (
        <FinanceTableToolbar
          title={title}
          helpText={helpText}
          onAdd={onAdd}
          addLabel={addLabel}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          showAdd={showAdd}
          menuItems={menuItems}
        />
      ) : null}
      {children}
    </div>
  );
}
