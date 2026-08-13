import { useMemo, useState, useEffect } from "react";
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
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, CurrencyAmount } from "@/lib/currency";
import type { ProductEntry } from "@/components/inventory/ProductsTab";
import type { CustomerEntry } from "@/components/finance/CustomersTab";
import { CustomerSearchSelect } from "@/components/finance/CustomerSearchSelect";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceTableCheckbox,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { playSaleBeep, playErrorBeep } from "@/lib/sound";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceRecordBy } from "@/components/workspace/WorkspaceRecordBy";
import { useTableSelection } from "@/hooks/useTableSelection";
import { clientApi } from "@/lib/api";

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
  saleType?: string;
  clientId?: string | null;
  buyerName?: string;
  createdByName?: string;
}

function saleId(s: SaleEntry): string {
  return String(s._id ?? s.id ?? "");
}

function saleProfit(s: SaleEntry): number {
  if (typeof s.profit === "number" && Number.isFinite(s.profit)) return s.profit;
  const revenue = Number(s.revenue) || 0;
  const cost = Number(s.cost) || 0;
  return revenue - cost;
}

function productOptionId(p: ProductEntry): string {
  return String(p._id ?? p.id ?? "");
}

function customerOptionId(c: CustomerEntry): string {
  return String(c._id ?? c.id ?? "");
}

function toDateInputValue(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`).toISOString();
  }
  return new Date(value || Date.now()).toISOString();
}

export function SalesTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { mode, isWorkspaceAdmin, activeWorkspace } = useWorkspace();
  const canManageSales =
    mode !== "workspace" ||
    isWorkspaceAdmin ||
    (activeWorkspace?.permissions || []).includes("sales");

  const { items: sales, isLoading, add, update, remove, refresh } = useApi<SaleEntry>({
    endpoint: "sales",
    defaultValue: [],
  });
  const { items: products } = useApi<ProductEntry>({
    endpoint: "products",
    defaultValue: [],
  });
  const { items: customers, refresh: refreshCustomers } = useApi<CustomerEntry>({
    endpoint: "clients",
    defaultValue: [],
  });

  useEffect(() => {
    void (async () => {
      try {
        await clientApi.mergeDuplicates();
        await refreshCustomers(true);
      } catch {
        // merge is best-effort
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SaleEntry | null>(null);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [clientId, setClientId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const deleteConfirm = useDeleteConfirm<SaleEntry>();

  const sellableProducts = useMemo(() => {
    const editingProductId = editing?.productId ? String(editing.productId) : "";
    return products.filter((p) => {
      if (p.category?.toLowerCase() === "service") return false;
      const id = productOptionId(p);
      if (editingProductId && id === editingProductId) return true;
      return (p.stock ?? 0) > 0;
    });
  }, [products, editing]);

  useEffect(() => {
    const handleSyncFailed = (event: Event) => {
      const detail = (event as CustomEvent<{ error?: { message?: string } }>).detail;
      playErrorBeep();
      toast({
        title: t("saveFailed"),
        description: detail?.error?.message || t("saveSaleFailed"),
        variant: "destructive",
      });
    };
    window.addEventListener("sale-sync-failed", handleSyncFailed);
    return () => window.removeEventListener("sale-sync-failed", handleSyncFailed);
  }, [toast, t]);

  const selectedProduct = sellableProducts.find((p) => productOptionId(p) === productId);
  const unitPrice = Number(sellingPrice);
  const qty = parseInt(quantity, 10) || 0;
  const lineTotal =
    Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice * qty : 0;

  const resetForm = () => {
    setEditing(null);
    setProductId("");
    setQuantity("1");
    setSellingPrice("");
    setPaymentMethod("cash");
    setSaleDate(new Date().toISOString().slice(0, 10));
    setClientId("");
    setBuyerName("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (sale: SaleEntry) => {
    if (!canManageSales) return;
    setEditing(sale);
    setProductId(sale.productId ? String(sale.productId) : "");
    setQuantity(String(sale.quantity || 1));
    const qtyVal = Number(sale.quantity) || 1;
    const derivedUnit =
      qtyVal > 0 && Number.isFinite(Number(sale.revenue))
        ? Number(sale.revenue) / qtyVal
        : undefined;
    setSellingPrice(
      derivedUnit != null && Number.isFinite(derivedUnit)
        ? String(Math.round(derivedUnit * 100) / 100)
        : "",
    );
    setPaymentMethod(sale.paymentMethod || "cash");
    setSaleDate(toDateInputValue(sale.date));
    setClientId(sale.clientId ? String(sale.clientId) : "");
    setBuyerName(sale.buyerName || "");
    setOpen(true);
  };

  const handleProductChange = (nextId: string) => {
    setProductId(nextId);
    if (!nextId) {
      setSellingPrice("");
      return;
    }
    const product = sellableProducts.find((p) => productOptionId(p) === nextId);
    if (product) {
      setSellingPrice(String(product.sellingPrice ?? 0));
    }
  };

  const handleSave = async () => {
    if (!selectedProduct || qty <= 0) {
      toast({ title: t("saveFailed"), description: t("saleRequiredFields"), variant: "destructive" });
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast({
        title: t("saveFailed"),
        description: t("invalidPriceDesc"),
        variant: "destructive",
      });
      return;
    }

    const availableStock =
      (selectedProduct.stock ?? 0) +
      (editing && String(editing.productId || "") === productOptionId(selectedProduct)
        ? Number(editing.quantity) || 0
        : 0);
    if (qty > availableStock) {
      playErrorBeep();
      toast({ title: t("saveFailed"), description: t("insufficientStock"), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const cost = (selectedProduct.costPrice ?? 0) * qty;
      const revenue = lineTotal;
      const selectedCustomer = customers.find((c) => customerOptionId(c) === clientId);
      const resolvedBuyerName =
        buyerName.trim() || selectedCustomer?.name || "";

      const payload = {
        product: selectedProduct.name,
        productId: productOptionId(selectedProduct),
        quantity: qty,
        revenue,
        cost,
        profit: revenue - cost,
        date: dateInputToIso(saleDate),
        paymentMethod,
        saleType: "product",
        clientId: clientId || null,
        buyerName: resolvedBuyerName,
      };

      if (editing) {
        await update({ ...editing, ...payload } as SaleEntry);
        toast({ title: t("saleUpdatedTitle") });
      } else {
        await add(payload as SaleEntry);
        playSaleBeep();
        toast({
          title: t("saleRecorded"),
          description: t("saleRecordedDesc")
            .replace("{qty}", String(qty))
            .replace("{product}", selectedProduct.name),
        });
      }
      setOpen(false);
      resetForm();
      void refresh(true);
    } catch (error: unknown) {
      playErrorBeep();
      const message = error instanceof Error ? error.message : t("saveSaleFailed");
      toast({
        title: editing ? t("updateSaleFailedTitle") : t("saveFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const sale = deleteConfirm.takeTarget();
    if (!sale || !canManageSales) return;
    deleteConfirm.setIsDeleting(true);
    try {
      await remove(sale);
      toast({ title: t("saleDeletedTitle") });
      void refresh(true);
    } catch (error: unknown) {
      playErrorBeep();
      const message = error instanceof Error ? error.message : t("deleteSaleFailedDesc");
      toast({ title: t("deleteSaleFailedTitle"), description: message, variant: "destructive" });
    } finally {
      deleteConfirm.setIsDeleting(false);
    }
  };

  const { query: pageSearchQuery } = usePageSearch();
  const visibleSales = useMemo(() => {
    const sorted = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return filterByPageSearch(sorted, pageSearchQuery, (entry) => [
      entry.product,
      entry.paymentMethod,
      entry.saleType,
      entry.buyerName,
      entry.createdByName,
    ]);
  }, [sales, pageSearchQuery]);

  const {
    selectedIds,
    selectedCount,
    selectedItems,
    allSelected,
    toggleSelectAll,
    toggleSelectRow,
    clearSelection,
  } = useTableSelection(visibleSales, saleId);

  const handleBulkDeleteConfirm = async () => {
    if (!canManageSales || selectedItems.length === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const sale of selectedItems) {
        await remove(sale);
      }
      clearSelection();
      setBulkDeleteOpen(false);
      toast({ title: t("saleDeletedTitle") });
      void refresh(true);
    } catch (error: unknown) {
      playErrorBeep();
      const message = error instanceof Error ? error.message : t("deleteSaleFailedDesc");
      toast({ title: t("deleteSaleFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              {canManageSales ? (
                <th className={cn(FINANCE_TH_CLASS, "w-10 pl-4")}>
                  <FinanceTableCheckbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    ariaLabel="Select all"
                  />
                </th>
              ) : null}
              <th className={FINANCE_TH_CLASS}>{t("productName")}</th>
              <th className={FINANCE_TH_CLASS}>{t("buyerName")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("quantity")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("totalRevenue")}</th>
              <th className={cn(FINANCE_TH_CLASS, "text-right")}>{t("profit")}</th>
              <th className={FINANCE_TH_CLASS}>{t("saleDate")}</th>
              {mode === "workspace" ? <th className={FINANCE_TH_CLASS}>Added by</th> : null}
              {canManageSales ? <th className={cn(FINANCE_TH_CLASS, "w-12")} /> : null}
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleSales.slice(0, 50).map((entry) => {
              const id = saleId(entry);
              const profit = saleProfit(entry);
              return (
                <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  {canManageSales ? (
                    <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                      <FinanceTableCheckbox
                        checked={selectedIds.has(id)}
                        onCheckedChange={() => toggleSelectRow(id)}
                        ariaLabel={`Select ${entry.product}`}
                      />
                    </td>
                  ) : null}
                  <td className={cn(FINANCE_TD_CLASS, "font-medium")}>{entry.product}</td>
                  <td className={FINANCE_TD_CLASS}>{entry.buyerName?.trim() || "—"}</td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right tabular-nums")}>{entry.quantity}</td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right font-semibold tabular-nums text-emerald-700")}>
                    {formatCurrency(entry.revenue)}
                  </td>
                  <td
                    className={cn(
                      FINANCE_TD_CLASS,
                      "text-right font-semibold tabular-nums",
                      profit >= 0 ? "text-sky-700" : "text-red-600",
                    )}
                  >
                    {formatCurrency(profit)}
                  </td>
                  <td className={FINANCE_TD_CLASS}>{formatFinanceTableDate(entry.date)}</td>
                  {mode === "workspace" ? (
                    <td className={FINANCE_TD_CLASS}>
                      <WorkspaceRecordBy name={entry.createdByName} />
                    </td>
                  ) : null}
                  {canManageSales ? (
                    <td className={FINANCE_TD_CLASS}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(entry)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => deleteConfirm.requestDelete(entry)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <FinanceTableShell
        title={t("recordSales")}
        onAdd={canManageSales ? openCreate : undefined}
        addLabel={t("add")}
        onRefresh={() => void refresh(true)}
        isRefreshing={false}
        selectedCount={canManageSales ? selectedCount : 0}
        onBulkDelete={canManageSales ? () => setBulkDeleteOpen(true) : undefined}
        bulkDeleting={isBulkDeleting}
      >
        {renderTable()}
      </FinanceTableShell>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("editSale") : t("recordSale")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t("productName")}</Label>
              <Select
                value={productId || "none"}
                onValueChange={(v) => handleProductChange(v === "none" ? "" : v)}
              >
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

            <div className="space-y-2">
              <Label>{t("selectCustomer")}</Label>
              <CustomerSearchSelect
                customers={customers}
                value={clientId}
                onChange={(id, customer) => {
                  setClientId(id);
                  if (customer?.name && !buyerName.trim()) {
                    setBuyerName(customer.name);
                  }
                }}
                placeholder={t("selectCustomer")}
                searchPlaceholder={t("search")}
                noneLabel={t("optional")}
                emptyLabel={t("noCustomersYet")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("buyerName")}</Label>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder={t("buyerNameOptionalHint")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("quantity")}</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("sellingPrice")} (Rwf)</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder={selectedProduct ? String(selectedProduct.sellingPrice ?? 0) : "0"}
                  disabled={!productId}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("saleDate")}</Label>
                <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
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
              <div className="rounded-lg bg-emerald-50/80 px-3 py-2 text-sm text-gray-700">
                <p>
                  {t("unitPrice")}:{" "}
                  <span className="font-medium tabular-nums">
                    {Number.isFinite(unitPrice) ? formatCurrency(unitPrice) : "—"}
                  </span>
                  {selectedProduct.sellingPrice != null &&
                  Number.isFinite(unitPrice) &&
                  unitPrice !== Number(selectedProduct.sellingPrice) ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({t("sellingPrice")}: {formatCurrency(Number(selectedProduct.sellingPrice))})
                    </span>
                  ) : null}
                </p>
                <p className="mt-1">
                  {t("total")}:{" "}
                  <span className="font-semibold text-emerald-700">
                    <CurrencyAmount amount={lineTotal} codeFirst codeClassName="text-emerald-700/70" />
                  </span>
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="cancel"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving || !canManageSales}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={deleteConfirm.handleOpenChange}
        title={t("delete")}
        description={
          deleteConfirm.target
            ? `${deleteConfirm.target.product} · ${deleteConfirm.target.quantity} · ${formatFinanceTableDate(deleteConfirm.target.date)}`
            : ""
        }
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => void handleDeleteConfirm()}
        isDeleting={deleteConfirm.isDeleting}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t("delete")}
        description={t("deleteSelectedDesc").replace("{count}", String(selectedCount))}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => void handleBulkDeleteConfirm()}
        isDeleting={isBulkDeleting}
      />
    </>
  );
}
