import { useCallback, useEffect, useMemo, useState } from "react";
import { crmApi } from "@/lib/api";
import {
  QUOTE_STATUSES,
  quoteStatusLabel,
  type CrmContactRecord,
  type QuoteLineItem,
  type QuoteRecord,
} from "@/lib/crmWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { usePageSearch } from "@/hooks/usePageSearch";
import { filterByPageSearch } from "@/lib/pageSearch";
import { HelpTip } from "@/components/ui/help-tip";
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
import { formatCurrency } from "@/lib/currency";
import { formatFinanceTableDate, FINANCE_TD_CLASS, FINANCE_TH_CLASS, FinanceTableLoading, FinanceTableShell } from "@/components/finance/financeTable";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterSelectClass } from "@/lib/fieldStyles";

function emptyLineItem(): QuoteLineItem {
  return { description: "", quantity: 1, unitPrice: 0, amount: 0 };
}

export function CrmQuotesTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { query: pageSearchQuery } = usePageSearch();
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([emptyLineItem(), emptyLineItem()]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [quotesRes, contactsRes] = await Promise.all([
        crmApi.getQuotes(statusFilter !== "all" ? { status: statusFilter } : undefined),
        crmApi.getContacts(),
      ]);
      setQuotes((quotesRes.data as QuoteRecord[]) || []);
      setContacts((contactsRes.data as CrmContactRecord[]) || []);
    } catch {
      toast({ title: t("crmLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(
    () =>
      filterByPageSearch(quotes, pageSearchQuery, (q) => [
        q.title,
        q.quoteNumber,
        q.clientName,
        q.status,
      ]),
    [quotes, pageSearchQuery],
  );

  const updateLineItem = (index: number, field: keyof QuoteLineItem, value: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      if (field === "description") row.description = value;
      else {
        const num = Number(value) || 0;
        if (field === "quantity") row.quantity = num;
        if (field === "unitPrice") row.unitPrice = num;
        row.amount = (field === "quantity" ? num : row.quantity) * (field === "unitPrice" ? num : row.unitPrice);
      }
      next[index] = row;
      return next;
    });
  };

  const totalAmount = lineItems.reduce((sum, row) => sum + (row.amount || 0), 0);

  const handleCreate = async () => {
    if (!title.trim() || !clientId) return;
    const items = lineItems.filter((row) => row.description.trim());
    if (!items.length) {
      toast({ title: t("crmQuoteLinesRequired"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await crmApi.createQuote({
        title: title.trim(),
        clientId,
        validUntil: validUntil || undefined,
        lineItems: items,
      });
      setDialogOpen(false);
      setTitle("");
      setClientId("");
      setValidUntil("");
      setLineItems([emptyLineItem(), emptyLineItem()]);
      void loadData();
      toast({ title: t("crmQuoteCreated") });
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const markSent = async (quote: QuoteRecord) => {
    try {
      await crmApi.updateQuote(quote._id, { status: "sent" });
      void loadData();
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    }
  };

  const convertQuote = async (quote: QuoteRecord) => {
    try {
      await crmApi.convertQuoteToInvoice(quote._id);
      toast({ title: t("crmQuoteConverted") });
      void loadData();
    } catch {
      toast({ title: t("crmSaveFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("crmQuotesTitle")}</h2>
            <HelpTip text={t("helpCrmQuotes")} />
          </div>
          <p className="text-sm text-gray-500">{t("crmQuotesSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn(filterSelectClass, "w-[150px]")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("crmAllStatuses")}</SelectItem>
              {QUOTE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{quoteStatusLabel(s, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("crmAddQuote")}
          </Button>
        </div>
      </div>

      <FinanceTableShell>
        {loading ? (
          <FinanceTableLoading />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">{t("crmNoQuotes")}</div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className={FINANCE_TH_CLASS}>{t("crmQuoteNumber")}</th>
                <th className={FINANCE_TH_CLASS}>{t("customer")}</th>
                <th className={FINANCE_TH_CLASS}>{t("crmQuoteStatus")}</th>
                <th className={FINANCE_TH_CLASS}>{t("crmQuoteAmount")}</th>
                <th className={FINANCE_TH_CLASS} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((quote) => (
                <tr key={quote._id} className="border-b border-gray-100">
                  <td className={FINANCE_TD_CLASS}>
                    <p className="font-medium text-gray-900">{quote.quoteNumber}</p>
                    <p className="text-xs text-gray-500">{quote.title}</p>
                  </td>
                  <td className={FINANCE_TD_CLASS}>{quote.clientName || "—"}</td>
                  <td className={FINANCE_TD_CLASS}>{quoteStatusLabel(quote.status || "draft", t)}</td>
                  <td className={FINANCE_TD_CLASS}>{formatCurrency(quote.amount)}</td>
                  <td className={cn(FINANCE_TD_CLASS, "text-right space-x-2")}>
                    {quote.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => void markSent(quote)}>
                        {t("crmMarkSent")}
                      </Button>
                    )}
                    {(quote.status === "sent" || quote.status === "accepted") && !quote.convertedInvoiceId && (
                      <Button size="sm" variant="outline" onClick={() => void convertQuote(quote)}>
                        {t("crmConvertToInvoice")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FinanceTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("crmAddQuote")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("crmQuoteTitle")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("customer")}</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder={t("selectCustomer")} /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("crmValidUntil")}</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t("crmLineItems")}</Label>
              <div className="mt-2 space-y-2">
                {lineItems.map((row, index) => (
                  <div key={index} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2">
                    <Input
                      placeholder={t("description")}
                      value={row.description}
                      onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    />
                    <Input type="number" min="0" value={row.quantity} onChange={(e) => updateLineItem(index, "quantity", e.target.value)} />
                    <Input type="number" min="0" value={row.unitPrice} onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)} />
                    <Input readOnly value={row.amount} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLineItems((p) => p.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setLineItems((p) => [...p, emptyLineItem()])}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t("crmAddLine")}
                </Button>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">{t("crmQuoteAmount")}: {formatCurrency(totalAmount)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
