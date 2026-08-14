import { useEffect, useState } from "react";
import { BusinessCalendarTab } from "@/components/calendar/BusinessCalendarTab";
import { UpcomingRemindersCard } from "@/components/reminders/UpcomingRemindersCard";
import { corporateCalendarApi } from "@/lib/api";
import type { UpcomingReminderItem } from "@/lib/workReminders";

export function CorporateCalendarOverviewTab() {
  const [reminders, setReminders] = useState<UpcomingReminderItem[]>([]);

  useEffect(() => {
    void corporateCalendarApi
      .getReminders({ days: 7, limit: 12 })
      .then((res) => setReminders(Array.isArray(res.data) ? (res.data as UpcomingReminderItem[]) : []))
      .catch(() => setReminders([]));
  }, []);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <BusinessCalendarTab embedded />
      <UpcomingRemindersCard
        items={reminders}
        title="Reminders"
        subtitle={null}
        className="rounded-none border-0 bg-transparent p-0 shadow-none"
      />
    </div>
  );
}
