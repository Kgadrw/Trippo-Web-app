import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, FileText, Wallet, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useApi } from "@/hooks/useApi";
import { playSaleBeep, playErrorBeep } from "@/lib/sound";

interface Expense {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  date: string;
  category?: string;
  note?: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items: expenses, add: addExpense, refresh: refreshExpenses, isLoading: expensesLoading } = useApi<Expense>({
    endpoint: "expenses",
    defaultValue: [],
  });
  const { items: incomes, refresh: refreshIncomes, isLoading: incomesLoading } = useApi<{
    title?: string;
    date: string;
    amount: number;
  }>({
    endpoint: "incomes",
    defaultValue: [],
  });
  const { items: bills, refresh: refreshBills, isLoading: billsLoading } = useApi<{
    title?: string;
    dueDate: string;
    amount: number;
    status?: string;
  }>({
    endpoint: "bills",
    defaultValue: [],
  });
  const { items: payrolls, refresh: refreshPayrolls, isLoading: payrollsLoading } = useApi<{
    paymentDate: string;
    amount: number;
    status?: string;
  }>({
    endpoint: "payrolls",
    defaultValue: [],
  });
  const { items: taxes, refresh: refreshTaxes, isLoading: taxesLoading } = useApi<{
    title?: string;
    dueDate: string;
    amount: number;
    status?: string;
  }>({
    endpoint: "taxes",
    defaultValue: [],
  });
  const { items: invoices, refresh: refreshInvoices, isLoading: invoicesLoading } = useApi<{
    title?: string;
    dueDate: string;
    amount: number;
    status?: string;
    paidAt?: string;
  }>({
    endpoint: "invoices",
    defaultValue: [],
  });
  const { items: sales, refresh: refreshSales, isLoading: salesLoading } = useApi<{
    date: string;
    timestamp?: string;
    revenue: number;
  }>({
    endpoint: "sales",
    defaultValue: [],
  });
  const { items: bankDeposits, refresh: refreshBankDeposits, isLoading: bankDepositsLoading } = useApi<{
    depositDate: string;
    amount: number;
  }>({
    endpoint: "bankDeposits",
    defaultValue: [],
  });
  const { items: loans, refresh: refreshLoans, isLoading: loansLoading } = useApi<{
    principalAmount: number;
    startDate: string;
    remainingBalance?: number;
    status?: string;
    nextDueDate?: string;
    payments?: Array<{ paymentDate: string; amount: number }>;
  }>({
    endpoint: "loans",
    defaultValue: [],
  });
  const [expensePresets, setExpensePresets] = useState<Array<{ title: string; amount?: number }>>(() => {
    try {
      const raw = localStorage.getItem("trippo-expense-presets");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("general");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const expenseSuggestions = useMemo(() => {
    const normalize = (s: string) => s.trim().toLowerCase();

    const freq = new Map<string, { title: string; count: number; lastMs: number; lastAmount: number }>();
    for (const e of expenses) {
      const title = (e.title || "").toString().trim();
      if (!title) continue;
      const key = normalize(title);
      const ms = new Date(e.date as any).getTime();
      const lastMs = Number.isNaN(ms) ? 0 : ms;
      const amount = Number(e.amount) || 0;
      const cur = freq.get(key) || { title, count: 0, lastMs: 0, lastAmount: amount };
      cur.count += 1;
      if (lastMs >= cur.lastMs) {
        cur.lastMs = lastMs;
        cur.title = title;
        cur.lastAmount = amount;
      }
      freq.set(key, cur);
    }

    const recent = [...expenses]
      .slice()
      .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime())
      .map((e) => (e.title || "").toString().trim())
      .filter(Boolean)
      .filter((t, idx, arr) => arr.findIndex((x) => normalize(x) === normalize(t)) === idx)
      .slice(0, 6);

    const presetTitles = expensePresets
      .map((p) => (p.title || "").toString().trim())
      .filter(Boolean)
      .filter((t, idx, arr) => arr.findIndex((x) => normalize(x) === normalize(t)) === idx)
      .slice(0, 6);

    const titleToSuggestedAmount = new Map<string, number>();
    for (const v of freq.values()) {
      if (v.lastAmount > 0) titleToSuggestedAmount.set(normalize(v.title), v.lastAmount);
    }
    for (const p of expensePresets) {
      const t = (p.title || "").toString().trim();
      if (!t) continue;
      if (typeof p.amount === "number" && !Number.isNaN(p.amount) && p.amount > 0) {
        titleToSuggestedAmount.set(normalize(t), p.amount);
      }
    }

    const allTitles = Array.from(
      new Set([
        ...presetTitles.map(normalize),
        ...recent.map(normalize),
      ])
    )
      .map((key) => {
        const fromPreset = expensePresets.find((p) => normalize(p.title || "") === key);
        const fromRecent = recent.find((r) => normalize(r) === key);
        return (fromPreset?.title || fromRecent || "").trim();
      })
      .filter(Boolean);

    return {
      presetTitles,
      recent,
      allTitles,
      normalize,
      getSuggestedAmount: (title: string) => titleToSuggestedAmount.get(normalize(title)),
    };
  }, [expenses, expensePresets]);

  const applyExpenseSuggestion = (title: string) => {
    const clean = title.trim();
    setExpenseTitle(clean);
    const suggested = expenseSuggestions.getSuggestedAmount(clean);
    if (typeof suggested === "number" && suggested > 0) {
      setExpenseAmount(String(suggested));
    }
  };

  const saveExpensePreset = () => {
    const title = expenseTitle.trim();
    if (!title) return;
    const amount = Number(expenseAmount);
    const preset = { title, amount: !Number.isNaN(amount) && amount > 0 ? amount : undefined };

    const next = [
      preset,
      ...expensePresets.filter(
        (p) => expenseSuggestions.normalize(p.title || "") !== expenseSuggestions.normalize(title)
      ),
    ].slice(0, 12);

    setExpensePresets(next);
    try {
      localStorage.setItem("trippo-expense-presets", JSON.stringify(next));
    } catch {
      // ignore
    }
    toast({
      title: "Saved",
      description: "Expense preset saved for quick reuse.",
    });
  };

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  }, []);

  // Refresh finance data every time dashboard is opened
  useEffect(() => {
    refreshExpenses(true);
    refreshIncomes(true);
    refreshBills(true);
    refreshPayrolls(true);
    refreshTaxes(true);
    refreshInvoices(true);
    refreshSales(true);
    refreshBankDeposits(true);
    refreshLoans(true);
    window.dispatchEvent(new CustomEvent('page-opened'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep chart in sync when finance data changes on other pages
  useEffect(() => {
    const handleExpensesRefresh = () => {
      void refreshExpenses(true);
    };
    const handleIncomesRefresh = () => {
      void refreshIncomes(true);
    };
    const handleBillsRefresh = () => {
      void refreshBills(true);
    };
    const handlePayrollsRefresh = () => {
      void refreshPayrolls(true);
    };
    const handleTaxesRefresh = () => {
      void refreshTaxes(true);
    };
    const handleInvoicesRefresh = () => {
      void refreshInvoices(true);
    };
    const handleSalesRefresh = () => {
      void refreshSales(true);
    };
    const handleBankDepositsRefresh = () => {
      void refreshBankDeposits(true);
    };
    const handleLoansRefresh = () => {
      void refreshLoans(true);
    };
    window.addEventListener("expenses-should-refresh", handleExpensesRefresh);
    window.addEventListener("incomes-should-refresh", handleIncomesRefresh);
    window.addEventListener("bills-should-refresh", handleBillsRefresh);
    window.addEventListener("payrolls-should-refresh", handlePayrollsRefresh);
    window.addEventListener("taxes-should-refresh", handleTaxesRefresh);
    window.addEventListener("invoices-should-refresh", handleInvoicesRefresh);
    window.addEventListener("sales-should-refresh", handleSalesRefresh);
    window.addEventListener("bank-deposits-should-refresh", handleBankDepositsRefresh);
    window.addEventListener("loans-should-refresh", handleLoansRefresh);
    window.addEventListener("finance-should-refresh", () => {
      void refreshIncomes(true);
      void refreshExpenses(true);
      void refreshBills(true);
      void refreshPayrolls(true);
      void refreshTaxes(true);
      void refreshInvoices(true);
      void refreshSales(true);
      void refreshBankDeposits(true);
      void refreshLoans(true);
    });
    return () => {
      window.removeEventListener("expenses-should-refresh", handleExpensesRefresh);
      window.removeEventListener("incomes-should-refresh", handleIncomesRefresh);
      window.removeEventListener("bills-should-refresh", handleBillsRefresh);
      window.removeEventListener("payrolls-should-refresh", handlePayrollsRefresh);
      window.removeEventListener("taxes-should-refresh", handleTaxesRefresh);
      window.removeEventListener("invoices-should-refresh", handleInvoicesRefresh);
      window.removeEventListener("sales-should-refresh", handleSalesRefresh);
      window.removeEventListener("bank-deposits-should-refresh", handleBankDepositsRefresh);
      window.removeEventListener("loans-should-refresh", handleLoansRefresh);
    };
  }, [refreshExpenses, refreshIncomes, refreshBills, refreshPayrolls, refreshTaxes, refreshInvoices, refreshSales, refreshBankDeposits, refreshLoans]);
  
  // Get today's date in YYYY-MM-DD format (consistent across all devices)
  const getTodayDate = () => {
    const now = new Date();
    // Use local date to ensure consistency (not UTC)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!expenseDate) {
      setExpenseDate(getTodayDate());
    }
  }, [expenseDate]);

  const handleRecordExpense = async () => {
    if (isSavingExpense) return;

    const amount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amount) || amount <= 0) {
      toast({
        title: "Missing information",
        description: "Please enter an expense name and a valid amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingExpense(true);
      const now = new Date();
      const savedDate = new Date((expenseDate || getTodayDate()) + "T00:00:00");
      savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      await addExpense({
        title: expenseTitle.trim(),
        amount,
        category: expenseCategory.trim() || "general",
        date: savedDate.toISOString(),
        note: expenseNote.trim() || undefined,
      } as any);

      await refreshExpenses(true);
      window.dispatchEvent(new CustomEvent("expenses-should-refresh"));
      playSaleBeep();
      toast({
        title: "Expense recorded",
        description: "Your expense has been saved successfully.",
      });

      setExpenseModalOpen(false);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseCategory("general");
      setExpenseDate(getTodayDate());
      setExpenseNote("");
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: "Save failed",
        description: error?.message || "Could not save the expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingExpense(false);
    }
  };

  const isLoading =
    expensesLoading ||
    incomesLoading ||
    billsLoading ||
    payrollsLoading ||
    taxesLoading ||
    invoicesLoading ||
    salesLoading ||
    bankDepositsLoading ||
    loansLoading;
  const [dashboardReady, setDashboardReady] = useState(false);

  useEffect(() => {
    if (!isLoading) setDashboardReady(true);
  }, [isLoading]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDashboardReady(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppLayout title={t("dashboard")}>
      <div className="mb-6">
        <DashboardOverview
          incomes={incomes}
          expenses={expenses}
          bills={bills}
          payrolls={payrolls}
          taxes={taxes}
          invoices={invoices}
          sales={sales}
          bankDeposits={bankDeposits}
          loans={loans}
          loading={!dashboardReady}
        />
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions - Mobile Only */}
        <div className="lg:hidden">
          <div className="bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <h3 className="text-base font-bold text-gray-900">
              Quick Actions
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Record expenses, view reports, and manage finance from here.
            </p>
            
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => navigate("/reports")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <FileText size={18} />
                <span className="text-xs font-medium">
                  Reports
                </span>
              </Button>

              <Button
                onClick={() => setExpenseModalOpen(true)}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Wallet size={18} />
                <span className="text-xs font-medium">
                  Record Expense
                </span>
              </Button>

              <Button
                onClick={() => navigate("/products")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Package size={18} />
                <span className="text-xs font-medium">
                  Products
                </span>
              </Button>

              <Button
                onClick={() => navigate("/finance/expenditure")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Wallet size={18} />
                <span className="text-xs font-medium">
                  Expenditure
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AddToHomeScreen />

      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[21rem] sm:max-w-[560px] max-h-[min(70vh,100dvh-2rem)] sm:max-h-[85vh] overflow-y-auto overflow-x-hidden p-0 bg-white border-gray-200 shadow-xl">
          <div className="p-3 sm:p-4 min-w-0 max-w-full overflow-x-hidden">
          <DialogHeader className="pb-2 sm:pb-0">
            <DialogTitle className="text-base sm:text-lg font-semibold">Record Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] sm:text-xs">Expense title</Label>
              <Input
                value={expenseTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  setExpenseTitle(v);
                  const suggested = expenseSuggestions.getSuggestedAmount(v);
                  if (typeof suggested === "number" && suggested > 0) {
                    setExpenseAmount(String(suggested));
                  }
                }}
                placeholder="e.g. Office supplies"
                className="h-9 sm:h-10 text-sm sm:text-base w-full min-w-0"
              />

              {(expenseSuggestions.presetTitles.length > 0 ||
                expenseSuggestions.recent.length > 0) && (
                <div className="pt-1.5 sm:pt-2 space-y-1.5 sm:space-y-2">
                  {expenseSuggestions.presetTitles.length > 0 && (
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-gray-600">
                        Presets
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {expenseSuggestions.presetTitles.map((title) => (
                          <Button
                            key={title}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 sm:h-8 max-w-full rounded-full text-xs truncate"
                            onClick={() => applyExpenseSuggestion(title)}
                          >
                            {title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {expenseSuggestions.recent.length > 0 && (
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-gray-600">
                        Recent expenses
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {expenseSuggestions.recent.map((title) => (
                          <Button
                            key={title}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 sm:h-8 max-w-full rounded-full text-xs truncate"
                            onClick={() => applyExpenseSuggestion(title)}
                          >
                            {title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-blue-700"
                      onClick={saveExpensePreset}
                      disabled={!expenseTitle.trim()}
                    >
                      Save preset
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] sm:text-xs">Amount (Rwf)</Label>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0"
                className="h-9 sm:h-10 text-sm sm:text-base w-full min-w-0"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label className="text-[11px] sm:text-xs">Category</Label>
                <Input
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  placeholder="e.g. general, transport"
                  className="h-9 sm:h-10 text-sm sm:text-base w-full min-w-0"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-[11px] sm:text-xs">Date</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-9 sm:h-10 text-sm sm:text-base w-full min-w-0 max-w-full"
                />
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] sm:text-xs">Note (optional)</Label>
              <Textarea
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="Add any extra details"
                rows={isMobile ? 2 : 3}
                className="text-sm sm:text-base min-h-[4.5rem] sm:min-h-0 w-full min-w-0 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="cancel" onClick={() => setExpenseModalOpen(false)} className="h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <Button
              onClick={handleRecordExpense}
              className="h-9 sm:h-10 text-sm"
              disabled={isSavingExpense}
            >
              {isSavingExpense ? "Saving..." : "Save expense"}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Dashboard;
