import { AppLayout } from "@/components/layout/AppLayout";
import { SalesTab } from "@/components/sales/SalesTab";
import { useTranslation } from "@/hooks/useTranslation";

export default function Sales() {
  const { t } = useTranslation();
  return (
    <AppLayout title={t("recordSales")}>
      <SalesTab />
    </AppLayout>
  );
}
