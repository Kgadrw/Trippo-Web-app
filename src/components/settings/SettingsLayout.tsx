import { Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/hooks/useTranslation";

export function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <AppLayout title={t("settings")}>
      <div className="flex flex-col min-h-0 pb-4">
        <div className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </div>
      </div>
    </AppLayout>
  );
}
