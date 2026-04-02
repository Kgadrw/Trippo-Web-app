import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, DollarSign, TrendingUp, Package, Plus, Eye, EyeOff, X, Check, ChevronsUpDown, Search, Clock, FileText, Settings, UserRound, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "@/components/ui/sonner";
import { useApi } from "@/hooks/useApi";
import { playSaleBeep, playErrorBeep, playWarningBeep, initAudio } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { useOffline } from "@/hooks/useOffline";
import { formatDateWithTime } from "@/lib/utils";
import { formatStockDisplay } from "@/lib/stockFormatter";
import { MobileNumberPad } from "@/components/mobile/MobileNumberPad";
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

interface BulkSaleFormData {
  product: string;
  quantity: string;
  sellingPrice: string;
  paymentMethod: string;
  saleDate: string;
}

type RevenuePeriod = "today" | "week" | "month" | "year";
type GlobalSearchScope = "all" | "services" | "sales" | "expenses";

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

// Product Combobox Component
interface ProductComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  products: Product[];
  placeholder?: string;
  className?: string;
  onError?: (message: string) => void;
}

const ProductCombobox = ({ value, onValueChange, products, placeholder = "Search products by name, category, or type...", className, onError }: ProductComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    // Filter out products with stock <= 0 (sold out)
    const availableProducts = products.filter((product) => product.stock > 0);
    
    if (!searchQuery) return availableProducts;
    const query = searchQuery.toLowerCase();
    return availableProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        (product.productType && product.productType.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const selectedProduct = products.find((p) => {
    const id = (p as any)._id || p.id;
    return id.toString() === value;
  });

  // Immediately clear selection if selected product becomes out of stock
  // Watch products array directly for faster reactivity
  useEffect(() => {
    if (value && products.length > 0) {
      const currentProduct = products.find((p) => {
        const id = (p as any)._id || p.id;
        return id.toString() === value;
      });
      
      if (currentProduct && currentProduct.stock <= 0) {
        onValueChange("");
        setSearchQuery("");
        if (onError) {
          onError(`${currentProduct.name} is now out of stock and has been removed from selection.`);
        }
      }
    }
  }, [value, products, onValueChange, onError]);

  // Only show selected product if it has stock > 0
  const displayProduct = selectedProduct && selectedProduct.stock > 0 ? selectedProduct : null;

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              value={displayProduct ? displayProduct.name : searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!open) setOpen(true);
                if (e.target.value === "") {
                  onValueChange("");
                }
              }}
              onFocus={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              placeholder={placeholder}
              className={cn("pl-10 pr-10 cursor-text rounded-full", className)}
            />
            {displayProduct && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onValueChange("");
                  setSearchQuery("");
                  setOpen(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {!displayProduct && (
              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Prevent closing when clicking on the input
            const target = e.target as HTMLElement;
            if (target.closest('[role="combobox"]') || target.closest('.relative')) {
              e.preventDefault();
            }
          }}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>No products found.</CommandEmpty>
              <CommandGroup>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.category} ${product.productType || ""}`}
                      onSelect={() => {
                        // Double-check stock before allowing selection
                        if (product.stock > 0) {
                        onValueChange(product.id.toString());
                        setOpen(false);
                        setSearchQuery("");
                        } else {
                          if (onError) {
                            onError(`${product.name} is currently out of stock and cannot be sold.`);
                          }
                        }
                      }}
                      disabled={product.stock <= 0}
                      className={cn(
                        "flex items-center justify-between",
                        product.stock <= 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === product.id.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">{product.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{product.category}</span>
                            {product.productType && (
                              <>
                                <span>•</span>
                                <span>{product.productType}</span>
                              </>
                            )}
                            {product.isPackage && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Package size={10} />
                                  Box of {product.packageQuantity}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold ml-2">
                          rwf {product.sellingPrice.toLocaleString()}
                        </div>
                      </div>
                    </CommandItem>
                  ))
                ) : (
                  <CommandEmpty>No products found. Try a different search.</CommandEmpty>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const Dashboard = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const isRw = language === "rw";
  const isFr = language === "fr";
  const greetingName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return null;
    return n.split(" ")[0] || n;
  }, [user?.name]);
  const {
    items: products,
    isLoading: productsLoading,
    refresh: refreshProducts,
    update: updateProduct,
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
    add: addSale,
    bulkAdd: bulkAddSales,
    refresh: refreshSales,
    reloadFromIndexedDB: reloadSalesFromIndexedDB,
    setItems: setSales,
  } = useApi<Sale>({
    endpoint: "sales",
    defaultValue: [],
    onError: (error) => {
      // Only log, don't show toast here - let the skeleton handle the loading state
      console.error("Error with sales:", error);
    },
  });
  const { items: expenses, add: addExpense, refresh: refreshExpenses } = useApi<Expense>({
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
  const [showExpenseAmountPad, setShowExpenseAmountPad] = useState(false);

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

    const mostUsed = Array.from(freq.values())
      .sort((a, b) => b.count - a.count || b.lastMs - a.lastMs)
      .slice(0, 6);

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
        ...mostUsed.map((x) => normalize(x.title)),
        ...recent.map(normalize),
      ])
    )
      .map((key) => {
        const fromPreset = expensePresets.find((p) => normalize(p.title || "") === key);
        const fromMost = mostUsed.find((m) => normalize(m.title) === key);
        const fromRecent = recent.find((r) => normalize(r) === key);
        return (fromPreset?.title || fromMost?.title || fromRecent || "").trim();
      })
      .filter(Boolean);

    return {
      presetTitles,
      mostUsed,
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
      title: isRw ? "Byabitswe" : "Saved",
      description: isRw ? "Ikiguzi cyabitswe nk'icyihuse." : "Expense saved as a quick preset.",
    });
  };

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  }, []);

  // Refresh products and sales every time dashboard is opened (only once on mount)
  useEffect(() => {
    console.log('[Dashboard] Page opened, forcing refresh of products and sales data');
    // Force refresh products and sales to get real data from API (bypass cache)
    refreshProducts(true);
    refreshSales(true);
    refreshExpenses(true);
    window.dispatchEvent(new CustomEvent('page-opened'));
    // Note: useApi hook will handle the actual refresh via the event listener
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, not when refresh functions change
  
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
    const today = getTodayDate();
    
    // Filter sales for today - handle all date formats consistently
    const todaySales = sales.filter((sale) => {
      let saleDate: string;
      
      // Prefer timestamp if available (most accurate)
      if (sale.timestamp) {
        const dateObj = new Date(sale.timestamp);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        saleDate = `${year}-${month}-${day}`;
      } else if (typeof sale.date === 'string') {
        // Handle string dates (ISO format or date-only)
        if (sale.date.includes('T')) {
          saleDate = sale.date.split('T')[0];
        } else {
          saleDate = sale.date;
        }
      } else if (sale.date && typeof sale.date === 'object' && sale.date !== null && 'getFullYear' in sale.date) {
        // Handle Date-like objects (for backwards compatibility)
        const dateObj = sale.date as any;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        saleDate = `${year}-${month}-${day}`;
      } else {
        // Fallback: try to parse as date
        const dateObj = new Date(sale.date);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          saleDate = `${year}-${month}-${day}`;
        } else {
          return false; // Invalid date, exclude from today's sales
        }
      }
      
      return saleDate === today;
    });
    
    const todayExpenses = expenses.filter((expense) => {
      const d = new Date(expense.date);
      const expenseDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return expenseDate === today;
    });

    // Calculate totals from today's sales
    const totalItems = todaySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    const totalRevenue = todaySales.reduce((sum, sale) => sum + (sale.revenue || 0), 0);
    const grossProfit = todaySales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const totalExpenses = todayExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalProfit = grossProfit - totalExpenses;
    
    return { totalItems, totalRevenue, totalProfit };
  }, [sales, expenses]);

  const [mobileRevenuePeriod, setMobileRevenuePeriod] = useState<RevenuePeriod>("today");

  const mobilePeriodStats = useMemo(() => {
    const now = new Date();
    const start = getPeriodStart(mobileRevenuePeriod, now);
    const startMs = start.getTime();
    const endMs = now.getTime();

    const filtered = sales.filter((sale) => {
      const t = getSaleTimeMs(sale);
      if (t === null) return false;
      return t >= startMs && t <= endMs;
    });
    const filteredExpenses = expenses.filter((expense) => {
      const t = new Date(expense.date).getTime();
      if (isNaN(t)) return false;
      return t >= startMs && t <= endMs;
    });

    const totalRevenue = filtered.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const grossProfit = filtered.reduce((sum, s) => sum + (s.profit || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalProfit = grossProfit - totalExpenses;
    return { totalRevenue, totalProfit };
  }, [sales, expenses, mobileRevenuePeriod]);

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
    return { totalServices: products.length };
  }, [products]);

  // Get today's recent sales (last 10, sorted by date descending)
  const recentSales = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const startMs = startOfToday.getTime();
    const endMs = endOfToday.getTime();

    return [...sales]
      .filter((s) => {
        const t = getSaleTimeMs(s);
        if (t === null) return false;
        return t >= startMs && t <= endMs;
      })
      .sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date).getTime();
        const dateB = new Date(b.timestamp || b.date).getTime();
        return dateB - dateA; // Most recent first
      })
      .slice(0, 10);
  }, [sales]);

  const recentMobileActivity = useMemo(() => {
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
      title: sale.product,
      amount: sale.revenue || 0,
      date: sale.timestamp || sale.date,
      meta: sale.paymentMethod || "",
    }));

    const expenseEntries = expenses
      .filter((e) => {
        const t = new Date(e.date).getTime();
        if (isNaN(t)) return false;
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

  // Track if sale recording is in progress (for button disabling)
  const [isRecordingSale, setIsRecordingSale] = useState(false);

  // === Poll-until-found mechanism for Recent Sales ===
  // After recording a sale, poll the backend until the new sale appears in the list
  const [isWaitingForSale, setIsWaitingForSale] = useState(false);
  const pendingSaleRef = useRef<{ product: string; timestamp: string } | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stop polling and clear all timers
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    pendingSaleRef.current = null;
    setIsWaitingForSale(false);
  }, []);

  // Check if the pending sale has appeared in the sales list
  useEffect(() => {
    if (!pendingSaleRef.current || !isWaitingForSale) return;

    const pending = pendingSaleRef.current;
    const pendingTime = new Date(pending.timestamp).getTime();

    // Look for a sale matching product name with a timestamp within 60s of the recorded one
    const found = sales.some((sale) => {
      if (sale.product !== pending.product) return false;
      const saleTime = new Date(sale.timestamp || sale.date).getTime();
      return Math.abs(saleTime - pendingTime) < 60000; // within 60 seconds
    });

    if (found) {
      console.log('[Dashboard] New sale found in list - stopping poll');
      stopPolling();
    }
  }, [sales, isWaitingForSale, stopPolling]);

  // Start polling for the new sale
  const startPollingForSale = useCallback((saleDetail: { product: string; timestamp: string }) => {
    // Clear any existing poll
    stopPolling();

    pendingSaleRef.current = saleDetail;
    setIsWaitingForSale(true);

    // First immediate refresh
    refreshSales(true);

    // Poll every 1.5s
    pollIntervalRef.current = setInterval(() => {
      console.log('[Dashboard] Polling for new sale...');
      refreshSales(true);
    }, 1500);

    // Safety timeout: stop polling after 15s regardless
    pollTimeoutRef.current = setTimeout(() => {
      console.log('[Dashboard] Poll timeout reached - stopping');
      stopPolling();
    }, 15000);
  }, [refreshSales, stopPolling]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Listen for sale-recorded events and start polling
  useEffect(() => {
    const handleSaleRecorded = (event: CustomEvent) => {
      const sale = event.detail?.sale;
      if (sale) {
        console.log('[Dashboard] Sale recorded - start polling until it appears in list');
        startPollingForSale({
          product: sale.product,
          timestamp: sale.timestamp || sale.date || new Date().toISOString(),
        });
      } else {
        // No sale detail, just do a one-time refresh
        refreshSales(true);
      }
    };

    const handleSalesShouldRefresh = () => {
      // If already polling, let it continue; otherwise just refresh
      if (!isWaitingForSale) {
        refreshSales(true);
      }
    };

    window.addEventListener('sale-recorded', handleSaleRecorded as EventListener);
    window.addEventListener('sales-should-refresh', handleSalesShouldRefresh as EventListener);

    return () => {
      window.removeEventListener('sale-recorded', handleSaleRecorded as EventListener);
      window.removeEventListener('sales-should-refresh', handleSalesShouldRefresh as EventListener);
    };
  }, [refreshSales, startPollingForSale, isWaitingForSale]);

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

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDate, setSaleDate] = useState(getTodayDate());
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [packageSaleMode, setPackageSaleMode] = useState<"quantity" | "wholePackage">("quantity"); // For package products: sell by quantity or whole package
  const [bulkSales, setBulkSales] = useState<BulkSaleFormData[]>([
    { product: "", quantity: "1", sellingPrice: "", paymentMethod: "cash", saleDate: getTodayDate() }
  ]);

  // Sync sale date with today's date on component mount
  useEffect(() => {
    setSaleDate(getTodayDate());
    setPaymentMethod("cash"); // Set default payment method to cash
  }, []);

  // Clear selected product if it becomes out of stock
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find((p) => {
        const id = (p as any)._id || p.id;
        return id.toString() === selectedProduct;
      });
      if (product && product.stock <= 0) {
        setSelectedProduct("");
        setSellingPrice("");
        playWarningBeep();
        toast({
          title: isRw ? "Icuruzwa rirangiye muri stoki" : "Product Out of Stock",
          description: isRw
            ? `${product.name} ntikiboneka muri stoki kandi cyakuweho mu mahitamo.`
            : `${product.name} is now out of stock and has been removed from selection.`,
          variant: "destructive",
        });
      }
    }
  }, [products, selectedProduct]);

  // Calculate selling price based on product priceType and sale mode
  const calculateSellingPrice = (product: Product, saleMode: "quantity" | "wholePackage"): number => {
    if (!product.isPackage || !product.packageQuantity) {
      // Regular product - use selling price as is
      return product.sellingPrice;
    }
    
    if (product.priceType === "perQuantity") {
      // Price is per individual item
      if (saleMode === "wholePackage") {
        // Selling whole package: multiply by package quantity
        return product.sellingPrice * product.packageQuantity;
      } else {
        // Selling by quantity: use price as is (per item)
        return product.sellingPrice;
      }
    } else {
      // priceType === "perPackage" - Price is for whole package
      if (saleMode === "wholePackage") {
        // Selling whole package: use price as is
        return product.sellingPrice;
      } else {
        // Selling by quantity: divide by package quantity to get price per item
        return product.sellingPrice / product.packageQuantity;
      }
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => {
      const id = (p as any)._id || p.id;
      return id.toString() === productId;
    });
    
    // Prevent selecting products with stock <= 0
    if (product && product.stock <= 0) {
      playErrorBeep();
      toast({
        title: isRw ? "Icuruzwa rirangiye muri stoki" : "Product Out of Stock",
        description: isRw
          ? `${product.name} ntikiboneka muri stoki kandi ntigishobora kugurishwa.`
          : `${product.name} is currently out of stock and cannot be sold.`,
        variant: "destructive",
      });
      setSelectedProduct("");
      setSellingPrice("");
      return;
    }
    
    setSelectedProduct(productId);
    if (product) {
      // Reset package sale mode when product changes
      if (product.isPackage) {
        setPackageSaleMode("quantity");
      }
      // Calculate and set selling price based on product priceType and sale mode
      const calculatedPrice = calculateSellingPrice(product, product.isPackage ? "quantity" : "quantity");
      setSellingPrice(calculatedPrice.toString());
    } else {
      setSellingPrice("");
    }
  };

  // Update selling price when sale mode changes for package products
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find((p) => {
        const id = (p as any)._id || p.id;
        return id.toString() === selectedProduct;
      });
      
      if (product && product.isPackage && product.packageQuantity) {
        const calculatedPrice = calculateSellingPrice(product, packageSaleMode);
        setSellingPrice(calculatedPrice.toString());
      }
    }
  }, [packageSaleMode, selectedProduct, products]);

  const addBulkRow = () => {
    setBulkSales([...bulkSales, { product: "", quantity: "1", sellingPrice: "", paymentMethod: "cash", saleDate: getTodayDate() }]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkSales.length > 1) {
      setBulkSales(bulkSales.filter((_, i) => i !== index));
    }
  };

  const updateBulkSale = (index: number, field: keyof BulkSaleFormData, value: string) => {
    const updated = [...bulkSales];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill selling price when product is selected
    if (field === "product" && value) {
      const product = products.find((p) => {
        const id = (p as any)._id || p.id;
        return id.toString() === value;
      });
      if (product) {
        updated[index].sellingPrice = product.sellingPrice.toString();
      }
    }
    
    setBulkSales(updated);
  };


  const handleRecordSale = async () => {
    // Prevent duplicate submissions
    if (isRecordingSale) {
      return;
    }

    // Initialize audio immediately on button click (user interaction ensures audio works)
    initAudio();

    // Set loading state
    setIsRecordingSale(true);

    try {
    if (isBulkMode) {
      // Bulk add mode
      // Validate all bulk sales before creating them
      const invalidSales: string[] = [];
      const salesToCreate = bulkSales
        .filter((sale) => sale.product.trim() !== "" && sale.quantity && sale.sellingPrice)
        .map((sale) => {
          const product = products.find((p) => {
            const id = (p as any)._id || p.id;
            return id.toString() === sale.product;
          });
          if (!product) return null;
          
          const qty = parseInt(sale.quantity) || 1;
          
          // Validate quantity is valid
          if (isNaN(qty) || qty <= 0) {
            invalidSales.push(`${product.name}: Invalid quantity`);
            return null;
          }
          
          // Check if quantity exceeds stock (strict check)
          if (qty > product.stock || product.stock <= 0) {
            invalidSales.push(`${product.name}: Only ${product.stock} ${product.stock === 1 ? 'item' : 'items'} available`);
            return null;
          }
          
          const price = parseFloat(sale.sellingPrice) || 0;
          const revenue = qty * price;
          const cost = qty * product.costPrice;
          const profit = revenue - cost;

          // Combine selected date with current time to preserve hours/minutes/seconds
          const now = new Date();
          let saleDateTime: Date;
          if (sale.saleDate) {
            // Parse the date string and combine with current time
            const selectedDate = new Date(sale.saleDate + 'T00:00:00');
            saleDateTime = new Date(selectedDate);
            saleDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
          } else {
            saleDateTime = now;
          }

          return {
            product: product.name,
            productId: product._id || product.id,
            quantity: qty,
            revenue,
            cost,
            profit,
            date: saleDateTime.toISOString(),
            timestamp: new Date().toISOString(), // Record exact time when sale was recorded
            paymentMethod: sale.paymentMethod || "cash",
          };
        })
        .filter((sale): sale is any => sale !== null);
      
        // Show error if any sales have insufficient stock
        if (invalidSales.length > 0) {
          playErrorBeep();
          toast({
            title: isRw ? "Stoki ntihagije" : "Insufficient Stock",
            description: isRw
              ? `Ntibishoboka kwandika ubu bucuruzi: ${invalidSales.join(', ')}. Ntushobora kugurisha birenze ibiri muri stoki.`
              : `Cannot record sales for: ${invalidSales.join(', ')}. You cannot sell more than available quantity.`,
            variant: "destructive",
          });
          setIsRecordingSale(false);
          return;
        }

      if (salesToCreate.length > 0) {
          await bulkAddSales(salesToCreate as any);
        
        // Reduce product stock locally immediately for instant UI feedback
        // Group sales by productId to handle multiple sales of the same product
        const stockReductions = new Map<string, number>();
        salesToCreate.forEach((sale: any) => {
          const productId = sale.productId?.toString();
          if (productId) {
            const currentReduction = stockReductions.get(productId) || 0;
            stockReductions.set(productId, currentReduction + sale.quantity);
          }
        });
        
        // Update each product's stock immediately for instant UI feedback
        for (const [productId, totalQuantity] of stockReductions.entries()) {
          try {
            const product = products.find((p) => {
              const id = (p as any)._id || p.id;
              return id.toString() === productId;
            });
            if (product) {
              // Ensure we have the correct ID format
              const productId = (product as any)._id || product.id;
              const updatedProduct = {
                ...product,
                _id: productId,
                id: productId,
                stock: Math.max(0, product.stock - totalQuantity),
              };
              // Update via useApi hook (this updates IndexedDB and UI state immediately)
              await updateProduct(updatedProduct);
              console.log(`[Dashboard] Stock updated: ${product.name} - ${product.stock} -> ${updatedProduct.stock}`);
            }
          } catch (updateError) {
            // If update fails, log but continue - backend will handle stock reduction
            console.warn(`Failed to update product stock via API for product ${productId}:`, updateError);
          }
        }
        
        // Stock is automatically updated via updateProduct above
        // Dispatch events to automatically notify all components
        for (const [productId, totalQuantity] of stockReductions.entries()) {
          const product = products.find((p) => {
            const id = (p as any)._id || p.id;
            return id.toString() === productId;
          });
          if (product) {
            window.dispatchEvent(new CustomEvent('product-stock-updated', { 
              detail: { productId, newStock: Math.max(0, product.stock - totalQuantity) } 
            }));
          }
        }
        window.dispatchEvent(new CustomEvent('products-should-refresh'));
        window.dispatchEvent(new CustomEvent('sales-should-refresh'));
        // Dispatch sale-recorded event for each sale to trigger immediate refresh
        salesToCreate.forEach((sale) => {
          window.dispatchEvent(new CustomEvent('sale-recorded', { 
            detail: { sale, bulk: true } 
          }));
        });

          playSaleBeep();

          // Extra desktop popup using Sonner
          sonnerToast.success(isRw ? "Ubucuruzi bwanditswe" : "Sales Recorded", {
            description: isRw
              ? `Handitswe neza ubucuruzi ${salesToCreate.length}.`
              : `Successfully recorded ${salesToCreate.length} sale(s).`,
          });

          // Reset bulk form
          setBulkSales([{ product: "", quantity: "1", sellingPrice: "", paymentMethod: "cash", saleDate: getTodayDate() }]);
          setIsBulkMode(false);
      } else {
        playWarningBeep();
        toast({
          title: isRw ? "Nta bucuruzi bwanditswe" : "No Sales Recorded",
          description: isRw
            ? "Andika nibura ubucuruzi bumwe bwuzuye."
            : "Please fill in at least one complete sale entry.",
          variant: "destructive",
        });
      }
    } else {
      // Single sale mode
      if (!selectedProduct || !quantity || !sellingPrice || !paymentMethod) {
        // Play error beep immediately (we're in user interaction context)
        playErrorBeep();
        toast({
          title: isRw ? "Amakuru abura" : "Missing Information",
          description: isRw
            ? "Uzuza ibisabwa byose."
            : "Please fill in all required fields.",
          variant: "destructive",
        });
        setIsRecordingSale(false);
        return;
      }

      const product = products.find((p) => {
        const id = (p as any)._id || p.id;
        return id.toString() === selectedProduct;
      });
      if (!product) {
        setIsRecordingSale(false);
        return;
      }

      // Handle package products
      let qty: number;
      let stockReduction: number;
      let revenue: number;
      let cost: number;
      
      if (product.isPackage && product.packageQuantity) {
        if (packageSaleMode === "wholePackage") {
          // Selling whole package
          qty = product.packageQuantity; // Record the actual quantity sold
          stockReduction = product.packageQuantity;
          
          // Calculate revenue based on price type
          if (product.priceType === "perPackage") {
            // Price is for whole package
            revenue = parseFloat(sellingPrice);
          } else {
            // Price is per quantity, so multiply by package quantity
            revenue = parseFloat(sellingPrice) * product.packageQuantity;
          }
          
          // Calculate cost based on cost price type
          if (product.costPriceType === "perPackage") {
            // Cost is for whole package
            cost = product.costPrice;
          } else {
            // Cost is per quantity, so multiply by package quantity
            cost = product.costPrice * product.packageQuantity;
          }
        } else {
          // Selling by quantity
          qty = parseInt(quantity);
          
          // Validate quantity is valid
          if (isNaN(qty) || qty <= 0) {
            playErrorBeep();
            toast({
              title: isRw ? "Umubare utari wo" : "Invalid Quantity",
              description: isRw
                ? "Andika umubare nyawo urenze 0."
                : "Please enter a valid quantity greater than 0.",
              variant: "destructive",
            });
            setIsRecordingSale(false);
            return;
          }
          
          // Validate quantity doesn't exceed available stock
          if (qty > product.stock || product.stock <= 0) {
            playErrorBeep();
            toast({
              title: isRw ? "Stoki ntihagije" : "Insufficient Stock",
              description: isRw
                ? `Hari gusa ${product.stock} ${product.stock === 1 ? 'ikintu' : 'ibintu'} muri stoki.`
                : `Only ${product.stock} ${product.stock === 1 ? 'item' : 'items'} available in stock.`,
              variant: "destructive",
            });
            setIsRecordingSale(false);
            return;
          }
          
          stockReduction = qty;
          
          // Calculate revenue based on price type
          if (product.priceType === "perPackage") {
            // Price is for whole package, calculate per item
            const pricePerItem = parseFloat(sellingPrice) / product.packageQuantity;
            revenue = pricePerItem * qty;
          } else {
            // Price is per quantity
            revenue = parseFloat(sellingPrice) * qty;
          }
          
          // Calculate cost based on cost price type
          if (product.costPriceType === "perPackage") {
            // Cost is for whole package, calculate per item
            const costPerItem = product.costPrice / product.packageQuantity;
            cost = costPerItem * qty;
          } else {
            // Cost is per quantity
            cost = product.costPrice * qty;
          }
        }
      } else {
        // Regular product (not a package)
        qty = parseInt(quantity);
        
        // Validate quantity is valid
        if (isNaN(qty) || qty <= 0) {
          playErrorBeep();
          toast({
            title: isRw ? "Umubare utari wo" : "Invalid Quantity",
            description: isRw
              ? "Andika umubare nyawo urenze 0."
              : "Please enter a valid quantity greater than 0.",
            variant: "destructive",
          });
          setIsRecordingSale(false);
          return;
        }
        
        // Validate quantity doesn't exceed available stock
        if (qty > product.stock || product.stock <= 0) {
          playErrorBeep();
          toast({
            title: isRw ? "Stoki ntihagije" : "Insufficient Stock",
            description: isRw
              ? `Hari gusa ${product.stock} ${product.stock === 1 ? 'ikintu' : 'ibintu'} muri stoki.`
              : `Only ${product.stock} ${product.stock === 1 ? 'item' : 'items'} available in stock.`,
            variant: "destructive",
          });
          setIsRecordingSale(false);
          return;
        }
        
        stockReduction = qty;
        const price = parseFloat(sellingPrice);
        revenue = qty * price;
        cost = qty * product.costPrice;
      }
      
      const profit = revenue - cost;

      // Combine selected date with current time to preserve hours/minutes/seconds
      const now = new Date();
      let saleDateTime: Date;
      if (saleDate) {
        // Parse the date string and combine with current time
        const selectedDate = new Date(saleDate + 'T00:00:00');
        saleDateTime = new Date(selectedDate);
        saleDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      } else {
        saleDateTime = now;
      }

      const newSale = {
        product: product.name,
        productId: product._id || product.id,
        quantity: qty,
        revenue,
        cost,
        profit,
        date: saleDateTime.toISOString(),
        timestamp: new Date().toISOString(), // Record exact time when sale was recorded
        paymentMethod: paymentMethod,
      };

        await addSale(newSale as any);
        
        // Show success immediately (addSale already updates UI)
        playSaleBeep();
        sonnerToast.success(isRw ? "Ubucuruzi bwanditswe" : "Sale Recorded", {
          description: isRw
            ? `Handitswe neza: ${qty}x ${product.name}`
            : `Successfully recorded sale of ${qty}x ${product.name}`,
        });

        // Reset form immediately for better UX
        setSelectedProduct("");
        setQuantity("1");
        setSellingPrice("");
        setPaymentMethod("cash");
        setSaleDate(getTodayDate());

        // Dispatch events immediately (non-blocking)
        const productId = (product as any)._id || product.id;
        window.dispatchEvent(new CustomEvent('sale-recorded', { 
          detail: { sale: newSale, productId, stockReduction } 
        }));
        window.dispatchEvent(new CustomEvent('sales-should-refresh'));
        window.dispatchEvent(new CustomEvent('products-should-refresh'));
        
        // Run non-blocking operations in parallel (don't wait for them)
        // These happen in the background and don't slow down the user experience
        Promise.all([
          // Update product stock (non-blocking)
          (async () => {
            try {
              const updatedProduct = {
                ...product,
                _id: productId,
                id: productId,
                stock: Math.max(0, product.stock - stockReduction),
              };
              await updateProduct(updatedProduct);
              console.log(`[Dashboard] Stock updated: ${product.name} - ${product.stock} -> ${updatedProduct.stock}`);
              window.dispatchEvent(new CustomEvent('product-stock-updated', { 
                detail: { productId, newStock: updatedProduct.stock } 
              }));
            } catch (updateError) {
              console.warn("Failed to update product stock via API:", updateError);
            }
          })()
        ]).catch(err => {
          // Silently handle any errors in background operations
          console.log('[Dashboard] Background operation error:', err);
        });
      }
      } catch (error: any) {
        // Get product info for error messages
        const errorProduct = products.find((p) => {
          const id = (p as any)._id || p.id;
          return id.toString() === selectedProduct;
        });
        const errorQty = parseInt(quantity) || 0;
        
        // Check if it's an offline/connection error
        if (error?.response?.silent || error?.response?.connectionError || !navigator.onLine) {
          // Offline mode - treat as success
          playSaleBeep();
          sonnerToast.success(isRw ? "Ubucuruzi bwanditswe (nta interineti)" : "Sale Recorded (Offline Mode)", {
            description: isRw
              ? (errorProduct
                ? `Handitswe neza: ${errorQty}x ${errorProduct.name}. Bizahuzwa interineti igarutse.`
                : "Ubucuruzi bwanditswe nta interineti. Bizahuzwa interineti igarutse.")
              : (errorProduct
                ? `Successfully recorded sale of ${errorQty}x ${errorProduct.name}. Changes will sync when you're back online.`
                : "Sale recorded offline. Changes will sync when you're back online."),
          });
          toast({
            title: isRw ? "Ubucuruzi bwanditswe (nta interineti)" : "Sale Recorded (Offline Mode)",
            description: isRw
              ? (errorProduct
                ? `Handitswe neza: ${errorQty}x ${errorProduct.name}. Bizahuzwa interineti igarutse.`
                : "Ubucuruzi bwanditswe nta interineti. Bizahuzwa interineti igarutse.")
              : (errorProduct
                ? `Successfully recorded sale of ${errorQty}x ${errorProduct.name}. Changes will sync when you're back online.`
                : "Sale recorded offline. Changes will sync when you're back online."),
          });
          
          // Reset form
          setSelectedProduct("");
          setQuantity("1");
          setSellingPrice("");
          setPaymentMethod("cash");
          setSaleDate(getTodayDate());
        } else {
          // Real error - show error message with details
          playErrorBeep();
          console.error("Error recording sale:", error);
          toast({
            title: isRw ? "Kwandika byanze" : "Record Failed",
            description: error?.message || error?.response?.error || (isRw
              ? "Kwandika ubucuruzi byanze. Reba interneti wongere ugerageze."
              : "Failed to record sale. Please check your connection and try again."),
            variant: "destructive",
          });
        }
    } finally {
      // Always reset loading state
      setIsRecordingSale(false);
    }
  };

  const handleRecordExpense = async () => {
    if (isSavingExpense) return;

    const amount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amount) || amount <= 0) {
      toast({
        title: isRw ? "Amakuru abura" : "Missing Information",
        description: isRw
          ? "Andika izina ry'ikiguzi n'amafaranga nyayo."
          : "Please provide expense name and valid amount.",
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
      sonnerToast.success(isRw ? "Ikiguzi cyanditswe" : "Expense Recorded", {
        description: isRw ? "Ikiguzi cyabitswe neza." : "Expense saved successfully.",
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
        title: isRw ? "Kwandika byanze" : "Save Failed",
        description: error?.message || (isRw ? "Kwandika ikiguzi byanze." : "Failed to save expense."),
        variant: "destructive",
      });
    } finally {
      setIsSavingExpense(false);
    }
  };

  const isLoading = productsLoading || salesLoading;

  // Global search (Dashboard)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchScope, setGlobalSearchScope] = useState<GlobalSearchScope>("all");

  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return { services: [] as Product[], sales: [] as Sale[], expenses: [] as Expense[] };

    const services =
      globalSearchScope === "all" || globalSearchScope === "services"
        ? products.filter((p) => (p?.name || "").toLowerCase().includes(q)).slice(0, 6)
        : [];

    const salesRes =
      globalSearchScope === "all" || globalSearchScope === "sales"
        ? sales
            .filter((s) => {
              const product = String(s.product || "").toLowerCase();
              const method = String(s.paymentMethod || "").toLowerCase();
              return product.includes(q) || method.includes(q);
            })
            .slice(0, 6)
        : [];

    const expensesRes =
      globalSearchScope === "all" || globalSearchScope === "expenses"
        ? expenses
            .filter((e) => {
              const title = String(e.title || "").toLowerCase();
              const cat = String(e.category || "").toLowerCase();
              const note = String(e.note || "").toLowerCase();
              return title.includes(q) || cat.includes(q) || note.includes(q);
            })
            .slice(0, 6)
        : [];

    return { services, sales: salesRes, expenses: expensesRes };
  }, [globalSearchQuery, globalSearchScope, products, sales, expenses]);

  // KPI Card Skeleton Component
  const KPICardSkeleton = () => (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="ml-4 shrink-0">
          <Skeleton className="w-12 h-12 rounded" />
        </div>
      </div>
    </div>
  );

  // Chart Skeleton Component
  const ChartSkeleton = () => (
    <div className="lg:bg-white bg-white/80 backdrop-blur-md lg:backdrop-blur-none border border-gray-200 rounded-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="h-6 w-48" />
        </div>
      <Skeleton className="h-64 w-full rounded" />
    </div>
  );

  // Low Stock Alert Skeleton Component
  const LowStockSkeleton = () => (
    <div className="kpi-card border border-transparent lg:bg-white bg-white/80 backdrop-blur-md lg:backdrop-blur-none">
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
    "text-[11px] px-1.5 h-9 font-medium rounded-xl",
    "border-transparent bg-white/10 text-white/90",
    "hover:bg-white/15 hover:text-white",
    "data-[state=on]:bg-white data-[state=on]:text-blue-700 data-[state=on]:border-white",
  );

  return (
    <AppLayout title={t("dashboard")}>
      {/* Desktop: greeting + global search (sticky at top) */}
      <div className="hidden lg:block sticky top-0 z-40 -mx-6 px-6 pt-0 pb-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm mb-2">
          <span className="text-muted-foreground">{isRw ? "Muraho" : isFr ? "Bonjour" : "Hello"}</span>
          <span className="font-semibold text-foreground">
            {greetingName ? `${greetingName}` : isRw ? "Inshuti" : isFr ? "Utilisateur" : "User"}
          </span>
        </div>

        <Popover open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full h-11 px-3 rounded-xl border border-border bg-white flex items-center gap-2 text-left",
                "hover:bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              )}
              onClick={() => setGlobalSearchOpen(true)}
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className={cn("text-sm", globalSearchQuery ? "text-foreground" : "text-muted-foreground")}>
                {language === "rw"
                  ? "Shakisha..."
                  : language === "fr"
                  ? "Rechercher..."
                  : "Search anything..."}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-24px)] sm:w-[520px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={language === "rw" ? "Andika..." : language === "fr" ? "Tapez..." : "Type to search..."}
                value={globalSearchQuery}
                onValueChange={(v) => setGlobalSearchQuery(v)}
              />
              <div className="px-2 pb-2">
                <ToggleGroup
                  type="single"
                  value={globalSearchScope}
                  onValueChange={(v) => v && setGlobalSearchScope(v as GlobalSearchScope)}
                  className="grid grid-cols-4 gap-1.5 w-full"
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="all" className="h-8 text-[11px]">
                    {language === "rw" ? "Byose" : language === "fr" ? "Tout" : "All"}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="services" className="h-8 text-[11px]">
                    {language === "rw" ? "Serivisi" : language === "fr" ? "Services" : "Services"}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="sales" className="h-8 text-[11px]">
                    {t("sales")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="expenses" className="h-8 text-[11px]">
                    {language === "rw" ? "Ibikiguzi" : language === "fr" ? "Dépenses" : "Expenses"}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <CommandList>
                <CommandEmpty>
                  {language === "rw" ? "Nta bisubizo." : language === "fr" ? "Aucun résultat." : "No results."}
                </CommandEmpty>

                {globalSearchResults.services.length > 0 && (
                  <CommandGroup heading={language === "rw" ? "Serivisi" : language === "fr" ? "Services" : "Services"}>
                    {globalSearchResults.services.map((p) => (
                      <CommandItem
                        key={(p as any)._id || p.id || p.name}
                        value={p.name}
                        onSelect={() => {
                          setGlobalSearchOpen(false);
                          navigate(`/products?q=${encodeURIComponent(p.name)}`);
                        }}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        <span className="truncate">{p.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {globalSearchResults.sales.length > 0 && (
                  <CommandGroup heading={t("sales")}>
                    {globalSearchResults.sales.map((s, idx) => (
                      <CommandItem
                        key={(s as any)._id || s.id || `${s.product}-${idx}`}
                        value={String(s.product)}
                        onSelect={() => {
                          setGlobalSearchOpen(false);
                          navigate(`/sales?q=${encodeURIComponent(String(s.product || ""))}`);
                        }}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        <span className="truncate">{String(s.product || "Sale")}</span>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {Number(s.revenue || 0).toLocaleString()} rwf
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {globalSearchResults.expenses.length > 0 && (
                  <CommandGroup heading={language === "rw" ? "Ibikiguzi" : language === "fr" ? "Dépenses" : "Expenses"}>
                    {globalSearchResults.expenses.map((e, idx) => (
                      <CommandItem
                        key={(e as any)._id || e.id || `${e.title}-${idx}`}
                        value={String(e.title)}
                        onSelect={() => {
                          setGlobalSearchOpen(false);
                          navigate(`/expenses?q=${encodeURIComponent(String(e.title || ""))}`);
                        }}
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        <span className="truncate">{String(e.title || "Expense")}</span>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {Number(e.amount || 0).toLocaleString()} rwf
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                <div className="p-2 border-t">
                  <Button
                    variant="outline"
                    className="w-full h-9"
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      navigate(`/sales?q=${encodeURIComponent(globalSearchQuery || "")}`);
                    }}
                  >
                    {language === "rw"
                      ? "Reba byinshi muri Sales"
                      : language === "fr"
                      ? "Voir plus dans Ventes"
                      : "View more in Sales"}
                  </Button>
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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
            <div className="rounded-2xl border border-blue-600/20 bg-gradient-to-r from-blue-700 to-indigo-700 p-2 shadow-sm">
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
                title={isRw ? "Serivisi z'uyu munsi" : isFr ? "Services d'aujourd'hui" : "Services Today"}
                value={`${todayStats.totalItems}`}
                subtitle={isRw ? "serivisi zakozwe" : isFr ? "services enregistrés" : "services recorded"}
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
                title={isRw ? "Serivisi ziboneka" : isFr ? "Services actifs" : "Active Services"}
                value={`${serviceStats.totalServices}`}
                subtitle={isRw ? "serivisi muri sisitemu" : isFr ? "services dans le système" : "services in system"}
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
          <div className="col-span-9 bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
            {isLoading ? (
              <>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <KPICardSkeleton key={i} />
                  ))}
                </div>
                <div className="pt-2">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <KPICard
                    title={isRw ? "Serivisi z'uyu munsi" : isFr ? "Services d'aujourd'hui" : "Services Today"}
                    value={`${todayStats.totalItems}`}
                    subtitle={isRw ? "serivisi zakozwe" : isFr ? "services enregistrés" : "services recorded"}
                    icon={ShoppingCart}
                    tone="inverted"
                    bgColor="bg-gradient-to-br from-sky-600 to-blue-700 border border-blue-600/30 shadow-sm rounded-lg"
                  />
                  <KPICard
                    title={t("todaysRevenue")}
                    value={`${todayStats.totalRevenue.toLocaleString()} rwf`}
                    icon={DollarSign}
                    tone="inverted"
                    bgColor="bg-gradient-to-br from-indigo-600 to-violet-700 border border-indigo-600/30 shadow-sm rounded-lg"
                  />
                  <KPICard
                    title={t("todaysProfit")}
                    value={`${todayStats.totalProfit.toLocaleString()} rwf`}
                    icon={TrendingUp}
                    tone="inverted"
                    bgColor={
                      todayStats.totalProfit >= 0
                        ? "bg-gradient-to-br from-emerald-600 to-green-700 border border-emerald-600/30 shadow-sm rounded-lg"
                        : "bg-gradient-to-br from-rose-600 to-red-700 border border-red-600/30 shadow-sm rounded-lg"
                    }
                  />
                  <KPICard
                    title={isRw ? "Serivisi ziboneka" : isFr ? "Services actifs" : "Active Services"}
                    value={`${serviceStats.totalServices}`}
                    subtitle={isRw ? "serivisi muri sisitemu" : isFr ? "services dans le système" : "services in system"}
                    icon={Package}
                    tone="inverted"
                    bgColor="bg-gradient-to-br from-amber-500 to-orange-600 border border-orange-600/30 shadow-sm rounded-lg"
                  />
                </div>

                <div className="pt-2">
                  <SalesTrendChart sales={sales} className="bg-transparent border-0 shadow-none p-0" />
                </div>
              </>
            )}
          </div>

          {/* Right: recent activity table */}
          <div className="col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {isRw ? "Biheruka" : isFr ? "Récent" : "Recent"}
                </h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {isRw ? "Serivisi n'ibyakoreshejwe" : isFr ? "Ventes & dépenses" : "Sales & expenses"}
              </p>
            </div>

            {isLoading || salesLoading || isWaitingForSale ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentMobileActivity.length > 0 ? (
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                        {isRw ? "Ubwoko" : isFr ? "Type" : "Type"}
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-700 py-3 px-3">
                        {isRw ? "Amafaranga" : isFr ? "Montant" : "Amount"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {recentMobileActivity.slice(0, 7).map((entry, index) => (
                      <tr key={entry.id || index} className="border-b border-gray-200 last:border-0">
                        <td className="py-3 px-3">
                          <div className={cn("text-xs font-semibold", entry.type === "sale" ? "text-green-700" : "text-red-700")}>
                            {entry.type === "sale"
                              ? isRw
                                ? "Serivisi"
                                : isFr
                                ? "Service"
                                : "Sale"
                              : isRw
                              ? "Ikiguzi"
                              : isFr
                              ? "Dépense"
                              : "Expense"}
                          </div>
                          <div className="text-xs text-gray-700 truncate max-w-[160px]">{entry.title}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className={cn("text-xs font-semibold tabular-nums whitespace-nowrap", entry.type === "sale" ? "text-green-700" : "text-red-700")}>
                            {entry.type === "sale" ? "+" : "-"}
                            {Number(entry.amount).toLocaleString()} rwf
                          </div>
                          <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateWithTime(entry.date)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {isRw ? "Nta bikorwa" : isFr ? "Aucune activité" : "No activity"}
              </div>
            )}

            {recentMobileActivity.length > 7 && (
              <div className="p-3 border-t border-gray-200">
                <Button variant="outline" className="w-full" onClick={() => navigate("/sales")}>
                  {language === "rw"
                    ? "Reba byinshi muri Sales"
                    : language === "fr"
                    ? "Voir plus dans Ventes"
                    : "View more in Sales"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record New Sale Form - Hidden on mobile */}
      <div className="form-card mb-6 border-transparent bg-blue-500 border-blue-600 hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2 text-white">
            <Plus size={20} className="text-white" />
            {t("recordNewSale")}
          </h3>
          <div className="flex gap-2">
            {!isBulkMode && (
              <Button
                onClick={() => setIsBulkMode(true)}
                className="bg-green-600 text-white hover:bg-green-700 border border-transparent shadow-sm hover:shadow transition-all font-medium px-4 py-2 gap-2"
              >
                <Plus size={16} />
                {t("bulkAdd")}
              </Button>
            )}
            {isBulkMode && (
              <Button
                onClick={() => {
                  setIsBulkMode(false);
                  setBulkSales([{ product: "", quantity: "1", sellingPrice: "", paymentMethod: "cash", saleDate: getTodayDate() }]);
                }}
                variant="ghost"
                className="text-white hover:text-white/80 hover:bg-white/10"
              >
                {t("singleSale")}
              </Button>
            )}
          </div>
        </div>

        {isBulkMode ? (
          /* Bulk Add Form */
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-white/90">
                {isRw ? "Andika ubucuruzi bwinshi icyarimwe" : "Add multiple sales at once"}
              </p>
              <Button
                onClick={addBulkRow}
                className="bg-blue-500 text-white hover:bg-blue-600 border border-transparent shadow-sm hover:shadow transition-all font-medium px-3 py-2 gap-2"
              >
                <Plus size={14} />
                {t("addRow")}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-600 border-b border-blue-700">
                  <tr>
                    <th className="text-left p-2 text-xs font-medium text-white">{t("product")}</th>
                    <th className="text-left p-2 text-xs font-medium text-white">{t("quantity")}</th>
                    <th className="text-left p-2 text-xs font-medium text-white">{t("sellingPrice")} (rwf)</th>
                    <th className="text-left p-2 text-xs font-medium text-white">{t("paymentMethod")}</th>
                    <th className="text-left p-2 text-xs font-medium text-white">{t("saleDate")}</th>
                    <th className="text-left p-2 text-xs font-medium text-white w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {bulkSales.map((sale, index) => (
                    <tr key={index} className="border-b border-transparent last:border-0">
                      <td className="p-2">
                        <ProductCombobox
                          value={sale.product}
                          onValueChange={(value) => updateBulkSale(index, "product", value)}
                          products={products}
                          placeholder="Search products by name, category, or type..."
                          className="h-9"
                          onError={(message) => {
                            playErrorBeep();
                            toast({
                              title: "Product Out of Stock",
                              description: message,
                              variant: "destructive",
                            });
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          max={sale.product ? (() => {
                            const product = products.find(p => {
                              const id = (p as any)._id || p.id;
                              return id.toString() === sale.product;
                            });
                            return product?.stock || 0;
                          })() : undefined}
                          value={sale.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              updateBulkSale(index, "quantity", "");
                              return;
                            }
                            if (sale.product) {
                              const product = products.find(p => {
                                const id = (p as any)._id || p.id;
                                return id.toString() === sale.product;
                              });
                              const numValue = parseInt(value);
                              if (product && numValue > product.stock) {
                                // Prevent entering more than available stock
                                updateBulkSale(index, "quantity", product.stock.toString());
                                playErrorBeep();
                                toast({
                                  title: "Maximum Quantity",
                                  description: `${product.name}: Only ${product.stock} ${product.stock === 1 ? 'item' : 'items'} available in stock.`,
                                  variant: "destructive",
                                });
                                return;
                              }
                            }
                            updateBulkSale(index, "quantity", value);
                          }}
                          className="input-field h-9"
                          placeholder={t("enterQuantity") || "Enter quantity"}
                        />
                        {sale.product && (
                          <p className="text-xs text-white/80 mt-1">
                            Stock: {products.find(p => {
                              const id = (p as any)._id || p.id;
                              return id.toString() === sale.product;
                            })?.stock || 0}
                          </p>
                        )}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={sale.sellingPrice}
                          onChange={(e) => updateBulkSale(index, "sellingPrice", e.target.value)}
                          className="input-field h-9"
                          placeholder={isRw ? "Injiza igiciro" : "Enter price"}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={sale.paymentMethod}
                          onValueChange={(value) => updateBulkSale(index, "paymentMethod", value)}
                        >
                          <SelectTrigger className="input-field h-9 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{t("cash")}</SelectItem>
                            <SelectItem value="momo">{t("momoPay")}</SelectItem>
                            <SelectItem value="card">{t("card")}</SelectItem>
                            <SelectItem value="airtel">{t("airtelPay")}</SelectItem>
                            <SelectItem value="transfer">{t("bankTransfer")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          value={sale.saleDate}
                          onChange={(e) => updateBulkSale(index, "saleDate", e.target.value)}
                          className="input-field h-9 w-full"
                        />
                      </td>
                      <td className="p-2">
                        {bulkSales.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:bg-red-100 rounded-full"
                            onClick={() => removeBulkRow(index)}
                          >
                            <X size={14} className="text-red-600" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleRecordSale}
                disabled={isRecordingSale}
                className="bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow transition-all font-semibold px-4 py-2 border border-transparent gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={16} />
                {isRecordingSale ? t("recording") : t("recordSales")}
              </Button>
            </div>
          </div>
        ) : (
          /* Single Sale Form */
          <div className="space-y-4">
            {/* First Row: Product, Quantity, Selling Price */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-white">{t("selectProduct")}</Label>
                <ProductCombobox
                  value={selectedProduct}
                  onValueChange={handleProductChange}
                  products={products}
                  placeholder="Search products by name, category, or type..."
                  onError={(message) => {
                    playErrorBeep();
                    toast({
                      title: "Product Out of Stock",
                      description: message,
                      variant: "destructive",
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">
                  {selectedProduct && (() => {
                    const product = products.find(p => {
                      const id = (p as any)._id || p.id;
                      return id.toString() === selectedProduct;
                    });
                    if (product?.isPackage && packageSaleMode === "wholePackage") {
                      return isRw ? "Igipaki" : "Package";
                    }
                    return t("quantity");
                  })()}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedProduct ? products.find(p => {
                    const id = (p as any)._id || p.id;
                    return id.toString() === selectedProduct;
                  })?.stock || 0 : undefined}
                  value={selectedProduct && (() => {
                    const product = products.find(p => {
                      const id = (p as any)._id || p.id;
                      return id.toString() === selectedProduct;
                    });
                    if (product?.isPackage && packageSaleMode === "wholePackage") {
                      return product.packageQuantity?.toString() || "1";
                    }
                    return quantity;
                  })()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setQuantity("");
                      return;
                    }
                    const numValue = parseInt(value);
                    if (selectedProduct) {
                      const product = products.find(p => {
                        const id = (p as any)._id || p.id;
                        return id.toString() === selectedProduct;
                      });
                      if (product && numValue > product.stock) {
                        // Prevent entering more than available stock
                        setQuantity(product.stock.toString());
                        playErrorBeep();
                        toast({
                          title: "Maximum Quantity",
                          description: `Only ${product.stock} ${product.stock === 1 ? 'item' : 'items'} available in stock.`,
                          variant: "destructive",
                        });
                        return;
                      }
                    }
                    setQuantity(value);
                  }}
                  disabled={selectedProduct && (() => {
                    const product = products.find(p => {
                      const id = (p as any)._id || p.id;
                      return id.toString() === selectedProduct;
                    });
                    return product?.isPackage && packageSaleMode === "wholePackage";
                  })()}
                  className="input-field"
                  placeholder={t("enterQuantity") || "Enter quantity"}
                />
                {selectedProduct && (() => {
                  const product = products.find(p => {
                    const id = (p as any)._id || p.id;
                    return id.toString() === selectedProduct;
                  });
                  if (!product) return null;
                  
                  return (
                    <p className="text-xs text-white/80">
                      {t("availableStock")}: {formatStockDisplay(product, t("language") as 'en' | 'rw')}
                      {product.isPackage && product.packageQuantity && (
                        <span className="ml-1">(Box of {product.packageQuantity})</span>
                      )}
                    </p>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label className="text-white">{t("sellingPrice")} (rwf)</Label>
                <Input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="input-field"
                  placeholder={selectedProduct ? "Enter price" : "Select product first"}
                />
                {selectedProduct && (() => {
                  const product = products.find(p => {
                    const id = (p as any)._id || p.id;
                    return id.toString() === selectedProduct;
                  });
                  if (!product) return null;
                  
                  if (product.isPackage && product.packageQuantity) {
                    const basePrice = product.sellingPrice;
                    const priceType = product.priceType || "perQuantity";
                    const currentMode = packageSaleMode;
                    
                    if (priceType === "perQuantity") {
                      return (
                        <p className="text-xs text-white/80">
                          {currentMode === "wholePackage" 
                            ? `Price per item: ${basePrice.toLocaleString()} rwf × ${product.packageQuantity} = ${(basePrice * product.packageQuantity).toLocaleString()} rwf (whole package)`
                            : `Price per item: ${basePrice.toLocaleString()} rwf - You can change this`
                          }
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-xs text-white/80">
                          {currentMode === "wholePackage"
                            ? `Price for whole package: ${basePrice.toLocaleString()} rwf - You can change this`
                            : `Price per item: ${(basePrice / product.packageQuantity).toFixed(2)} rwf (from ${basePrice.toLocaleString()} rwf ÷ ${product.packageQuantity})`
                          }
                        </p>
                      );
                    }
                  } else {
                    return (
                      <p className="text-xs text-white/80">
                        {t("suggestedPrice")}: rwf {product.sellingPrice.toLocaleString()} - You can change this
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
            
            {/* Package Sale Mode Selector - Only for package products */}
            {selectedProduct && (() => {
              const product = products.find(p => {
                const id = (p as any)._id || p.id;
                return id.toString() === selectedProduct;
              });
              if (product?.isPackage && product.packageQuantity) {
                return (
                  <div className="space-y-2">
                    <Label className="text-white">
                      {isRw ? "Uburyo bwo kugurisha" : "Sale Mode"}
                    </Label>
                    <Select
                      value={packageSaleMode}
                      onValueChange={(value: "quantity" | "wholePackage") => setPackageSaleMode(value)}
                    >
                      <SelectTrigger className="input-field w-full max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quantity">
                          {isRw ? "Kugurisha ku mubare" : "Sell by Quantity"}
                        </SelectItem>
                        <SelectItem value="wholePackage">
                          {isRw ? "Kugurisha igipaki cyose" : "Sell Whole Package"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              return null;
            })()}
            {/* Revenue, Cost, and Profit Preview */}
            {selectedProduct && quantity && sellingPrice && parseInt(quantity) > 0 && parseFloat(sellingPrice) > 0 && (
              <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-600/30 rounded-lg border border-blue-400/30 mt-2">
                {(() => {
                  const product = products.find(p => {
                    const id = (p as any)._id || p.id;
                    return id.toString() === selectedProduct;
                  });
                  if (!product) return null;
                  
                  // Calculate preview based on package or regular product
                  let qty: number;
                  let revenue: number;
                  let cost: number;
                  
                  if (product.isPackage && product.packageQuantity) {
                    if (packageSaleMode === "wholePackage") {
                      qty = product.packageQuantity;
                      if (product.priceType === "perPackage") {
                        revenue = parseFloat(sellingPrice) || 0;
                      } else {
                        revenue = (parseFloat(sellingPrice) || 0) * product.packageQuantity;
                      }
                      if (product.costPriceType === "perPackage") {
                        cost = product.costPrice;
                      } else {
                        cost = product.costPrice * product.packageQuantity;
                      }
                    } else {
                      qty = parseInt(quantity) || 0;
                      if (product.priceType === "perPackage") {
                        const pricePerItem = (parseFloat(sellingPrice) || 0) / product.packageQuantity;
                        revenue = pricePerItem * qty;
                      } else {
                        revenue = (parseFloat(sellingPrice) || 0) * qty;
                      }
                      if (product.costPriceType === "perPackage") {
                        const costPerItem = product.costPrice / product.packageQuantity;
                        cost = costPerItem * qty;
                      } else {
                        cost = product.costPrice * qty;
                      }
                    }
                  } else {
                    qty = parseInt(quantity) || 0;
                    const price = parseFloat(sellingPrice) || 0;
                    revenue = qty * price;
                    cost = qty * product.costPrice;
                  }
                  
                  const profit = revenue - cost;
                  
                  return (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-white/80 mb-1 font-medium">Revenue</p>
                        <p className="text-xl font-bold text-blue-200">rwf {revenue.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-white/80 mb-1 font-medium">Cost</p>
                        <p className="text-xl font-bold text-orange-200">rwf {cost.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-white/80 mb-1 font-medium">Profit</p>
                        <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                          rwf {profit.toLocaleString()}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            {/* Second Row: Payment Method and Sale Date */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-white">{t("paymentMethod")}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="input-field w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="momo">{t("momoPay")}</SelectItem>
                    <SelectItem value="card">{t("card")}</SelectItem>
                    <SelectItem value="airtel">{t("airtelPay")}</SelectItem>
                    <SelectItem value="transfer">{t("bankTransfer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">{t("saleDate")}</Label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleRecordSale} 
                disabled={isRecordingSale}
                className="bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow transition-all font-semibold px-4 py-2 border border-transparent w-full gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={16} />
                {isRecordingSale ? t("recording") : t("recordSale")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Large Quick Actions */}
      <div className="hidden lg:block mb-6">
        <div className="rounded-lg border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {isRw ? "Ibyibanze" : isFr ? "Actions de base" : "Quick Actions"}
            </h3>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            <Button onClick={() => navigate("/products")} className="h-20 flex flex-col gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
              <Package size={20} />
              <span>{isRw ? "Serivisi" : isFr ? "Services" : "Services"}</span>
            </Button>
            <Button onClick={() => setSaleModalOpen(true)} className="h-20 flex flex-col gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
              <Plus size={20} />
              <span>{isRw ? "Andika serivisi" : isFr ? "Enregistrer un service" : "Record Service"}</span>
            </Button>
            <Button onClick={() => setExpenseModalOpen(true)} className="h-20 flex flex-col gap-2 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white">
              <Wallet size={20} />
              <span>{isRw ? "Andika ikiguzi" : isFr ? "Enregistrer une dépense" : "Record Expense"}</span>
            </Button>
            <Button onClick={() => navigate("/barbers")} className="h-20 flex flex-col gap-2 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white">
              <UserRound size={20} />
              <span>{isRw ? "Umwogoshi" : isFr ? "Coiffeurs" : "Barbers"}</span>
            </Button>
            <Button onClick={() => navigate("/sales")} className="h-20 flex flex-col gap-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              <ShoppingCart size={20} />
              <span>{t("sales")}</span>
            </Button>
            <Button onClick={() => navigate("/reports")} className="h-20 flex flex-col gap-2 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white">
              <FileText size={20} />
              <span>{t("reports")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions - Mobile Only */}
        <div className="lg:hidden">
          <div className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <h3 className="text-base font-semibold text-gray-900">
              {isRw ? "Ibyibanze" : isFr ? "Actions de base" : "Quick Actions"}
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              {isRw
                ? "Kanda kugirango ukore ibikorwa byihuse"
                : isFr
                ? "Cliquez pour effectuer des actions rapides"
                : "Click to perform quick actions"}
            </p>
            
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Services */}
              <Button
                onClick={() => navigate("/products")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Package size={18} />
                <span className="text-xs font-medium">
                  {isRw ? "Serivisi" : isFr ? "Services" : "Services"}
                </span>
              </Button>

              {/* Record Service */}
              <Button
                onClick={() => setSaleModalOpen(true)}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Plus size={18} />
                <span className="text-xs font-medium">
                  {isRw ? "Andika serivisi" : isFr ? "Enregistrer un service" : "Record Service"}
                </span>
              </Button>

              {/* Barbers */}
              <Button
                onClick={() => navigate("/barbers")}
                className="h-16 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <UserRound size={18} />
                <span className="text-xs font-medium">
                  {isRw ? "Umwogoshi" : isFr ? "Coiffeurs" : "Barbers"}
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
                  {isRw ? "Andika ikiguzi" : isFr ? "Enregistrer une dépense" : "Record Expense"}
                </span>
              </Button>

            </div>
          </div>
        </div>
        
        {/* Salon-first mode: inventory low-stock panel hidden */}
      </div>

      {/* Recent Sales Table */}
      <div className="mb-6 lg:hidden">
        <div className="lg:bg-white bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {isRw ? "Serivisi n'ibyakoreshejwe" : isFr ? "Ventes récentes et dépenses" : "Recent Sales & Expenses"}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {isRw ? "Ibikorwa biheruka" : isFr ? "Activité récente" : "Latest activity"}
            </p>
          </div>
          
          {isLoading || salesLoading || isWaitingForSale ? (
            <div className="p-4">
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full mb-2" />
            </div>
          ) : recentSales.length > 0 || recentMobileActivity.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">
                        {isRw ? "Ubwoko" : isFr ? "Type" : "Type"}
                      </th>
                      <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">
                        {isRw ? "Ibisobanuro" : isFr ? "Détails" : "Details"}
                      </th>
                      <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">
                        {isRw ? "Amafaranga (Rwf)" : isFr ? "Montant (RWF)" : "Amount (Rwf)"}
                      </th>
                      <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">
                        {t("date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {recentMobileActivity.slice(0, 7).map((entry, index) => (
                      <tr 
                        key={entry.id || index}
                        className={cn(
                          "border-b border-gray-200",
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        )}
                      >
                        <td className="py-4 px-6">
                          <div className={cn(
                            "text-sm font-semibold",
                            entry.type === "sale" ? "text-green-700" : "text-red-700"
                          )}>
                            {entry.type === "sale"
                              ? isRw
                                ? "Serivisi"
                                : isFr
                                ? "Service"
                                : "Sale"
                              : isRw
                              ? "Ikiguzi"
                              : isFr
                              ? "Dépense"
                              : "Expense"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">{entry.title}</div>
                          {entry.meta && (
                            <div className="text-xs text-gray-500 mt-1">{entry.meta}</div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className={cn(
                            "text-sm font-semibold",
                            entry.type === "sale" ? "text-green-700" : "text-red-700"
                          )}>
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
                <div className="divide-y divide-border/60">
                  {recentMobileActivity.slice(0, 7).map((entry, index) => {
                    const isSale = entry.type === "sale";
                    const label = isSale
                      ? isRw
                        ? "Serivisi"
                        : isFr
                        ? "Service"
                        : "Sale"
                      : isRw
                      ? "Ikiguzi"
                      : isFr
                      ? "Dépense"
                      : "Expense";
                    return (
                      <button
                        key={entry.id || index}
                        type="button"
                        className="w-full text-left px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
                      >
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                            isSale ? "text-green-700" : "text-red-700"
                          )}
                        >
                          {isSale ? (
                            <ArrowUpRight size={18} className="rotate-[18deg]" />
                          ) : (
                            <ArrowDownLeft size={18} className="-rotate-[18deg]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{entry.title}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">
                            {label} • {formatDateWithTime(entry.date)}
                            {entry.meta ? ` • ${entry.meta}` : ""}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "text-sm font-semibold tabular-nums whitespace-nowrap",
                            isSale ? "text-green-700" : "text-red-700"
                          )}
                        >
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
                  {isRw ? "Nta bikorwa biheruka" : isFr ? "Aucune activité récente" : "No recent activity"}
                </p>
                <p className="text-sm mt-1">
                  {isRw
                    ? "Serivisi n'ibyakoreshejwe bizagaragara hano"
                    : isFr
                    ? "Les ventes et dépenses récentes apparaîtront ici"
                    : "Recent sales and expenses will appear here"}
                </p>
              </div>
            </div>
          )}
        </div>
        {recentMobileActivity.length > 7 && (
          <div className="pt-3 lg:hidden">
            <Button variant="outline" className="w-full" onClick={() => navigate("/sales")}>
              {language === "rw"
                ? "Reba byinshi muri Sales"
                : language === "fr"
                ? "Voir plus dans Ventes"
                : "View more in Sales"}
            </Button>
          </div>
        )}
      </div>

      <AddToHomeScreen />

      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent className="w-[calc(100vw-24px)] sm:w-full max-w-[560px] max-h-[85vh] overflow-y-auto p-0 bg-white border-gray-200 rounded-2xl shadow-xl">
          <div className="p-4">
          <DialogHeader>
            <DialogTitle>
              {isRw ? "Andika ikiguzi" : isFr ? "Enregistrer une dépense" : "Record Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>
                {isRw ? "Izina ry'ikiguzi" : isFr ? "Nom de la dépense" : "Expense Name"}
              </Label>
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
                placeholder={isRw ? "nka: Umuriro, Ubukode..." : isFr ? "ex: Services, Loyer..." : "e.g. Utilities, Rent..."}
              />

              {(expenseSuggestions.presetTitles.length > 0 ||
                expenseSuggestions.mostUsed.length > 0 ||
                expenseSuggestions.recent.length > 0) && (
                <div className="pt-2 space-y-2">
                  {expenseSuggestions.presetTitles.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-600">
                        {isRw ? "Ibyihuse" : isFr ? "Favoris" : "Presets"}
                      </div>
                      <div className="mt-1 -mx-1 px-1 overflow-x-auto">
                        <div className="flex gap-2 w-max">
                        {expenseSuggestions.presetTitles.map((t) => (
                          <Button
                            key={t}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full"
                            onClick={() => applyExpenseSuggestion(t)}
                          >
                            {t}
                          </Button>
                        ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {expenseSuggestions.mostUsed.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-600">
                        {isRw ? "Byinshi ukoresha" : isFr ? "Les plus utilisés" : "Most used"}
                      </div>
                      <div className="mt-1 -mx-1 px-1 overflow-x-auto">
                        <div className="flex gap-2 w-max">
                        {expenseSuggestions.mostUsed.map((x) => (
                          <Button
                            key={x.title}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full"
                            onClick={() => applyExpenseSuggestion(x.title)}
                          >
                            {x.title}
                          </Button>
                        ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {expenseSuggestions.recent.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-600">
                        {isRw ? "Biheruka" : isFr ? "Récentes" : "Recent"}
                      </div>
                      <div className="mt-1 -mx-1 px-1 overflow-x-auto">
                        <div className="flex gap-2 w-max">
                        {expenseSuggestions.recent.map((t) => (
                          <Button
                            key={t}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full"
                            onClick={() => applyExpenseSuggestion(t)}
                          >
                            {t}
                          </Button>
                        ))}
                        </div>
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
                      {isRw ? "Bika nk'icyihuse" : isFr ? "Enregistrer favori" : "Save preset"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>
                {isRw ? "Amafaranga (rwf)" : isFr ? "Montant (RWF)" : "Amount (rwf)"}
              </Label>
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setShowExpenseAmountPad(true)}
                  className="w-full h-12 rounded-xl border border-gray-300 bg-white px-4 text-left text-lg font-semibold text-gray-900 tabular-nums"
                >
                  {expenseAmount ? Number(expenseAmount).toLocaleString() : "0"} rwf
                </button>
              ) : (
                <Input
                  type="number"
                  min="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0"
                />
              )}
            </div>
            {isMobile && showExpenseAmountPad && (
              <MobileNumberPad
                value={expenseAmount}
                onChange={(next) => setExpenseAmount(next.replace(/[^\d]/g, ""))}
                onDone={() => setShowExpenseAmountPad(false)}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isRw ? "Icyiciro" : isFr ? "Catégorie" : "Category"}</Label>
                <Input
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  placeholder={isRw ? "nka: Ibikoresho" : isFr ? "ex: Fournitures" : "e.g. Supplies"}
                />
              </div>
              <div className="space-y-1">
                <Label>{isRw ? "Itariki" : isFr ? "Date" : "Date"}</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{isRw ? "Ibisobanuro (si ngombwa)" : isFr ? "Note (facultatif)" : "Note (optional)"}</Label>
              <Textarea
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder={isRw ? "Andika ibisobanuro..." : isFr ? "Ajouter des détails..." : "Add extra details..."}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseModalOpen(false)}>
              {isRw ? "Funga" : isFr ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={handleRecordExpense}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSavingExpense}
            >
              {isSavingExpense
                ? isRw
                  ? "Birabikwa..."
                  : isFr
                  ? "Enregistrement..."
                  : "Saving..."
                : isRw
                ? "Bika ikiguzi"
                : isFr
                ? "Enregistrer la dépense"
                : "Save Expense"}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Record Sale Modal - Mobile Only */}
      <RecordSaleModal 
        open={saleModalOpen} 
        onOpenChange={setSaleModalOpen}
      />
    </AppLayout>
  );
};

export default Dashboard;
