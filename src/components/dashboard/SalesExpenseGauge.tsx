import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CurrencyAmount } from "@/lib/currency";
import { useTranslation } from "@/hooks/useTranslation";

type SalesExpenseGaugeProps = {
  salesCount: number;
  salesTotal: number;
  expensesTotal: number;
  className?: string;
};

const CX = 100;
const CY = 96;
const RADIUS = 72;
const STROKE = 14;

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function describeArc(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle, RADIUS);
  const end = polarToCartesian(endAngle, RADIUS);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function SalesExpenseGauge({
  salesCount,
  salesTotal,
  expensesTotal,
  className,
}: SalesExpenseGaugeProps) {
  const { t } = useTranslation();

  const { salesPct, expensesPct, net, hasData } = useMemo(() => {
    const sales = Math.max(0, Number(salesTotal) || 0);
    const expenses = Math.max(0, Number(expensesTotal) || 0);
    const total = sales + expenses;
    const count = Math.max(0, Number(salesCount) || 0);

    if (total === 0 && count === 0) {
      return { salesPct: 0, expensesPct: 0, net: 0, hasData: false };
    }

    const salesPercent = total > 0 ? Math.round((sales / total) * 100) : 0;
    const expensesPercent = total > 0 ? 100 - salesPercent : 0;

    return {
      salesPct: salesPercent,
      expensesPct: expensesPercent,
      net: sales - expenses,
      hasData: true,
    };
  }, [salesCount, salesTotal, expensesTotal]);

  const expensesEndAngle = -180 + (expensesPct / 100) * 180;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-900">{t("salesExpenseBalance")}</h3>
        <p className="text-xs text-gray-600 mt-1">{t("salesAndExpenses")}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[280px]">
        <svg viewBox="0 0 200 130" className="w-full max-w-[220px]" aria-hidden>
          <path
            d={describeArc(-180, 0)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {expensesPct > 0 && (
            <path
              d={describeArc(-180, expensesEndAngle)}
              fill="none"
              stroke="#f87171"
              strokeWidth={STROKE}
              strokeLinecap="butt"
            />
          )}
          {salesPct > 0 && (
            <path
              d={describeArc(expensesEndAngle, 0)}
              fill="none"
              stroke="#2563eb"
              strokeWidth={STROKE}
              strokeLinecap="butt"
            />
          )}
        </svg>

        {!hasData ? (
          <p className="text-xs text-muted-foreground text-center mt-2">{t("noActivity")}</p>
        ) : (
          <div className="w-full mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="px-3 py-3 text-center rounded-lg bg-blue-50">
                <p className="text-[11px] font-medium text-gray-600">{t("sales")}</p>
                <p className="text-2xl font-bold tabular-nums kpi-value-revenue mt-1">
                  {salesCount.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 tabular-nums">
                  {salesTotal.toLocaleString()} Rwf
                </p>
              </div>
              <div className="px-3 py-3 text-center rounded-lg bg-red-50">
                <p className="text-[11px] font-medium text-gray-600">{t("expenses")}</p>
                <p className="text-2xl font-bold tabular-nums kpi-value-loss mt-1">
                  {expensesTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Rwf</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-600">{t("netFlow")}</span>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums inline-flex items-baseline gap-1",
                    net >= 0 ? "kpi-value-profit" : "kpi-value-loss",
                  )}
                >
                  {net >= 0 ? "+" : ""}
                  <CurrencyAmount amount={net} codeClassName="opacity-70" />
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 tabular-nums text-right">
                {salesTotal.toLocaleString()} − {expensesTotal.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
