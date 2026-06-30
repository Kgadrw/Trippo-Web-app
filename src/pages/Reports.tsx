import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playInfoBeep, initAudio } from "@/lib/sound";
import { useApi } from "@/hooks/useApi";
import { exportPlatformReportPdf } from "@/lib/reportPdf";
import * as XLSX from "xlsx";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { isApprovedForReporting } from "@/lib/approvalWorkflow";
import { periodToggleClass } from "@/lib/fieldStyles";
import {
  getReportDateRangeLabel,
  isInReportPeriod,
  parseDateMs,
  filterByReportPeriod,
} from "@/lib/reportPeriod";
import { ReportSectionTabs, type ReportSection } from "@/components/reports/ReportSectionTabs";
import { HelpTip } from "@/components/ui/help-tip";
import { PlatformOverviewSection, type PlatformStats } from "@/components/reports/PlatformOverviewSection";
import { FinanceReportsSection, type FinanceRow } from "@/components/reports/FinanceReportsSection";
import { InventoryReportsSection, type ProductRow } from "@/components/reports/InventoryReportsSection";
import { SalesRevenueReportsSection } from "@/components/reports/SalesRevenueReportsSection";

interface Product {
  id?: number;
  _id?: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
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
  saleType?: "product" | "service";
  workerName?: string;
  serviceName?: string;
}

interface Expense {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  date: string;
  category?: string;
}

interface Income {
  id?: number;
  _id?: string;
  title?: string;
  amount: number;
  date: string;
}

interface Payroll {
  id?: number;
  _id?: string;
  title?: string;
  amount: number;
  paymentDate: string;
  status?: string;
}

interface Bill {
  id?: number;
  _id?: string;
  title?: string;
  amount: number;
  dueDate: string;
  status?: string;
  paidAt?: string;
}

interface Tax {
  id?: number;
  _id?: string;
  title?: string;
  amount: number;
  dueDate: string;
  status?: string;
  paidAt?: string;
}

interface Invoice {
  id?: number;
  _id?: string;
  title?: string;
  amount: number;
  dueDate: string;
  status?: string;
  paidAt?: string;
}

interface BankDeposit {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  depositDate: string;
}

interface Loan {
  id?: number;
  _id?: string;
  title: string;
  lender?: string;
  remainingBalance: number;
  status?: string;
  nextDueDate?: string;
}

const Reports = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    items: products,
    isLoading: productsLoading,
  } = useApi<Product>({
    endpoint: "products",
    defaultValue: [],
    onError: (error: any) => {
      // Don't show errors for connection issues (offline mode)
      if (error?.response?.silent || error?.response?.connectionError) {
        console.log("Offline mode: using local data");
        return;
      }
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    },
  });
  const {
    items: sales,
    isLoading: salesLoading,
  } = useApi<Sale>({
    endpoint: "sales",
    defaultValue: [],
    onError: (error: any) => {
      // Don't show errors for connection issues (offline mode)
      if (error?.response?.silent || error?.response?.connectionError) {
        console.log("Offline mode: using local data");
        return;
      }
      console.error("Error loading sales:", error);
      toast({
        title: "Error",
        description: "Failed to load sales. Please try again.",
        variant: "destructive",
      });
    },
  });
  const { items: expenses } = useApi<Expense>({
    endpoint: "expenses",
    defaultValue: [],
  });
  const { items: incomes, isLoading: incomesLoading } = useApi<Income>({
    endpoint: "incomes",
    defaultValue: [],
  });
  const { items: payrolls, isLoading: payrollsLoading } = useApi<Payroll>({
    endpoint: "payrolls",
    defaultValue: [],
  });
  const { items: bills, isLoading: billsLoading } = useApi<Bill>({
    endpoint: "bills",
    defaultValue: [],
  });
  const { items: taxes, isLoading: taxesLoading } = useApi<Tax>({
    endpoint: "taxes",
    defaultValue: [],
  });
  const { items: invoices, isLoading: invoicesLoading } = useApi<Invoice>({
    endpoint: "invoices",
    defaultValue: [],
  });
  const { items: bankDeposits, isLoading: bankDepositsLoading } = useApi<BankDeposit>({
    endpoint: "bankDeposits",
    defaultValue: [],
  });
  const { items: loans, isLoading: loansLoading } = useApi<Loan>({
    endpoint: "loans",
    defaultValue: [],
  });

  const [reportType, setReportType] = useState("weekly");
  const [reportSection, setReportSection] = useState<ReportSection>("overview");
  const [barberPeriod, setBarberPeriod] = useState<"today" | "week" | "month" | "year">("today");

  const getSaleTimeMs = (sale: Sale) => parseDateMs((sale as any).timestamp || sale.date);

  const getExpenseTimeMs = (expense: Expense) => parseDateMs(expense.date);

  type PeriodKey =
    | { type: "daily"; key: string; label: string; sortKey: string }
    | { type: "weekly"; key: string; label: string; sortKey: string }
    | { type: "monthly"; key: string; label: string; sortKey: string };

  const getPeriodKey = (when: Date, type: string): PeriodKey | null => {
    const d = new Date(when);
    const ms = d.getTime();
    if (Number.isNaN(ms)) return null;

    if (type === "daily") {
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { type: "daily", key, label, sortKey: key };
    }

    if (type === "weekly") {
      // Week starts on Sunday to match existing chart logic
      const weekStart = new Date(d);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const key = weekStart.toISOString().slice(0, 10);
      const label = `${weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      return { type: "weekly", key, label, sortKey: key };
    }

    if (type === "monthly") {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { type: "monthly", key: monthKey, label: monthLabel, sortKey: monthKey };
    }

    if (type === "yearly") {
      const yearKey = String(d.getFullYear());
      return { type: "monthly", key: yearKey, label: yearKey, sortKey: yearKey };
    }

    return null;
  };

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const ms = getSaleTimeMs(sale);
      return ms !== null && isInReportPeriod(ms, reportType);
    });
  }, [sales, reportType]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (!isApprovedForReporting(expense)) return false;
      const ms = getExpenseTimeMs(expense);
      return ms !== null && isInReportPeriod(ms, reportType);
    });
  }, [expenses, reportType]);

  const filteredIncomes = useMemo(
    () => filterByReportPeriod(incomes, reportType, (item) => parseDateMs(item.date)),
    [incomes, reportType],
  );

  const filteredPayrolls = useMemo(
    () =>
      filterByReportPeriod(payrolls, reportType, (item) => parseDateMs(item.paymentDate)).filter(
        (item) => item.status !== "cancelled" && isApprovedForReporting(item),
      ),
    [payrolls, reportType],
  );

  const filteredBills = useMemo(
    () =>
      filterByReportPeriod(bills, reportType, (item) => parseDateMs(item.dueDate)).filter((item) =>
        isApprovedForReporting(item),
      ),
    [bills, reportType],
  );

  const filteredTaxes = useMemo(
    () => filterByReportPeriod(taxes, reportType, (item) => parseDateMs(item.dueDate)),
    [taxes, reportType],
  );

  const filteredInvoices = useMemo(
    () => filterByReportPeriod(invoices, reportType, (item) => parseDateMs(item.dueDate)),
    [invoices, reportType],
  );

  const filteredBankDeposits = useMemo(
    () => filterByReportPeriod(bankDeposits, reportType, (item) => parseDateMs(item.depositDate)),
    [bankDeposits, reportType],
  );

  const filteredLoans = useMemo(
    () =>
      filterByReportPeriod(loans, reportType, (item) =>
        parseDateMs(item.nextDueDate || ""),
      ).filter((item) => item.status !== "paid_off"),
    [loans, reportType],
  );

  const formatReportDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const financeIncomeRows = useMemo<FinanceRow[]>(
    () =>
      filteredIncomes.map((item, index) => ({
        id: String(item._id || item.id || index),
        title: item.title || t("income"),
        date: formatReportDate(item.date),
        amount: item.amount || 0,
      })),
    [filteredIncomes, t],
  );

  const financePayrollRows = useMemo<FinanceRow[]>(
    () =>
      filteredPayrolls.map((item, index) => ({
        id: String(item._id || item.id || index),
        title: item.title || t("payroll"),
        date: formatReportDate(item.paymentDate),
        amount: item.amount || 0,
        status: item.status,
      })),
    [filteredPayrolls, t],
  );

  const financeBillRows = useMemo<FinanceRow[]>(
    () =>
      filteredBills.map((item, index) => ({
        id: String(item._id || item.id || index),
        title: item.title || t("billTitle"),
        date: formatReportDate(item.dueDate),
        amount: item.amount || 0,
        status: item.status,
      })),
    [filteredBills, t],
  );

  const financeTaxRows = useMemo<FinanceRow[]>(
    () =>
      filteredTaxes.map((item, index) => ({
        id: String(item._id || item.id || index),
        title: item.title || t("taxTitle"),
        date: formatReportDate(item.dueDate),
        amount: item.amount || 0,
        status: item.status,
      })),
    [filteredTaxes, t],
  );

  const financeInvoiceRows = useMemo<FinanceRow[]>(
    () =>
      filteredInvoices.map((item, index) => ({
        id: String(item._id || item.id || index),
        title: item.title || t("invoiceTitle"),
        date: formatReportDate(item.dueDate),
        amount: item.amount || 0,
        status: item.status,
      })),
    [filteredInvoices, t],
  );

  const financeDepositRows = useMemo<FinanceRow[]>(
    () =>
      filteredBankDeposits.map((item, index) => ({
        id: String(item._id || item.id || index),
        title: item.title,
        date: formatReportDate(item.depositDate),
        amount: item.amount || 0,
      })),
    [filteredBankDeposits],
  );

  const financeLoanRows = useMemo<FinanceRow[]>(
    () =>
      filteredLoans.map((item, index) => ({
        id: String(item._id || item.id || index),
        title: item.title,
        date: formatReportDate(item.nextDueDate || ""),
        amount: item.remainingBalance || 0,
        status: item.status,
        extra: item.lender,
      })),
    [filteredLoans],
  );

  const inventoryProductRows = useMemo<ProductRow[]>(() => {
    return products.map((product, index) => {
      const minStock = (product as any).minStock ?? 5;
      const stock = product.stock || 0;
      const costPrice = product.costPrice || 0;
      return {
        id: String(product._id || product.id || index),
        name: product.name,
        category: product.category || "",
        stock,
        minStock,
        costPrice,
        sellingPrice: product.sellingPrice || 0,
        inventoryValue: costPrice * stock,
        isLowStock: stock > 0 && stock <= minStock,
      };
    });
  }, [products]);

  const platformStats = useMemo<PlatformStats>(() => {
    const salesRevenue = filteredSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const salesProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const expenseTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const incomeTotal = filteredIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const payrollTotal = filteredPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0);
    const billsPaid = filteredBills
      .filter((b) => b.status === "paid")
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    const billsOutstanding = filteredBills
      .filter((b) => b.status !== "paid")
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    const taxesPaid = filteredTaxes
      .filter((tx) => tx.status === "paid")
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const taxesOutstanding = filteredTaxes
      .filter((tx) => tx.status !== "paid")
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const invoicesPaid = filteredInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const invoicesOutstanding = filteredInvoices
      .filter((inv) => inv.status !== "paid")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const bankDepositsTotal = filteredBankDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
    const activeLoans = loans.filter((loan) => loan.status !== "paid_off").length;
    const loanBalance = loans
      .filter((loan) => loan.status !== "paid_off")
      .reduce((sum, loan) => sum + (loan.remainingBalance || 0), 0);
    const lowStockCount = inventoryProductRows.filter((p) => p.isLowStock || p.stock <= 0).length;
    const inventoryValue = inventoryProductRows.reduce((sum, p) => sum + p.inventoryValue, 0);

    return {
      salesRevenue,
      salesProfit,
      expenses: expenseTotal,
      netFromSales: salesProfit - expenseTotal,
      income: incomeTotal,
      payroll: payrollTotal,
      billsPaid,
      billsOutstanding,
      taxesPaid,
      taxesOutstanding,
      invoicesPaid,
      invoicesOutstanding,
      bankDeposits: bankDepositsTotal,
      loanBalance,
      activeLoans,
      productCount: products.length,
      lowStockCount,
      inventoryValue,
    };
  }, [
    filteredSales,
    filteredExpenses,
    filteredIncomes,
    filteredPayrolls,
    filteredBills,
    filteredTaxes,
    filteredInvoices,
    filteredBankDeposits,
    loans,
    inventoryProductRows,
    products.length,
  ]);

  const barberPeriodSales = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (barberPeriod === "week") {
      // Week starts on Sunday (matches other report logic)
      start.setDate(start.getDate() - start.getDay());
    } else if (barberPeriod === "month") {
      start.setDate(1);
    } else if (barberPeriod === "year") {
      start.setMonth(0, 1);
    }

    const startMs = start.getTime();
    return filteredSales.filter((s) => {
      if (!(s.saleType === "service" || s.workerName)) return false;
      const ms = getSaleTimeMs(s);
      return ms !== null && ms >= startMs;
    });
  }, [filteredSales, barberPeriod]);

  // Aggregate sales data by product
  const salesByProduct = useMemo(() => {
    const aggregated: Record<string, { product: string; quantity: number; revenue: number; profit: number; cost: number }> = {};
    
    filteredSales.forEach(sale => {
      if (!aggregated[sale.product]) {
        aggregated[sale.product] = {
          product: sale.product,
          quantity: 0,
          revenue: 0,
          profit: 0,
          cost: 0,
        };
      }
      aggregated[sale.product].quantity += sale.quantity;
      aggregated[sale.product].revenue += sale.revenue;
      aggregated[sale.product].profit += sale.profit;
      aggregated[sale.product].cost += sale.cost;
    });

    return Object.values(aggregated).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const totalRevenue = salesByProduct.reduce((sum, item) => sum + item.revenue, 0);
  const grossProfit = salesByProduct.reduce((sum, item) => sum + item.profit, 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalProfit = grossProfit - totalExpenses;
  const totalQuantity = salesByProduct.reduce((sum, item) => sum + item.quantity, 0);
  const bestSelling = salesByProduct.length > 0 
    ? salesByProduct.reduce((best, item) => item.quantity > best.quantity ? item : best)
    : { product: "N/A", quantity: 0 };

  const salesExpensesByPeriod = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        sortKey: string;
        salesRevenue: number;
        salesCost: number;
        salesProfit: number;
        expenses: number;
      }
    >();

    const type = reportType;

    for (const s of filteredSales) {
      const ms = getSaleTimeMs(s);
      if (ms === null) continue;
      const pk = getPeriodKey(new Date(ms), type);
      if (!pk) continue;
      const row = map.get(pk.key) || {
        key: pk.key,
        label: pk.label,
        sortKey: pk.sortKey,
        salesRevenue: 0,
        salesCost: 0,
        salesProfit: 0,
        expenses: 0,
      };
      row.salesRevenue += s.revenue || 0;
      row.salesCost += s.cost || 0;
      row.salesProfit += s.profit || 0;
      map.set(pk.key, row);
    }

    for (const e of filteredExpenses) {
      const d = new Date(e.date);
      const ms = d.getTime();
      if (Number.isNaN(ms)) continue;
      const pk = getPeriodKey(d, type);
      if (!pk) continue;
      const row = map.get(pk.key) || {
        key: pk.key,
        label: pk.label,
        sortKey: pk.sortKey,
        salesRevenue: 0,
        salesCost: 0,
        salesProfit: 0,
        expenses: 0,
      };
      row.expenses += e.amount || 0;
      map.set(pk.key, row);
    }

    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredSales, filteredExpenses, reportType]);

  const profitExpensesChartData = useMemo(() => {
    return salesExpensesByPeriod.map((row) => ({
      period: row.label,
      sortKey: row.sortKey,
      profit: row.salesProfit || 0,
      expenses: row.expenses || 0,
    }));
  }, [salesExpensesByPeriod]);

  const salesExpensesChartData = useMemo(
    () =>
      salesExpensesByPeriod.map((row) => ({
        label: row.label,
        sales: row.salesRevenue || 0,
        expenses: row.expenses || 0,
      })),
    [salesExpensesByPeriod],
  );

  const barberServiceBreakdown = useMemo(() => {
    const barberMap = new Map<
      string,
      {
        barber: string;
        servicesCount: number;
        revenue: number;
        serviceCounts: Map<string, number>;
      }
    >();

    for (const s of barberPeriodSales) {
      const barber = (s.workerName || "Unassigned").toString();
      const service =
        (s.serviceName || s.product || "Service").toString().trim() || "Service";
      const qty = s.quantity || 1;

      const row =
        barberMap.get(barber) ||
        {
          barber,
          servicesCount: 0,
          revenue: 0,
          serviceCounts: new Map<string, number>(),
        };

      row.servicesCount += qty;
      row.revenue += s.revenue || 0;
      row.serviceCounts.set(service, (row.serviceCounts.get(service) || 0) + qty);
      barberMap.set(barber, row);
    }

    const rows = Array.from(barberMap.values()).map((r) => {
      let topCount = 0;
      for (const c of r.serviceCounts.values()) topCount = Math.max(topCount, c);
      const topServices = Array.from(r.serviceCounts.entries())
        .filter(([, c]) => c === topCount)
        .map(([name]) => name)
        .slice(0, 3);
      return {
        barber: r.barber,
        services: r.servicesCount,
        revenue: r.revenue,
        topServices,
        topCount,
      };
    });

    rows.sort((a, b) => b.revenue - a.revenue);
    return rows;
  }, [barberPeriodSales]);

  const salesExpensesPeriodTotals = useMemo(
    () =>
      salesExpensesByPeriod.reduce(
        (acc, row) => {
          acc.revenue += row.salesRevenue || 0;
          acc.expenses += row.expenses || 0;
          acc.net += (row.salesProfit || 0) - (row.expenses || 0);
          return acc;
        },
        { revenue: 0, expenses: 0, net: 0 },
      ),
    [salesExpensesByPeriod],
  );

  const gaugeStats = useMemo(
    () => ({
      salesCount: filteredSales.length,
      salesTotal: salesExpensesPeriodTotals.revenue,
      expensesTotal: salesExpensesPeriodTotals.expenses,
    }),
    [filteredSales.length, salesExpensesPeriodTotals],
  );

  const revenueMix = useMemo(() => {
    let products = 0;
    let services = 0;
    filteredSales.forEach((s) => {
      if (s.saleType === "service" || s.workerName) {
        services += s.revenue || 0;
      } else {
        products += s.revenue || 0;
      }
    });
    return { products, services };
  }, [filteredSales]);

  const revenueTrendData = useMemo(
    () =>
      salesExpensesByPeriod.map((row) => ({
        label: row.label,
        revenue: row.salesRevenue || 0,
        profit: row.salesProfit || 0,
      })),
    [salesExpensesByPeriod],
  );

  const totalLabel = t("total");

  const exportToPDF = () => {
    exportPlatformReportPdf({
      reportType,
      dateRangeLabel: getReportDateRangeLabel(reportType),
      barberPeriod,
      totalLabel,
      totalRevenue,
      totalExpenses,
      totalProfit,
      totalQuantity,
      bestSelling,
      platformStats,
      salesExpensesByPeriod,
      salesExpensesPeriodTotals,
      salesByProduct,
      workerBreakdown: barberServiceBreakdown,
      financeIncomeRows,
      financePayrollRows,
      financeBillRows,
      financeTaxRows,
      financeInvoiceRows,
      inventoryProductRows,
    });
  };

  const handleExport = (format: string) => {
    initAudio();
    playInfoBeep();

    try {
      if (format === "pdf") {
        exportToPDF();
      } else if (format === "excel") {
        exportToExcel();
      } else {
        return;
      }

      toast({
        title: t("exportComplete"),
        description: `${t("export")} (${format.toUpperCase()})`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: t("exportFailed"),
        description: t("pleaseTryAgain"),
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["Report Summary"],
      [""],
      ["Report Type", reportType.charAt(0).toUpperCase() + reportType.slice(1)],
      ["Date Range", getReportDateRangeLabel(reportType)],
      ["Worker Period", barberPeriod],
      ["Generated", new Date().toLocaleString()],
      [""],
      ["Total Revenue", totalRevenue],
      ["Total Expenses", totalExpenses],
      ["Net Profit", totalProfit],
      ["Total Quantity Sold", totalQuantity],
      ["Best Service", bestSelling.product],
      ["Best Service Quantity", bestSelling.quantity],
      [""],
      ["Platform — Sales Revenue", platformStats.salesRevenue],
      ["Platform — Income", platformStats.income],
      ["Platform — Payroll", platformStats.payroll],
      ["Platform — Bills Paid", platformStats.billsPaid],
      ["Platform — Taxes Paid", platformStats.taxesPaid],
      ["Platform — Bank Deposits", platformStats.bankDeposits],
      ["Platform — Inventory Value", platformStats.inventoryValue],
      ["Platform — Low Stock Items", platformStats.lowStockCount],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    const salesExpensesHeaders = ["Period", "Revenue", "Expenses", "Net"];
    const salesExpensesData = salesExpensesByPeriod.map((row) => {
      const net = (row.salesProfit || 0) - (row.expenses || 0);
      return [row.label, row.salesRevenue, row.expenses, net];
    });
    if (salesExpensesData.length > 0) {
      salesExpensesData.push([
        totalLabel,
        salesExpensesPeriodTotals.revenue,
        salesExpensesPeriodTotals.expenses,
        salesExpensesPeriodTotals.net,
      ]);
    }
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([salesExpensesHeaders, ...salesExpensesData]),
      "Sales & Expenses",
    );

    const serviceHeaders = ["Service", "Quantity", "Revenue"];
    const serviceData = salesByProduct.map((item) => [item.product, item.quantity, item.revenue]);
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([serviceHeaders, ...serviceData]),
      "Services",
    );

    const workerHeaders = ["Worker", "Services", "Top Services", "Revenue"];
    const workerData = barberServiceBreakdown.map((row) => [
      row.barber,
      row.services,
      row.topServices.join(", "),
      row.revenue,
    ]);
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([workerHeaders, ...workerData]),
      "Workers",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Title", "Date", "Amount"],
        ...financeIncomeRows.map((row) => [row.title, row.date, row.amount]),
      ]),
      "Income",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Title", "Date", "Status", "Amount"],
        ...financePayrollRows.map((row) => [row.title, row.date, row.status || "", row.amount]),
      ]),
      "Payroll",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Title", "Due Date", "Status", "Amount"],
        ...financeBillRows.map((row) => [row.title, row.date, row.status || "", row.amount]),
      ]),
      "Bills",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Title", "Due Date", "Status", "Amount"],
        ...financeTaxRows.map((row) => [row.title, row.date, row.status || "", row.amount]),
      ]),
      "Taxes",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Title", "Due Date", "Status", "Amount"],
        ...financeInvoiceRows.map((row) => [row.title, row.date, row.status || "", row.amount]),
      ]),
      "Invoices",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Product", "Category", "Stock", "Cost", "Selling", "Inventory Value"],
        ...inventoryProductRows.map((row) => [
          row.name,
          row.category,
          row.stock,
          row.costPrice,
          row.sellingPrice,
          row.inventoryValue,
        ]),
      ]),
      "Inventory",
    );

    XLSX.writeFile(workbook, `Trippo_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };


  const ReportsSkeleton = () => (
    <>
      <div className="space-y-4 pb-4">
        <div className="p-5">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="p-4">
          <Skeleton className="mb-4 h-4 w-48" />
          <Skeleton className="h-80 w-full rounded" />
        </div>
      </div>
    </>
  );

  if (
    productsLoading ||
    salesLoading ||
    incomesLoading ||
    payrollsLoading ||
    billsLoading ||
    taxesLoading ||
    invoicesLoading ||
    bankDepositsLoading ||
    loansLoading
  ) {
    return <ReportsSkeleton />;
  }

  const reportTypeLabel =
    reportType === "daily"
      ? t("day")
      : reportType === "weekly"
        ? t("week")
        : reportType === "monthly"
          ? t("month")
          : t("periodYear");
  const reportPeriodLabel = getReportDateRangeLabel(reportType);

  return (
    <>
      <div className="flex flex-col min-h-0 w-full space-y-4 pb-4">
        {/* Filters */}
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-semibold text-gray-600">{t("reports")}</h2>
              <HelpTip text={t("helpReports")} />
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1 sm:flex-row sm:items-center">
                  <Label className="text-xs font-normal text-muted-foreground shrink-0">
                    {t("period")}
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={reportType}
                    onValueChange={(v) => v && setReportType(v)}
                    className="flex flex-wrap gap-1.5"
                    variant="default"
                    size="sm"
                  >
                    <ToggleGroupItem value="daily" className={periodToggleClass}>
                      {t("day")}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="weekly" className={periodToggleClass}>
                      {t("week")}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="monthly" className={periodToggleClass}>
                      {t("month")}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="yearly" className={periodToggleClass}>
                      {t("periodYear")}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("pdf")}>
                  <Download className="h-3.5 w-3.5" />
                  {t("exportPdf")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("excel")}>
                  <Download className="h-3.5 w-3.5" />
                  {t("exportExcel")}
                </Button>
              </div>
            </div>

            <ReportSectionTabs
              value={reportSection}
              onChange={setReportSection}
              labels={{
                overview: t("reportOverview"),
                sales: t("reportSalesSection"),
                finance: t("reportFinanceSection"),
                inventory: t("reportInventorySection"),
              }}
            />
          </div>
        </div>

        {reportSection === "overview" ? (
          <PlatformOverviewSection
            stats={platformStats}
            reportTypeLabel={reportTypeLabel}
            reportPeriodLabel={reportPeriodLabel}
          />
        ) : null}

        {reportSection === "finance" ? (
          <FinanceReportsSection
            incomes={financeIncomeRows}
            payrolls={financePayrollRows}
            bills={financeBillRows}
            taxes={financeTaxRows}
            invoices={financeInvoiceRows}
            bankDeposits={financeDepositRows}
            loans={financeLoanRows}
            reportPeriodLabel={reportPeriodLabel}
          />
        ) : null}

        {reportSection === "inventory" ? (
          <InventoryReportsSection products={inventoryProductRows} reportPeriodLabel={reportPeriodLabel} />
        ) : null}

        {reportSection === "sales" ? (
          <SalesRevenueReportsSection
            reportType={reportType}
            reportTypeLabel={reportTypeLabel}
            reportPeriodLabel={reportPeriodLabel}
            barberPeriod={barberPeriod}
            onBarberPeriodChange={setBarberPeriod}
            totalRevenue={totalRevenue}
            totalProfit={grossProfit}
            totalExpenses={totalExpenses}
            netProfit={totalProfit}
            totalQuantity={totalQuantity}
            transactionCount={filteredSales.length}
            bestSelling={bestSelling}
            revenueMix={revenueMix}
            gaugeStats={gaugeStats}
            salesExpensesChartData={salesExpensesChartData}
            salesExpensesByPeriod={salesExpensesByPeriod}
            salesExpensesPeriodTotals={salesExpensesPeriodTotals}
            profitExpensesChartData={profitExpensesChartData}
            salesByProduct={salesByProduct}
            workerBreakdown={barberServiceBreakdown}
            revenueTrendData={revenueTrendData}
          />
        ) : null}
      </div>
    </>
  );
};

export default Reports;
