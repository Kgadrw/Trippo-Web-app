import { BusinessCalendarTab } from "@/components/calendar/BusinessCalendarTab";

export default function BusinessCalendar() {
  return (
    <div className="-mx-4 -mb-4 flex h-[calc(100dvh-9rem)] max-h-[calc(100dvh-9rem)] min-h-0 flex-col overflow-hidden lg:-mx-6 lg:-mb-6 lg:h-[calc(100dvh-3.5rem)] lg:max-h-[calc(100dvh-3.5rem)]">
      <BusinessCalendarTab />
    </div>
  );
}
