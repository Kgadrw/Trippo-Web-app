import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import { DesktopDataTable, MobileDataList, MobileListCard } from "@/components/ui/mobile-list-card";
import { AlertTriangle, Package } from "lucide-react";
import { ReportChartCard } from "@/components/reports/ReportChartCard";
import { ReportEmptyIllustration } from "@/components/reports/ReportEmptyIllustration";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = ["#2563eb", "#22c55e", "#f97316", "#a855f7", "#eab308", "#06b6d4", "#ef4444"];

type ProductRow = {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock?: number;
  costPrice: number;
  sellingPrice: number;
  inventoryValue: number;
  isLowStock: boolean;
};

type InventoryReportsSectionProps = {
  products: ProductRow[];
  reportPeriodLabel: string;
};

export function InventoryReportsSection({ products, reportPeriodLabel }: InventoryReportsSectionProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const inventoryValue = products.reduce((sum, p) => sum + p.inventoryValue, 0);
    const retailValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stock, 0);
    const lowStock = products.filter((p) => p.isLowStock);
    const outOfStock = products.filter((p) => p.stock <= 0);
    const byCategory = products.reduce<Record<string, { count: number; stock: number; value: number }>>((acc, p) => {
      const cat = p.category || t("uncategorized");
      if (!acc[cat]) acc[cat] = { count: 0, stock: 0, value: 0 };
      acc[cat].count += 1;
      acc[cat].stock += p.stock;
      acc[cat].value += p.inventoryValue;
      return acc;
    }, {});
    const categoryRows = Object.entries(byCategory)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.value - a.value);

    return { totalStock, inventoryValue, retailValue, lowStock, outOfStock, categoryRows };
  }, [products, t]);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => b.inventoryValue - a.inventoryValue),
    [products],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-1">
          <div className="flex items-start gap-3">
            <Package className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
            <div>
              <p className="text-xs text-muted-foreground">{t("products")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="p-1">
          <p className="text-xs text-muted-foreground">{t("stock")}</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{stats.totalStock.toLocaleString()}</p>
        </div>
        <div className="p-1">
          <p className="text-xs text-muted-foreground">{t("inventoryValue")}</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums"><CurrencyAmount amount={stats.inventoryValue} codeFirst /></p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("retailValue")}: {formatCurrency(stats.retailValue)}
          </p>
        </div>
        <div className="p-1">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">{t("lowStock")}</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">{stats.lowStock.length}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("outOfStock")}: {stats.outOfStock.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {stats.categoryRows.length > 0 ? (
        <ReportChartCard title={t("salesByCategory")} subtitle={t("inventoryValue")}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.categoryRows.map((row, i) => ({
                  name: row.category,
                  value: row.value,
                  fill: PIE_COLORS[i % PIE_COLORS.length],
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {stats.categoryRows.map((row, i) => (
                  <Cell key={row.category} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </ReportChartCard>
      ) : (
        <ReportEmptyIllustration title={t("noProductsFound")} variant="inventory" />
      )}

      {stats.categoryRows.length > 0 ? (
        <ReportChartCard title={t("salesByCategory")}>
          <DesktopDataTable>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("category")}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("products")}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("stock")}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">{t("inventoryValue")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.categoryRows.map((row) => (
                  <tr key={row.category}>
                    <td className="px-6 py-3 text-sm text-gray-900">{row.category}</td>
                    <td className="px-6 py-3 text-sm tabular-nums text-gray-700">{row.count}</td>
                    <td className="px-6 py-3 text-sm tabular-nums text-gray-700">{row.stock.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums text-gray-800">
                      {formatCurrency(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopDataTable>
        </ReportChartCard>
      ) : null}

      <ReportChartCard title={t("topProducts")}>
        {sortedProducts.length > 0 ? (
          <>
            <DesktopDataTable>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("product")}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("category")}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("stock")}</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">{t("inventoryValue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.slice(0, 20).map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        <span className="inline-flex items-center gap-1.5">
                          {row.isLowStock ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : null}
                          {row.name}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">{row.category || "—"}</td>
                      <td className="px-6 py-3 text-sm tabular-nums text-gray-700">{row.stock.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums text-gray-800">
                        {formatCurrency(row.inventoryValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DesktopDataTable>
            <MobileDataList>
              {sortedProducts.slice(0, 20).map((row, index) => (
                <MobileListCard key={row.id} index={index}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.category || "—"} · {t("stock")}: {row.stock}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums"><CurrencyAmount amount={row.inventoryValue} codeFirst /></span>
                  </div>
                </MobileListCard>
              ))}
            </MobileDataList>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noProductsFound")}</p>
        )}
      </ReportChartCard>
    </div>
  );
}

export type { ProductRow };
