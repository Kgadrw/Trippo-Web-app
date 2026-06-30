import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { crmApi } from "@/lib/api";
import {
  LIFECYCLE_STAGES,
  OPEN_DEAL_STAGES,
  dealStageLabel,
  lifecycleLabel,
  type CrmSummary,
} from "@/lib/crmWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CrmOverviewTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CrmSummary | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.getSummary();
      setSummary((res.data as CrmSummary) || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const funnelData = useMemo(
    () =>
      LIFECYCLE_STAGES.map((stage) => ({
        label: lifecycleLabel(stage, t),
        value: summary?.funnel?.[stage] ?? 0,
      })),
    [summary, t],
  );

  const pipelineData = useMemo(
    () =>
      OPEN_DEAL_STAGES.map((stage) => ({
        label: dealStageLabel(stage, t),
        count: summary?.pipeline?.[stage]?.count ?? 0,
        value: summary?.pipeline?.[stage]?.value ?? 0,
      })),
    [summary, t],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  const stats = summary || {
    totalContacts: 0,
    funnel: { lead: 0, prospect: 0, customer: 0, inactive: 0 },
    openPipelineValue: 0,
    activeContracts: 0,
    pendingQuoteValue: 0,
    quotesByStatus: {},
    recentActivities: [],
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("crmOverviewTitle")}</h2>
            <HelpTip text={t("helpCrmOverview")} />
          </div>
          <p className="text-sm text-gray-500">{t("crmOverviewSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/crm/pipeline">{t("crmOpenPipeline")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/crm/contacts">{t("crmOpenContacts")}</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("crmTotalContacts")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.totalContacts}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("crmOpenPipeline")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(stats.openPipelineValue)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("crmPendingQuotes")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(stats.pendingQuoteValue)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("crmActiveContracts")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.activeContracts}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">{t("crmLeadFunnel")}</h3>
          <p className="text-xs text-gray-500">{t("crmLeadFunnelHint")}</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900">{t("crmPipelineByStage")}</h3>
          <p className="text-xs text-gray-500">{t("crmPipelineByStageHint")}</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value, name) => [name === "value" ? formatCurrency(Number(value)) : value, name === "value" ? t("crmDealValue") : t("crmDealCount")]} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-5">
        <p className="text-sm font-medium text-gray-800">{t("crmOmnichannelTitle")}</p>
        <p className="mt-1 text-sm text-gray-600">{t("crmOmnichannelBody")}</p>
      </section>
    </div>
  );
}
