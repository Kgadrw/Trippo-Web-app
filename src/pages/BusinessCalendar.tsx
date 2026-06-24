import { AppLayout } from "@/components/layout/AppLayout";
import { BusinessCalendarTab } from "@/components/calendar/BusinessCalendarTab";
import { useTranslation } from "@/hooks/useTranslation";

export default function BusinessCalendar() {
  const { t } = useTranslation();
  return (
    <AppLayout title={t("businessCalendarTitle")}>
      <BusinessCalendarTab />
    </AppLayout>
  );
}
