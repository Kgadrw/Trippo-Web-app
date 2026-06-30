import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { categoryBudgetApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "@/components/categories/CategorySelect";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterSelectClass } from "@/lib/fieldStyles";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

interface CategoryBudgetEntry {
  id?: number;
  _id?: string;
  category: string;
  amount: number;
  budgetPeriod?: string;
  periodStart?: string;
  periodEnd?: string;
  note?: string;
}

interface SummaryRow {
  category: string;
  budget: number;
  actual: number;
  remaining: number;
  overBudget?: boolean;
}

function budgetId(b: CategoryBudgetEntry): string {
  return String(b._id ?? b.id ?? "");
}

export function CategoryBudgetsTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { items: budgets, isLoading, add, remove, refresh } = useApi<CategoryBudgetEntry>({
    endpoint: "categoryBudgets",
    defaultValue: [],
  });

  const [viewPeriod, setViewPeriod] = useState("monthly");
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalActual, setTotalActual] = useState(0);

  const [category, setCategory] = useState("general");
  const [amount, setAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState("monthly");
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<CategoryBudgetEntry>();

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await categoryBudgetApi.getSummary({ viewPeriod });
      if (res.data) {
        setSummaryRows(res.data.rows || []);
        setTotalBudget(res.data.totalBudget || 0);
        setTotalActual(res.data.totalActual || 0);
      }
    } catch {
      toast({ title: t("error"), description: t("loadBudgetSummaryFailed"), variant: "destructive" });
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, [viewPeriod, budgets]);

  const handleSave = async () => {
    if (!category.trim() || !amount) {
      toast({ title: t("saveFailed"), description: t("categoryBudgetRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await add({
        category: category.trim(),
        amount: parseFloat(amount),
        budgetPeriod,
        referenceDate: new Date().toISOString().split("T")[0],
      } as CategoryBudgetEntry);
      await loadSummary();
      toast({ title: t("budgetCreated"), description: t("budgetCreatedDesc") });
      setCategory("general");
      setAmount("");
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("saveBudgetFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    setIsDeleteDeleting(true);
    try {
      await remove(item);
      await loadSummary();
      toast({ title: t("deleted"), description: t("budgetRemovedDesc") });
    } catch (error: unknown) {
      toast({ title: t("error"), description: t("deleteBudgetFailed"), variant: "destructive" });
    } finally {
      setIsDeleteDeleting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{t("totalBudget")}</p>
          <p className="text-xl font-bold text-sky-800 tabular-nums"><CurrencyAmount amount={totalBudget} codeFirst codeClassName="text-sky-800/70" /></p>
        </div>
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">{t("totalActual")}</p>
          <p className="text-xl font-bold text-rose-700 tabular-nums"><CurrencyAmount amount={totalActual} codeFirst codeClassName="text-rose-700/70" /></p>
        </div>
        <div className="border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700">{t("remainingBalance")}</p>
          <p className="text-xl font-bold text-emerald-800 tabular-nums"><CurrencyAmount amount={totalBudget - totalActual} codeFirst codeClassName="text-emerald-800/70" /></p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Label className="text-sm shrink-0">{t("viewPeriod")}</Label>
        <Select value={viewPeriod} onValueChange={setViewPeriod}>
          <SelectTrigger className={cn(filterSelectClass, "w-40")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">{t("budgetPeriodMonthly")}</SelectItem>
            <SelectItem value="quarterly">{t("budgetPeriodQuarterly")}</SelectItem>
            <SelectItem value="yearly">{t("budgetPeriodYearly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <FinanceTableShell
        title={t("categoryBudgets")}
        onAdd={() => setOpen(true)}
        addLabel={t("add")}
        onRefresh={() => { void refresh(true); void loadSummary(); }}
        isRefreshing={summaryLoading}
      >
        {summaryLoading || isLoading ? (
          <FinanceTableLoading />
        ) : summaryRows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium">{t("noBudgetsYet")}</p>
            <p className="text-sm mt-1">{t("budgetsEmptyHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr>
                  <th className={FINANCE_TH_CLASS}>{t("category")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("budget")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("actual")}</th>
                  <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("remainingBalance")}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {summaryRows.map((row) => (
                  <tr key={row.category} className="border-t border-gray-100">
                    <td className={cn(FINANCE_TD_CLASS, "font-medium capitalize")}>{row.category}</td>
                    <td className={cn(FINANCE_TD_CLASS, "text-right tabular-nums")}>{formatCurrency(row.budget)}</td>
                    <td className={cn(FINANCE_TD_CLASS, "text-right tabular-nums", row.overBudget ? "text-red-600 font-semibold" : "")}>
                      {formatCurrency(row.actual)}
                    </td>
                    <td className={cn(FINANCE_TD_CLASS, "text-right tabular-nums", row.remaining < 0 ? "text-red-600" : "text-emerald-700")}>
                      {formatCurrency(row.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinanceTableShell>

      {budgets.length > 0 ? (
        <div className="mt-6 border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">{t("budgetRules")}</h3>
          <ul className="divide-y divide-gray-100">
            {budgets.map((b) => (
              <li key={budgetId(b)} className="flex items-center justify-between py-2 text-sm">
                <span className="capitalize">{b.category} · {b.budgetPeriod} · {formatCurrency(b.amount)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => requestDelete(b)}>
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addCategoryBudget")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <CategorySelect type="expense" value={category} onValueChange={setCategory} />
            </div>
            <div className="space-y-2">
              <Label>{t("budget")}</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("budgetPeriod")}</Label>
              <Select value={budgetPeriod} onValueChange={setBudgetPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("budgetPeriodMonthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("budgetPeriodQuarterly")}</SelectItem>
                  <SelectItem value="yearly">{t("budgetPeriodYearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="cancel" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc").replace("{name}", deleteTarget?.category ?? "")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        deletingLabel={t("deleting")}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleteDeleting}
      />
    </>
  );
}
