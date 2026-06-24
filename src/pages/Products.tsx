import { AppLayout } from "@/components/layout/AppLayout";
import { ProductsTab } from "@/components/inventory/ProductsTab";
import { useTranslation } from "@/hooks/useTranslation";

export default function Products() {
  const { t } = useTranslation();
  return (
    <AppLayout title={t("products")}>
      <ProductsTab />
    </AppLayout>
  );
}
