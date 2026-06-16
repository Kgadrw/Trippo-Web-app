import { useNavigate } from "react-router-dom";
import { Plus, ArrowUp, ArrowDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateWithTime } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type RecentActivityRow = {
  id: string;
  type: "sale" | "expense";
  title: string;
  amount: number;
  date: string;
  meta?: string;
  subtitle?: string;
};

type RecentSalesTableProps = {
  activities: RecentActivityRow[];
  loading?: boolean;
  maxRows?: number;
  showViewMore?: boolean;
  className?: string;
  onRecordSale?: () => void;
};

function ActivityTypeIndicator({
  type,
  label,
  compact = false,
}: {
  type: "sale" | "expense";
  label: string;
  compact?: boolean;
}) {
  const isSale = type === "sale";
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "h-7 w-7" : "h-8 w-8",
          isSale ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
        )}
      >
        {isSale ? <ArrowUp size={compact ? 14 : 16} /> : <ArrowDown size={compact ? 14 : 16} />}
      </div>
      <span className={cn("font-medium", compact ? "text-xs" : "text-sm", isSale ? "text-emerald-700" : "text-red-700")}>
        {label}
      </span>
    </div>
  );
}

export function RecentSalesTable({
  activities,
  loading = false,
  maxRows = 10,
  showViewMore = true,
  className,
  onRecordSale,
}: RecentSalesTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rows = activities.slice(0, maxRows);

  return (
    <div className={cn("w-full min-w-0 max-w-full", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 pr-1">
        <div>
          <h3 className="section-title text-gray-600 mb-0">{t("latestActivity")}</h3>
        </div>
        {onRecordSale && (
          <Button
            onClick={onRecordSale}
            className="shrink-0 bg-primary hover:bg-blue-700 text-white gap-2 h-9 px-3 text-sm font-medium"
          >
            <Plus size={16} />
            {t("recordNewSale")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length > 0 ? (
        <>
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-sm font-bold text-gray-600 py-3 pl-0 pr-3">
                    {t("typeLabel")}
                  </th>
                  <th className="text-left text-sm font-bold text-gray-600 py-3 px-3">
                    {t("details")}
                  </th>
                  <th className="text-right text-sm font-bold text-gray-600 py-3 px-3">
                    {t("amountRwf")}
                  </th>
                  <th className="text-right text-sm font-bold text-gray-600 py-3 pl-3 pr-0">
                    {t("date")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((entry, index) => {
                  const isSale = entry.type === "sale";
                  const label = isSale ? t("activitySaleLabel") : t("activityExpenseLabel");
                  return (
                    <tr key={entry.id || index} className="bg-white">
                      <td className="py-3 pl-0 pr-3 align-top">
                        <ActivityTypeIndicator type={entry.type} label={label} />
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="text-sm text-gray-900 truncate">{entry.title}</div>
                        {(entry.subtitle || entry.meta) && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {[entry.subtitle, entry.meta].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top text-right">
                        <div
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            isSale ? "text-emerald-700" : "text-red-700",
                          )}
                        >
                          {isSale ? "+" : "-"}
                          {Number(entry.amount).toLocaleString()} rwf
                        </div>
                      </td>
                      <td className="py-3 pl-3 pr-0 align-top text-right">
                        <div className="text-sm text-gray-600 tabular-nums whitespace-nowrap">
                          {formatDateWithTime(entry.date)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {showViewMore && activities.length > maxRows && (
            <div className="pt-3">
              <Button variant="outline" className="w-full" onClick={() => navigate("/sales")}>
                {t("viewMoreInSales")}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="py-10 text-center bg-white">
          <Wallet size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">{t("noRecentActivity")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("activityEmptyHint")}</p>
        </div>
      )}
    </div>
  );
}
