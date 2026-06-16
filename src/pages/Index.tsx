import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { SalesExpenseGauge } from "@/components/dashboard/SalesExpenseGauge";
import { RecentSalesTable } from "@/components/dashboard/RecentSalesTable";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { RecordSaleModal } from "@/components/mobile/RecordSaleModal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { ShoppingCart, DollarSign, TrendingUp, Package, Plus, Clock, FileText, UserRound, Wallet, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";
import { playSaleBeep, playErrorBeep } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDateWithTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Product {
  id?: number;
  _id?: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  isPackage?: boolean;
  packageQuantity?: number;
  priceType?: "perQuantity" | "perPackage"; // "perQuantity" = price per individual item, "perPackage" = price for whole package
  costPriceType?: "perQuantity" | "perPackage"; // "perQuantity" = cost price per individual item, "perPackage" = cost price for whole package
  productType?: string;
  minStock?: number;
}

interface Sale {
  id?: number;
  _id?: string;
  product: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  date: string;
  timestamp?: string;
  paymentMethod?: string;
  saleType?: "product" | "service";
  serviceName?: string;
  workerId?: string;
  workerName?: string;
}

interface Expense {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  date: string;
  category?: string;
  note?: string;
}

type RevenuePeriod = "today" | "week" | "month" | "year";
function getSaleTimeMs(sale: Sale): number | null {
  if (sale.timestamp) {
    const t = new Date(sale.timestamp).getTime();
    if (!isNaN(t)) return t;
  }
  if (typeof sale.date === "string") {
    const raw = sale.date.includes("T") ? sale.date : `${sale.date}T12:00:00`;
    const t = new Date(raw).getTime();
    if (!isNaN(t)) return t;
  }
  if (sale.date != null) {
    const t = new Date(sale.date as string | number).getTime();
    if (!isNaN(t)) return t;
  }
  return null;
}

function getExpenseTimeMs(expense: Expense): number | null {
  if (!expense?.date) return null;
  const d = expense.date;
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const t = new Date(`${d}T12:00:00`).getTime();
      return isNaN(t) ? null : t;
    }
    const t = new Date(d).getTime();
    if (!isNaN(t)) return t;
  }
  const t = new Date(d as string | number).getTime();
  return isNaN(t) ? null : t;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfLocalDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function getPeriodStart(period: RevenuePeriod, now: Date): Date {
  switch (period) {
    case "today":
      return startOfLocalDay(now);
    case "week":
      return startOfWeekMonday(now);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

function getPreviousPeriodBounds(
  period: RevenuePeriod,
  now: Date,
): { startMs: number; endMs: number } {
  switch (period) {
    case "today": {
      const day = startOfLocalDay(now);
      day.setDate(day.getDate() - 1);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      return { startMs: day.getTime(), endMs: end.getTime() };
    }
    case "week": {
      const thisWeekStart = startOfWeekMonday(now);
      const prevWeekEnd = new Date(thisWeekStart.getTime() - 1);
      prevWeekEnd.setHours(23, 59, 59, 999);
      const prevWeekStart = startOfWeekMonday(prevWeekEnd);
      return { startMs: prevWeekStart.getTime(), endMs: prevWeekEnd.getTime() };
    }
    case "month": {
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startMs: prevMonthStart.getTime(), endMs: prevMonthEnd.getTime() };
    }
    case "year": {
      const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { startMs: prevYearStart.getTime(), endMs: prevYearEnd.getTime() };
    }
  }
}

function computeStatsForRange(
  sales: Sale[],
  expenses: Expense[],
  startMs: number,
  endMs: number,
) {
  const filteredSales = sales.filter((sale) => {
    const t = getSaleTimeMs(sale);
    return t !== null && t >= startMs && t <= endMs;
  });
  const filteredExpenses = expenses.filter((expense) => {
    const t = getExpenseTimeMs(expense);
    return t !== null && t >= startMs && t <= endMs;
  });

  const totalItems = filteredSales.reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (Number(sale.revenue) || 0), 0);
  const grossProfit = filteredSales.reduce((sum, sale) => sum + (Number(sale.profit) || 0), 0);
  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0,
  );

  return {
    salesCount: filteredSales.length,
    expensesCount: filteredExpenses.length,
    totalItems,
    totalRevenue,
    totalExpenses,
    totalProfit: grossProfit - totalExpenses,
  };
}

export type KpiTrendDisplay = {
  value: string;
  positive: boolean;
  flat: boolean;
  hasComparison: boolean;
  comparisonLabel?: string;
};

function formatKpiTrend(current: number, previous: number): KpiTrendDisplay {
  const cur = Number.isFinite(current) ? current : 0;
  const prev = Number.isFinite(previous) ? previous : 0;

  // No prior-period baseline ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â first use or no historical activity to compare against.
  if (prev === 0) {
    return {
      value: "0%",
      positive: true,
      flat: true,
      hasComparison: false,
    };
  }

  // Had prior activity but none in the current period ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a real decline.
  if (cur === 0) {
    return {
      value: "-100%",
      positive: false,
      flat: false,
      hasComparison: true,
    };
  }

  const change = ((cur - prev) / Math.abs(prev)) * 100;
  const rounded = Math.round(change);

  if (rounded === 0) {
    return {
      value: "0%",
      positive: true,
      flat: true,
      hasComparison: true,
    };
  }

  const sign = rounded > 0 ? "+" : "";
  return {
    value: `${sign}${rounded}%`,
    positive: rounded > 0,
    flat: false,
    hasComparison: true,
  };
}

function withComparisonLabel(
  trend: KpiTrendDisplay,
  comparisonLabel: string,
): KpiTrendDisplay {
  return { ...trend, comparisonLabel };
}

function getComparisonLabel(period: RevenuePeriod, t: (key: string) => string) {
  switch (period) {
    case "today":
      return t("vsYesterday");
    case "week":
      return t("vsLastWeek");
    case "month":
      return t("vsLastMonth");
    case "year":
      return t("vsLastYear");
  }
}

function isServiceItem(p: Product) {
  return (p.category || "").toLowerCase() === "service";
}

const Dashboard = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const greetingName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return null;
    return n.split(" ")[0] || n;
  }, [user?.name]);

  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setCurrentDateTime(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const dateTimeLocale = language === "fr" ? "fr-FR" : language === "rw" ? "en-RW" : "en-US";
  const greetingDate = currentDateTime.toLocaleDateString(dateTimeLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const greetingTime = currentDateTime.toLocaleTimeString(dateTimeLocale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: language !== "fr",
  });
  const {
    items: products,
    isLoading: productsLoading,
    refresh: refreshProducts,
  } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
    onError: (error) => {
      // Only log, don't show toast here - let the skeleton handle the loading state
      console.error("Error loading products:", error);
    },
  });
  const {
    items: sales,
    isLoading: salesLoading,
    refresh: refreshSales,
  } = useApi<Sale>({
    endpoint: "sales",
    defaultValue: [],
    onError: (error) => {
      // Only log, don't show toast here - let the skeleton handle the loading state
      console.error("Error with sales:", error);
    },
  });
  const { items: expenses, add: addExpense, refresh: refreshExpenses, isLoading: expensesLoading } = useApi<Expense>({
    endpoint: "expenses",
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
      title: t("saved"),
      description: t("expensePresetSavedDesc"),
    });
  };

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  }, []);

  // Refresh products and sales every time dashboard is opened (only once on mount)
  useEffect(() => {
    const refreshAll = () => {
      void refreshProducts(true);
      void refreshSales(true);
      void refreshExpenses(true);
    };

    refreshAll();
    window.dispatchEvent(new CustomEvent("page-opened"));

    // Retry when the API was down on first load
    window.addEventListener("online", refreshAll);

    return () => {
      window.removeEventListener("online", refreshAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep gauge in sync when expenses change on other pages
  useEffect(() => {
    const handleExpensesRefresh = () => {
      void refreshExpenses(true);
    };
    window.addEventListener("expenses-should-refresh", handleExpensesRefresh);
    return () => window.removeEventListener("expenses-should-refresh", handleExpensesRefresh);
  }, [refreshExpenses]);
  
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
  
  // Calculate KPI values from real data - always uses fresh sales data
  const todayStats = useMemo(() => {
    const now = new Date();
    const startMs = startOfLocalDay(now).getTime();
    return computeStatsForRange(sales, expenses, startMs, now.getTime());
  }, [sales, expenses]);

  // Today's stats for gauge ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â full local day so dated expenses/sales from DB are included
  const todayGaugeStats = useMemo(() => {
    const now = new Date();
    const startMs = startOfLocalDay(now).getTime();
    const endMs = endOfLocalDay(now).getTime();
    return computeStatsForRange(sales, expenses, startMs, endMs);
  }, [sales, expenses]);

  const yesterdayStats = useMemo(() => {
    const now = new Date();
    const { startMs, endMs } = getPreviousPeriodBounds("today", now);
    return computeStatsForRange(sales, expenses, startMs, endMs);
  }, [sales, expenses]);

  const [mobileRevenuePeriod, setMobileRevenuePeriod] = useState<RevenuePeriod>("today");

  const mobilePeriodStats = useMemo(() => {
    const now = new Date();
    const startMs = getPeriodStart(mobileRevenuePeriod, now).getTime();
    return computeStatsForRange(sales, expenses, startMs, now.getTime());
  }, [sales, expenses, mobileRevenuePeriod]);

  const mobilePreviousPeriodStats = useMemo(() => {
    const now = new Date();
    const { startMs, endMs } = getPreviousPeriodBounds(mobileRevenuePeriod, now);
    return computeStatsForRange(sales, expenses, startMs, endMs);
  }, [sales, expenses, mobileRevenuePeriod]);

  const mobileComparisonLabel = useMemo(
    () => getComparisonLabel(mobileRevenuePeriod, t),
    [mobileRevenuePeriod, t],
  );

  const mobileRevenueProfitLabels = useMemo(() => {
    switch (mobileRevenuePeriod) {
      case "today":
        return { revenue: t("todaysRevenue"), profit: t("todaysProfit") };
      case "week":
        return { revenue: t("weekRevenue"), profit: t("weekProfit") };
      case "month":
        return { revenue: t("monthRevenue"), profit: t("monthProfit") };
      case "year":
        return { revenue: t("yearRevenue"), profit: t("yearProfit") };
    }
  }, [mobileRevenuePeriod, t]);
  
  const serviceStats = useMemo(() => {
    const services = products.filter((p) => isServiceItem(p));
    return { totalServices: services.length };
  }, [products]);

  const recentActivity = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const startMs = startOfToday.getTime();
    const endMs = endOfToday.getTime();

    const saleEntries = sales
      .filter((s) => {
        const t = getSaleTimeMs(s);
        if (t === null) return false;
        return t >= startMs && t <= endMs;
      })
      .map((sale) => ({
        id: `sale-${(sale as any)._id || sale.id || Math.random()}`,
        type: "sale" as const,
        title: sale.serviceName || sale.product,
        subtitle: sale.workerName || "",
        amount: sale.revenue || 0,
        date: sale.timestamp || sale.date,
        meta: sale.paymentMethod || "",
      }));

    const expenseEntries = expenses
      .filter((e) => {
        const t = getExpenseTimeMs(e);
        if (t === null) return false;
        return t >= startMs && t <= endMs;
      })
      .map((expense) => ({
        id: `expense-${(expense as any)._id || expense.id || Math.random()}`,
        type: "expense" as const,
        title: expense.title,
        amount: expense.amount || 0,
        date: expense.date,
        meta: expense.category || "",
      }));

    return [...saleEntries, ...expenseEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [sales, expenses]);

  // Listen for products updates from other pages (Products page, AddProduct, etc.)
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout | null = null;
    const DEBOUNCE_DELAY = 300; // Reduced to 300ms for faster updates

    const handleProductUpdate = () => {
      // Clear any pending debounced refresh
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
      }
      
      // Always force refresh to get real data from API (bypass cache)
      // Use shorter debounce for better UX - Products should update quickly
      debounceTimeout = setTimeout(() => {
        refreshProducts(true); // Force refresh to get fresh data
        console.log('[Dashboard] Products refreshed after product created/updated');
      }, DEBOUNCE_DELAY);
    };

    // Listen for custom event when products are updated
    window.addEventListener('products-should-refresh', handleProductUpdate);

    return () => {
      window.removeEventListener('products-should-refresh', handleProductUpdate);
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [refreshProducts]);

  const [saleModalOpen, setSaleModalOpen] = useState(false);

  const handleRecordExpense = async () => {
    if (isSavingExpense) return;

    const amount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amount) || amount <= 0) {
      toast({
        title: t("missingInformation"),
        description: t("expenseNameAmountRequired"),
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
        title: t("expenseRecorded"),
        description: t("expenseRecordedDesc"),
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
        title: t("saveFailed"),
        description: error?.message || t("saveExpenseFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSavingExpense(false);
    }
  };

  const isLoading = productsLoading || salesLoading || expensesLoading;

  // KPI Card Skeleton Component
  const KPICardSkeleton = ({ hideIcon }: { hideIcon?: boolean } = {}) => (
    <div className="kpi-card">
      <div className={cn("flex items-start", !hideIcon && "justify-between")}>
        <div className={cn("space-y-2 flex-1 min-w-0", hideIcon && "w-full")}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full max-w-[10rem]" />
          <Skeleton className="h-3 w-16" />
        </div>
        {!hideIcon && (
        <div className="ml-4 shrink-0">
          <Skeleton className="w-12 h-12 rounded" />
        </div>
        )}
      </div>
    </div>
  );

  // Chart Skeleton Component
  const ChartSkeleton = () => (
    <div className="bg-white p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="h-6 w-48" />
        </div>
      <Skeleton className="h-64 w-full rounded" />
    </div>
  );

  // Low Stock Alert Skeleton Component
  const LowStockSkeleton = () => (
    <div className="kpi-card">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-10 h-10 rounded" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 px-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const mobilePeriodToggleClass = cn(
    "text-[11px] px-1.5 h-9 font-medium rounded-xl border-0",
    "bg-transparent text-gray-700",
    "hover:bg-gray-50",
    "data-[state=on]:bg-gray-100 data-[state=on]:text-gray-900",
  );

  return (
    <AppLayout title={t("dashboard")}>
      {/* Desktop: greeting + date/time (scrolls with page) */}
      <div className="hidden lg:flex mb-6 -mt-6 items-center justify-between gap-4 pl-4 lg:pl-5">
        <p className="min-w-0 text-lg leading-tight">
          <span className="text-muted-foreground">{t("hello")}</span>{" "}
          <span className="font-semibold text-foreground pl-1">
            {greetingName ? greetingName : t("greetingFallback")}
          </span>
        </p>
        <p className="shrink-0 flex items-center justify-end gap-3 text-sm leading-tight tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{greetingTime}</span>
          <span>{greetingDate}</span>
        </p>
      </div>

      {/* Mobile: KPI grid + period toggle */}
      <div className="lg:hidden mb-6 space-y-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <KPICardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="p-2">
            <ToggleGroup
              type="single"
              value={mobileRevenuePeriod}
              onValueChange={(v) => v && setMobileRevenuePeriod(v as RevenuePeriod)}
                className="grid grid-cols-4 gap-1.5 w-full"
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="today" className={mobilePeriodToggleClass}>
                {t("periodToday")}
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className={mobilePeriodToggleClass}>
                {t("periodWeek")}
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className={mobilePeriodToggleClass}>
                {t("periodMonth")}
              </ToggleGroupItem>
              <ToggleGroupItem value="year" className={mobilePeriodToggleClass}>
                {t("periodYear")}
              </ToggleGroupItem>
            </ToggleGroup>
              </div>

            <div className="grid grid-cols-2 gap-3">
              <KPICard
                title={t("servicesToday")}
                value={`${todayStats.totalItems}`}
                subtitle={t("servicesRecorded")}
                icon={ShoppingCart}
                tone="inverted"
                bgColor="bg-gradient-to-br from-sky-600 to-blue-700 border border-blue-600/30 shadow-sm"
              />
              <KPICard
                title={mobileRevenueProfitLabels.revenue}
                value={`${mobilePeriodStats.totalRevenue.toLocaleString()} rwf`}
                icon={DollarSign}
                tone="inverted"
                bgColor="bg-gradient-to-br from-indigo-600 to-violet-700 border border-indigo-600/30 shadow-sm"
              />
              <KPICard
                title={mobileRevenueProfitLabels.profit}
                value={`${mobilePeriodStats.totalProfit.toLocaleString()} rwf`}
                icon={TrendingUp}
                tone="inverted"
                bgColor={
                  mobilePeriodStats.totalProfit >= 0
                    ? "bg-gradient-to-br from-emerald-600 to-green-700 border border-emerald-600/30 shadow-sm"
                    : "bg-gradient-to-br from-rose-600 to-red-700 border border-red-600/30 shadow-sm"
                }
              />
              <KPICard
                title={t("activeServices")}
                value={`${serviceStats.totalServices}`}
                subtitle={t("servicesInSystem")}
                icon={Package}
                tone="inverted"
                bgColor="bg-gradient-to-br from-amber-500 to-orange-600 border border-orange-600/30 shadow-sm"
              />
              </div>
          </>
        )}
      </div>

      {/* Desktop: KPI Cards */}
      <div className="hidden lg:block mb-6">
        <div className="grid grid-cols-12 gap-4 items-start">
          {/* Left: KPIs + chart (shared background) */}
          <div className="col-span-9 p-4 space-y-4">
        {isLoading ? (
              <>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
                    <KPICardSkeleton key={i} hideIcon />
            ))}
          </div>
                <div className="pt-2">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </>
        ) : (
              <>
          <div className="grid grid-cols-3 gap-4">
            <KPICard
              title={t("servicesToday")}
              value={`${todayStats.totalItems}`}
              subtitle={t("servicesRecorded")}
              icon={ShoppingCart}
                    hideIcon
              trend={withComparisonLabel(
                formatKpiTrend(todayStats.totalItems, yesterdayStats.totalItems),
                t("vsYesterday"),
              )}
            />
            <KPICard
              title={t("todaysRevenue")}
              value={`${todayStats.totalRevenue.toLocaleString()} rwf`}
              icon={DollarSign}
                    hideIcon
              valueColor="kpi-value-revenue"
              trend={withComparisonLabel(
                formatKpiTrend(todayStats.totalRevenue, yesterdayStats.totalRevenue),
                t("vsYesterday"),
              )}
            />
            <KPICard
              title={t("todaysProfit")}
              value={`${todayStats.totalProfit.toLocaleString()} rwf`}
              icon={TrendingUp}
                    hideIcon
              valueColor={todayStats.totalProfit >= 0 ? "kpi-value-profit" : "kpi-value-loss"}
              trend={withComparisonLabel(
                formatKpiTrend(todayStats.totalProfit, yesterdayStats.totalProfit),
                t("vsYesterday"),
              )}
            />
          </div>

                <div className="pt-2">
                  <SalesTrendChart sales={sales} expenses={expenses} className="bg-transparent border-0 shadow-none p-0" />
                </div>
              </>
            )}
          </div>

          {/* Right: sales vs expenses speedometer */}
          <div className="col-span-3 overflow-hidden min-h-[420px]">
            {isLoading ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-48 w-full rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <SalesExpenseGauge
                salesCount={todayGaugeStats.salesCount}
                salesTotal={todayGaugeStats.totalRevenue}
                expensesTotal={todayGaugeStats.totalExpenses}
                className="h-full"
              />
            )}
            </div>
            </div>

        <div className="mt-8 pl-6 pr-4 lg:pl-8 lg:pr-5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <RecentSalesTable
              activities={recentActivity}
              loading={isLoading || salesLoading}
              maxRows={10}
              className="w-full min-w-0"
              onRecordSale={() => setSaleModalOpen(true)}
            />
          )}
        </div>
              </div>


      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions - Mobile Only */}
        <div className="lg:hidden">
          <div className="bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <h3 className="text-base font-bold text-gray-900">
              {t("quickActions")}
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              {t("quickActionsHint")}
            </p>
            
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Services */}
              <Button
                onClick={() => navigate("/products")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Package size={18} />
                <span className="text-xs font-medium">
                  {t("services")}
                </span>
              </Button>

              {/* Record Service */}
              <Button
                onClick={() => setSaleModalOpen(true)}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Plus size={18} />
                <span className="text-xs font-medium">
                  {t("recordService")}
                </span>
              </Button>

              {/* Barbers */}
              <Button
                onClick={() => navigate("/barbers")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <UserRound size={18} />
                <span className="text-xs font-medium">
                  {t("workers")}
                </span>
              </Button>

              {/* View Sales */}
              <Button
                onClick={() => navigate("/sales")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <ShoppingCart size={18} />
                <span className="text-xs font-medium">
                  {t("sales")}
                </span>
              </Button>

              {/* View Reports */}
              <Button
                onClick={() => navigate("/reports")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <FileText size={18} />
                <span className="text-xs font-medium">
                  {t("reports")}
                </span>
              </Button>

              <Button
                onClick={() => setExpenseModalOpen(true)}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Wallet size={18} />
                <span className="text-xs font-medium">
                  {t("recordExpense")}
                </span>
              </Button>

            </div>
          </div>
        </div>
        
        {/* Salon-first mode: inventory low-stock panel hidden */}
      </div>

      {/* Recent Sales Table */}
      <div className="mb-6 lg:hidden">
        <div className="bg-white overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900">
                {t("latestActivity")}
              </h3>
            </div>
          </div>
          
          {isLoading || salesLoading ? (
            <div className="p-4">
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full mb-2" />
            </div>
          ) : recentActivity.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-sm font-bold text-gray-700 py-4 px-6">
                        {t("typeLabel")}
                      </th>
                      <th className="text-left text-sm font-bold text-gray-700 py-4 px-6">
                        {t("details")}
                      </th>
                      <th className="text-left text-sm font-bold text-gray-700 py-4 px-6">
                        {t("amountRwf")}
                      </th>
                      <th className="text-left text-sm font-bold text-gray-700 py-4 px-6">
                        {t("date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {recentActivity.slice(0, 7).map((entry, index) => (
                      <tr 
                        key={entry.id || index}
                        className={cn(
                          index % 2 === 0 ? "bg-white" : "bg-white"
                        )}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                entry.type === "sale" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
                              )}
                            >
                              {entry.type === "sale" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                            </div>
                            <span className={cn("text-sm font-semibold", entry.type === "sale" ? "text-emerald-700" : "text-red-700")}>
                              {entry.type === "sale" ? t("activitySaleLabel") : t("activityExpenseLabel")}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">{entry.title}</div>
                          {entry.meta && (
                            <div className="text-xs text-gray-500 mt-1">{entry.meta}</div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm font-semibold text-gray-900">
                            {entry.type === "sale" ? "+" : "-"}{Number(entry.amount).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-700">
                            {formatDateWithTime(entry.date)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile activity list: sales + expenses (row-style, like native apps) */}
              <div className="lg:hidden">
                <div>
                  {recentActivity.slice(0, 7).map((entry, index) => {
                    const isSale = entry.type === "sale";
                    const label = isSale ? t("activitySaleLabel") : t("activityExpenseLabel");
                    return (
                      <button
                        key={entry.id || index}
                        type="button"
                        className="w-full text-left px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
                      >
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                          isSale ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
                        )}>
                          {isSale ? (
                            <ArrowUp size={18} />
                          ) : (
                            <ArrowDown size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{entry.title}</span>
                            </div>
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">
                            {label} {formatDateWithTime(entry.date)}
                            {entry.meta ? ` ${entry.meta}` : ""}
                          </div>
                        </div>
                        <div className="text-sm font-semibold tabular-nums whitespace-nowrap text-gray-900">
                          {isSale ? "+" : "-"}
                          {Number(entry.amount).toLocaleString()} rwf
                            </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart size={48} className="mb-4 opacity-50" />
                <p className="text-base font-medium">
                  {t("noRecentActivity")}
                </p>
                <p className="text-sm mt-1">
                  {t("activityEmptyHint")}
                </p>
              </div>
            </div>
          )}
        </div>
        {recentActivity.length > 7 && (
          <div className="pt-3 lg:hidden">
            <Button variant="outline" className="w-full" onClick={() => navigate("/sales")}>
              {t("viewMoreInSales")}
            </Button>
          </div>
        )}
      </div>

      <AddToHomeScreen />

      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[21rem] sm:max-w-[560px] max-h-[min(70vh,100dvh-2rem)] sm:max-h-[85vh] overflow-y-auto overflow-x-hidden p-0 bg-white border-gray-200 rounded-xl sm:rounded-2xl shadow-xl">
          <div className="p-3 sm:p-4 min-w-0 max-w-full overflow-x-hidden">
          <DialogHeader className="pb-2 sm:pb-0">
            <DialogTitle className="text-base sm:text-lg font-semibold">{t("recordExpense")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] sm:text-xs">{t("expenseTitle")}</Label>
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
                placeholder={t("expenseExamplePlaceholder")}
                className="h-9 sm:h-10 text-sm sm:text-base w-full min-w-0"
              />

              {(expenseSuggestions.presetTitles.length > 0 ||
                expenseSuggestions.recent.length > 0) && (
                <div className="pt-1.5 sm:pt-2 space-y-1.5 sm:space-y-2">
                  {expenseSuggestions.presetTitles.length > 0 && (
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-gray-600">
                        {t("presets")}
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
                        {t("recentExpenses")}
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
                      {t("savePreset")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] sm:text-xs">{t("amount")} (rwf)</Label>
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
                <Label className="text-[11px] sm:text-xs">{t("category")}</Label>
                <Input
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  placeholder={t("expenseCategoryPlaceholder")}
                  className="h-9 sm:h-10 text-sm sm:text-base w-full min-w-0"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-[11px] sm:text-xs">{t("date")}</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-9 sm:h-10 text-sm sm:text-base w-full min-w-0 max-w-full"
                />
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] sm:text-xs">{t("noteOptional")}</Label>
              <Textarea
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder={t("expenseNotePlaceholder")}
                rows={isMobile ? 2 : 3}
                className="text-sm sm:text-base min-h-[4.5rem] sm:min-h-0 w-full min-w-0 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setExpenseModalOpen(false)} className="h-9 sm:h-10 text-sm">
              {t("cancel")}
            </Button>
            <Button
              onClick={handleRecordExpense}
              className="h-9 sm:h-10 text-sm bg-primary text-white hover:bg-blue-700 hover:text-white"
              disabled={isSavingExpense}
            >
              {isSavingExpense ? t("saving") : t("saveExpense")}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Record Sale Modal */}
      <RecordSaleModal 
        open={saleModalOpen} 
        onOpenChange={setSaleModalOpen}
      />
    </AppLayout>
  );
};

export default Dashboard;
