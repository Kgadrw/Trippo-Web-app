import { AppLayout } from "@/components/layout/AppLayout";
import { BusinessCalendarTab } from "@/components/calendar/BusinessCalendarTab";
import { useTranslation } from "@/hooks/useTranslation";

export default function BusinessCalendar() {
  const { t } = useTranslation();
  return (
    <AppLayout title={t("businessCalendarTitle")}>
      <div className="-mx-4 -mb-4 flex h-[calc(100dvh-9rem)] max-h-[calc(100dvh-9rem)] min-h-0 flex-col overflow-hidden lg:-mx-6 lg:-mb-6 lg:h-[calc(100dvh-3.5rem)] lg:max-h-[calc(100dvh-3.5rem)]">
        <BusinessCalendarTab />
      </div>
    </AppLayout>
  );
}
