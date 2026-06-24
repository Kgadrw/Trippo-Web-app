import { useMemo, useState } from "react";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import type { ProductEntry } from "@/components/inventory/ProductsTab";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { playSaleBeep, playErrorBeep } from "@/lib/sound";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceRecordBy } from "@/components/workspace/WorkspaceRecordBy";

interface SaleEntry {
  id?: number;
  _id?: string;
  product: string;
  productId?: string;
  quantity: number;
  revenue: number;
  cost?: number;
  profit?: number;
  date: string;
  paymentMethod?: string;
  createdByName?: string;
}

function saleId(s: SaleEntry): string {
  return String(s._id ?? s.id ?? "");
}

function productOptionId(p: ProductEntry): string {
  return String(p._id ?? p.id ?? "");
}

export function SalesTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { mode } = useWorkspace();
  const { items: sales, isLoading, add, refresh } = useApi<SaleEntry>({
    endpoint: "sales",
    defaultValue: [],
  });
  const { items: products } = useApi<ProductEntry>({
    endpoint: "products",
    defaultValue: [],
  });

  const sellableProducts = useMemo(
    () => products.filter((p) => p.category?.toLowerCase() !== "service" && (p.stock ?? 0) > 0),
    [products],
  );

  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSaving, setIsSaving] = useState(false);

  const selectedProduct = sellableProducts.find((p) => productOptionId(p) === productId);
  const unitPrice = selectedProduct?.sellingPrice ?? 0;
  const qty = parseInt(quantity, 10) || 0;
  const lineTotal = unitPrice * qty;

  const handleSave = async () => {
    if (!selectedProduct || qty <= 0) {
      toast({ title: t("saveFailed"), description: t("saleRequiredFields"), variant: "destructive" });
      return;
    }
    if (qty > (selectedProduct.stock ?? 0)) {
      playErrorBeep();
      toast({ title: t("saveFailed"), description: t("insufficientStock"), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const cost = (selectedProduct.costPrice ?? 0) * qty;
      const revenue = lineTotal;
      await add({
        product: selectedProduct.name,
        productId: productOptionId(selectedProduct),
        quantity: qty,
        revenue,
        cost,
        profit: revenue - cost,
        date: new Date().toISOString(),
        paymentMethod,
        saleType: "product",
      } as SaleEntry);
      playSaleBeep();
      toast({ title: t("saleRecorded"), description: t("saleRecordedDesc") });
      setProductId("");
      setQuantity("1");
      setOpen(false);
    } catch (error: unknown) {
      playErrorBeep();
      const message = error instanceof Error ? error.message : t("saveSaleFailed");
      toast({ title: t("saveFailed"), description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const { query: pageSearchQuery } = usePageSearch();
  const visibleSales = useMemo(() => {
    const sorted = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return filterByPageSearch(sorted, pageSearchQuery, (entry) => [
      entry.product,
      entry.paymentMethod,
      entry.saleType,
    ]);
  }, [sales, pageSearchQuery]);

  const renderTable = () => {
    if (isLoading) return <FinanceTableLoading />;
    if (sales.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{t("noSalesYet")}</p>
          <p className="text-sm mt-1">{t("salesEmptyHint")}</p>
        </div>
      );
    }

    if (visibleSales.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">{pageSearchQuery.trim() ? t("noProductsSearchHint") : t("noSalesYet")}</p>
          {!pageSearchQuery.trim() ? <p className="text-sm mt-1">{t("salesEmptyHint")}</p> : null}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              <th className={FINANCE_TH_CLASS}>{t("productName")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("quantity")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("totalRevenue")}</th>
              <th className={FINANCE_TH_CLASS}>{t("saleDate")}</th>
              {mode === "workspace" ? <th className={FINANCE_TH_CLASS}>Added by</th> : null}
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleSales.slice(0, 50).map((entry) => (
                <tr key={saleId(entry)} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className={cn(FINANCE_TD_CLASS, "font-medium")}>{entry.product}</td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right tabular-nums")}>{entry.quantity}</td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-semibold tabular-nums text-emerald-700")}>
                    {formatCurrency(entry.revenue)}
                  </td>
                  <td className={FINANCE_TD_CLASS}>{formatFinanceTableDate(entry.date)}</td>
                  {mode === "workspace" ? (
                    <td className={FINANCE_TD_CLASS}>
                      <WorkspaceRecordBy name={entry.createdByName} />
                    </td>
                  ) : null}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <FinanceTableShell
        title={t("recordSales")}
        onAdd={() => setOpen(true)}
        addLabel={t("add")}
        onRefresh={() => void refresh(true)}
        isRefreshing={false}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("recordSale")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t("productName")}</Label>
              <Select value={productId || "none"} onValueChange={(v) => setProductId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("selectProduct")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("selectProduct")}</SelectItem>
                  {sellableProducts.map((p) => (
                    <SelectItem key={productOptionId(p)} value={productOptionId(p)}>
                      {p.name} ({p.stock} {t("stock").toLowerCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("quantity")}</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("paymentMethod")}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="momo">{t("momoPay")}</SelectItem>
                    <SelectItem value="airtel">{t("airtelPay")}</SelectItem>
                    <SelectItem value="card">{t("card")}</SelectItem>
                    <SelectItem value="transfer">{t("bankTransfer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedProduct ? (
              <p className="text-sm text-gray-600">
                {t("total")}: <span className="font-semibold text-emerald-700"><CurrencyAmount amount={lineTotal} codeFirst codeClassName="text-emerald-700/70" /></span>
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="cancel" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
