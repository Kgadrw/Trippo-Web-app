import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { documentApi } from "@/lib/api";
import {
  REGISTRY_STATUSES,
  REGISTRY_TYPES,
  registryStatusClass,
  registryStatusLabel,
  registryTypeLabel,
  type CompanyDocumentRecord,
} from "@/lib/documentWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { filterSelectClass } from "@/lib/fieldStyles";
import { Loader2, Plus } from "lucide-react";
import { formatFinanceTableDate, FINANCE_TD_CLASS, FINANCE_TH_CLASS, FinanceTableLoading, FinanceTableShell } from "@/components/finance/financeTable";

export function DocumentRegistryTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<CompanyDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentApi.getAll({
        registryType: typeFilter !== "all" ? typeFilter : undefined,
        registryStatus: statusFilter !== "all" ? statusFilter : undefined,
      });
      const rows = ((res.data as CompanyDocumentRecord[]) || []).filter(
        (row) => row.registryType === "contract" || row.registryType === "policy" || typeFilter !== "all",
      );
      setDocuments(rows);
    } catch {
      toast({ title: t("docLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, toast, t]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const registryRows = useMemo(
    () =>
      documents.filter(
        (row) =>
          row.registryType === "contract" ||
          row.registryType === "policy" ||
          typeFilter === "contract" ||
          typeFilter === "policy",
      ),
    [documents, typeFilter],
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("docRegistryTitle")}</h2>
            <HelpTip text={t("helpDocRegistry")} />
          </div>
          <p className="text-sm text-gray-500">{t("docRegistrySubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={cn(filterSelectClass, "w-[140px]")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("docAllTypes")}</SelectItem>
              {REGISTRY_TYPES.filter((v) => v === "contract" || v === "policy").map((value) => (
                <SelectItem key={value} value={value}>{registryTypeLabel(value, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn(filterSelectClass, "w-[140px]")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("docAllStatuses")}</SelectItem>
              {REGISTRY_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>{registryStatusLabel(value, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild size="sm">
            <Link to="/documents/archive"><Plus className="mr-1.5 h-4 w-4" />{t("docUpload")}</Link>
          </Button>
        </div>
      </div>

      <FinanceTableShell>
        {loading ? (
          <FinanceTableLoading />
        ) : registryRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">{t("docRegistryEmpty")}</div>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className={FINANCE_TH_CLASS}>{t("docTitle")}</th>
                <th className={FINANCE_TH_CLASS}>{t("docRegistryType")}</th>
                <th className={FINANCE_TH_CLASS}>{t("docRegistryStatus")}</th>
                <th className={FINANCE_TH_CLASS}>{t("docEffectiveDate")}</th>
                <th className={FINANCE_TH_CLASS}>{t("docExpiryDate")}</th>
              </tr>
            </thead>
            <tbody>
              {registryRows.map((doc) => (
                <tr key={doc._id} className="border-b border-gray-100">
                  <td className={FINANCE_TD_CLASS}>
                    <Link to={`/documents/${doc._id}`} className="font-medium text-sky-700 hover:underline">
                      {doc.title}
                    </Link>
                  </td>
                  <td className={FINANCE_TD_CLASS}>{registryTypeLabel(doc.registryType || "general", t)}</td>
                  <td className={FINANCE_TD_CLASS}>
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", registryStatusClass(doc.registryStatus || "draft"))}>
                      {registryStatusLabel(doc.registryStatus || "draft", t)}
                    </span>
                  </td>
                  <td className={FINANCE_TD_CLASS}>{doc.effectiveDate ? formatFinanceTableDate(doc.effectiveDate) : "—"}</td>
                  <td className={FINANCE_TD_CLASS}>{doc.expiryDate ? formatFinanceTableDate(doc.expiryDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FinanceTableShell>
    </div>
  );
}
