import { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { teamNavItems } from "@/components/team/teamNavItems";
import { useTranslation } from "@/hooks/useTranslation";

export function TeamLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  const pageTitle = useMemo(() => {
    const exact = teamNavItems.find((item) => item.to === location.pathname);
    if (exact) return t(exact.labelKey);
    const prefix = teamNavItems.find(
      (item) => item.to !== "/team" && location.pathname.startsWith(item.to),
    );
    return prefix ? t(prefix.labelKey) : t("team");
  }, [location.pathname, t]);

  return (
    <AppLayout title={pageTitle}>
      <Outlet />
    </AppLayout>
  );
}
