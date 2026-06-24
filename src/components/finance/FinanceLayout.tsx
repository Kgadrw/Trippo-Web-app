import { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { financeNavItems } from "@/components/finance/financeNavItems";
import { useTranslation } from "@/hooks/useTranslation";

export function FinanceLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  const pageTitle = useMemo(() => {
    const match = financeNavItems.find((item) => item.to === location.pathname);
    return match ? t(match.labelKey) : t("finance");
  }, [location.pathname, t]);

  return (
    <AppLayout title={pageTitle}>
      <Outlet />
    </AppLayout>
  );
}
