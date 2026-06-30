import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { documentApi } from "@/lib/api";
import { registryStatusLabel, registryTypeLabel, type DocumentsSummary } from "@/lib/documentWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { HelpTip } from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function DocumentsOverviewTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DocumentsSummary | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentApi.getSummary();
      setSummary((res.data as DocumentsSummary) || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  const stats = summary || {
    totalDocuments: 0,
    byType: { general: 0, contract: 0, policy: 0, template: 0 },
    byStatus: { draft: 0, active: 0, archived: 0, expired: 0 },
    expiringSoon: 0,
    signedCount: 0,
    sharedCount: 0,
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("docOverviewTitle")}</h2>
            <HelpTip text={t("helpDocuments")} />
          </div>
          <p className="text-sm text-gray-500">{t("docOverviewSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/documents/registry">{t("docOpenRegistry")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/documents/archive">{t("docOpenArchive")}</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("docTotalDocuments")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("docTypeContract")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.byType.contract}</p>
          <p className="text-xs text-gray-500">{stats.byType.policy} {t("docTypePolicy").toLowerCase()}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("docExpiringSoon")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.expiringSoon}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("docSignedCount")}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.signedCount}</p>
          <p className="text-xs text-gray-500">{stats.sharedCount} {t("docSharedCount").toLowerCase()}</p>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">{t("docRegistryStatus")}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {(["draft", "active", "archived", "expired"] as const).map((status) => (
            <div key={status} className="rounded-md bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">{registryStatusLabel(status, t)}</p>
              <p className="text-lg font-semibold text-gray-900">{stats.byStatus[status]}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
