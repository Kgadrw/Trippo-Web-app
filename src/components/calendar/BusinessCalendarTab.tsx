import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  filterSelectClass,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HelpTip } from "@/components/ui/help-tip";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { calendarEventApi, scheduleApi, saleApi, incomeApi, expenseApi, billApi, taxApi, invoiceApi, payrollApi, bankDepositApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { periodToggleClass } from "@/lib/fieldStyles";
import {
  CALENDAR_EVENT_TYPE_LABEL_KEYS,
  CALENDAR_EVENT_TYPES,
  CalendarEventRecord,
  CalendarEventType,
  getEventColor,
  normalizeEventType,
} from "@/lib/calendarEventTypes";
import {
  CalendarViewMode,
  combineDateAndTime,
  endOfDay,
  eventOccursOnDay,
  formatEventTime,
  getMonthGrid,
  getMonthLabel,
  getViewRange,
  getPlatformActivityRange,
  getViewTitle,
  getWeekDays,
  getWeekdayLabels,
  getYearMonthGrid,
  isSameDay,
  shiftViewDate,
  startOfDay,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/calendarUtils";
import { AUTOMATION_TYPE_LABEL_KEYS, normalizeAutomationType } from "@/lib/automationTypes";
import {
  buildAutomationItems,
  buildFilteredDisplayItems,
  buildPlatformCalendarItems,
  CalendarDisplayItem,
  formatCalendarAmount,
  itemsForDay,
  PLATFORM_SOURCE_COLORS,
  PLATFORM_SOURCE_LABEL_KEYS,
  PlatformRawData,
} from "@/lib/calendarPlatformItems";
import { Skeleton } from "@/components/ui/skeleton";

function asRows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

function filterRowsInRange(
  rows: Record<string, unknown>[],
  start: Date,
  end: Date,
  ...dateKeys: string[]
) {
  return rows.filter((row) => {
    const raw = dateKeys.map((k) => row[k]).find((v) => typeof v === "string" && v);
    if (!raw) return false;
    const d = new Date(String(raw));
    return d >= start && d <= end;
  });
}

interface ScheduleItem {
  _id?: string;
  title: string;
  dueDate: string;
  status?: string;
  automationType?: string;
}

type EventFormState = {
  title: string;
  description: string;
  eventType: CalendarEventType;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  status: "scheduled" | "completed" | "cancelled";
  reminderMinutes: string;
};

const EMPTY_FORM: EventFormState = {
  title: "",
  description: "",
  eventType: "event",
  date: toDateInputValue(new Date()),
  startTime: "09:00",
  endTime: "10:00",
  allDay: false,
  location: "",
  status: "scheduled",
  reminderMinutes: "0",
};

const GRID_TABLE_CLASS =
  "grid grid-cols-7 divide-x divide-y divide-gray-300";
const HEADER_CELL_CLASS =
  "py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500";

const EMPTY_PLATFORM: PlatformRawData = {
  sales: [],
  incomes: [],
  expenses: [],
  bills: [],
  taxes: [],
  invoices: [],
  payrolls: [],
  deposits: [],
};

function eventId(event: CalendarEventRecord) {
  return String(event._id ?? event.id ?? "");
}

export function BusinessCalendarTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [platformRaw, setPlatformRaw] = useState<PlatformRawData>(EMPTY_PLATFORM);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPlatform, setLoadingPlatform] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventRecord | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEventRecord | null>(null);

  const monthCells = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekDays = useMemo(() => getWeekDays(selectedDay), [selectedDay]);
  const weekdayLabels = getWeekdayLabels();
  const viewTitle = getViewTitle(viewMode, selectedDay, viewYear, viewMonth);

  const viewRange = useMemo(
    () => getViewRange(viewMode, selectedDay, viewYear, viewMonth),
    [
      viewMode,
      viewYear,
      viewMonth,
      viewMode === "day" || viewMode === "week"
        ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`
        : "static",
    ],
  );

  const platformRange = useMemo(
    () => getPlatformActivityRange(viewMode, selectedDay, viewYear, viewMonth),
    [
      viewMode,
      viewYear,
      viewMonth,
      viewMode === "day" || viewMode === "week"
        ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`
        : "static",
    ],
  );

  const loadCalendarData = useCallback(async () => {
    const showBlockingLoader = !hasLoadedOnceRef.current;
    if (showBlockingLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const { start, end } = viewRange;
      const dateParams = {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(end),
      };

      const [eventsRes, schedulesRes] = await Promise.all([
        calendarEventApi.getAll({ start: start.toISOString(), end: end.toISOString() }),
        scheduleApi.getAll(),
      ]);

      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
    } catch (error) {
      console.error("Failed to load calendar:", error);
      toast({
        title: t("error"),
        description: t("calLoadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedOnceRef.current = true;
    }

    if (typeFilter !== "all") {
      setPlatformRaw(EMPTY_PLATFORM);
      setLoadingPlatform(false);
      return;
    }

    setLoadingPlatform(true);
    try {
      const { start, end } = platformRange;
      const dateParams = {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(end),
      };

      const [
        salesRes,
        incomesRes,
        expensesRes,
        billsRes,
        taxesRes,
        invoicesRes,
        payrollsRes,
        depositsRes,
      ] = await Promise.all([
        saleApi.getAll({ startDate: dateParams.startDate, endDate: dateParams.endDate }),
        incomeApi.getAll(dateParams),
        expenseApi.getAll(dateParams),
        billApi.getAll(dateParams),
        taxApi.getAll(dateParams),
        invoiceApi.getAll(),
        payrollApi.getAll(dateParams),
        bankDepositApi.getAll(dateParams),
      ]);

      setPlatformRaw({
        sales: asRows(salesRes.data),
        incomes: asRows(incomesRes.data),
        expenses: asRows(expensesRes.data),
        bills: asRows(billsRes.data),
        taxes: asRows(taxesRes.data),
        invoices: filterRowsInRange(asRows(invoicesRes.data), start, end, "dueDate", "issueDate", "paidAt"),
        payrolls: asRows(payrollsRes.data),
        deposits: asRows(depositsRes.data),
      });
    } catch (error) {
      console.error("Failed to load platform calendar items:", error);
    } finally {
      setLoadingPlatform(false);
    }
  }, [viewRange, platformRange, typeFilter, t, toast]);

  useEffect(() => {
    void loadCalendarData();
  }, [loadCalendarData]);

  const platformItems = useMemo(
    () => buildPlatformCalendarItems(platformRaw),
    [platformRaw],
  );

  const automationItems = useMemo(
    () => buildAutomationItems(schedules),
    [schedules],
  );

  const displayItems = useMemo(
    () => buildFilteredDisplayItems(typeFilter, events, platformItems, automationItems),
    [typeFilter, events, platformItems, automationItems],
  );

  const displayItemsForDay = useCallback(
    (day: Date) => itemsForDay(displayItems, day),
    [displayItems],
  );

  const selectedDayItems = useMemo(
    () => displayItemsForDay(selectedDay),
    [displayItemsForDay, selectedDay],
  );

  const goPrev = () => {
    const next = shiftViewDate(viewMode, selectedDay, viewYear, viewMonth, -1);
    setSelectedDay(next.selectedDay);
    setViewYear(next.viewYear);
    setViewMonth(next.viewMonth);
  };

  const goNext = () => {
    const next = shiftViewDate(viewMode, selectedDay, viewYear, viewMonth, 1);
    setSelectedDay(next.selectedDay);
    setViewYear(next.viewYear);
    setViewMonth(next.viewMonth);
  };

  const goToToday = () => {
    const now = startOfDay(new Date());
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDay(now);
  };

  const handleViewModeChange = (mode: CalendarViewMode) => {
    setViewMode(mode);
    if (mode === "month" || mode === "day" || mode === "week") {
      setViewYear(selectedDay.getFullYear());
      setViewMonth(selectedDay.getMonth());
    } else if (mode === "year") {
      setViewYear(selectedDay.getFullYear());
    }
  };

  const selectDay = (day: Date) => {
    const normalized = startOfDay(day);
    setSelectedDay(normalized);
    if (viewMode === "month") {
      const inCurrentMonth =
        normalized.getMonth() === viewMonth && normalized.getFullYear() === viewYear;
      if (!inCurrentMonth) {
        setViewYear(normalized.getFullYear());
        setViewMonth(normalized.getMonth());
      }
      return;
    }
    setViewYear(normalized.getFullYear());
    setViewMonth(normalized.getMonth());
  };

  const openMonthFromYear = (month: number) => {
    setViewMonth(month);
    setViewYear(viewYear);
    setSelectedDay(startOfDay(new Date(viewYear, month, 1)));
    setViewMode("month");
  };

  const openCreateModal = (day?: Date) => {
    const target = day ? startOfDay(day) : selectedDay;
    setEditingEvent(null);
    setForm({
      ...EMPTY_FORM,
      date: toDateInputValue(target),
    });
    setModalOpen(true);
  };

  const openEditModal = (event: CalendarEventRecord) => {
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : null;
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || "",
      eventType: normalizeEventType(event.eventType),
      date: toDateInputValue(start),
      startTime: event.allDay ? "09:00" : toTimeInputValue(start),
      endTime: end && !event.allDay ? toTimeInputValue(end) : "10:00",
      allDay: Boolean(event.allDay),
      location: event.location || "",
      status: event.status || "scheduled",
      reminderMinutes: String(event.reminderMinutes ?? 0),
    });
    setModalOpen(true);
  };

  const buildPayload = () => {
    const startDate = form.allDay
      ? combineDateAndTime(form.date, "00:00")
      : combineDateAndTime(form.date, form.startTime);

    let endDate: Date | undefined;
    if (form.allDay) {
      endDate = endOfDay(combineDateAndTime(form.date, "00:00"));
    } else if (form.endTime) {
      endDate = combineDateAndTime(form.date, form.endTime);
    }

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      eventType: form.eventType,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      allDay: form.allDay,
      location: form.location.trim(),
      status: form.status,
      reminderMinutes: Number(form.reminderMinutes) || 0,
    };
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: t("error"), description: t("calTitleRequired"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingEvent) {
        await calendarEventApi.update(eventId(editingEvent), payload);
        toast({ title: t("success"), description: t("calEventUpdated") });
      } else {
        await calendarEventApi.create(payload);
        toast({ title: t("success"), description: t("calEventCreated") });
      }
      setModalOpen(false);
      await loadCalendarData();
    } catch (error) {
      console.error("Save calendar event failed:", error);
      toast({ title: t("error"), description: t("calSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const item = deleteTarget;
    if (!item) return;
    const id = eventId(item);
    setDeleteTarget(null);
    setEvents((prev) => prev.filter((e) => eventId(e) !== id));
    try {
      await calendarEventApi.delete(id);
      toast({ title: t("success"), description: t("calEventDeleted") });
    } catch (error) {
      setEvents((prev) => [...prev, item]);
      console.error("Delete calendar event failed:", error);
      toast({ title: t("error"), description: t("calDeleteFailed"), variant: "destructive" });
    }
  };

  const markCompleted = async (event: CalendarEventRecord) => {
    try {
      await calendarEventApi.update(eventId(event), { status: "completed" });
      toast({ title: t("success"), description: t("calEventCompleted") });
      await loadCalendarData();
    } catch {
      toast({ title: t("error"), description: t("calSaveFailed"), variant: "destructive" });
    }
  };

  const renderDayCellContent = (
    day: Date,
    options: { inCurrentMonth?: boolean; compact?: boolean; minHeight?: string },
  ) => {
    const { inCurrentMonth = true, compact = false, minHeight = "min-h-[64px]" } = options;
    const isSelected = isSameDay(day, selectedDay);
    const isToday = isSameDay(day, today);
    const dayItems = displayItemsForDay(day);
    const totalItems = dayItems.length;
    const maxVisible = compact ? 1 : 2;

    return (
      <button
        key={day.toISOString()}
        type="button"
        onClick={() => selectDay(day)}
        onDoubleClick={() => openCreateModal(day)}
        className={cn(
          minHeight,
          "w-full text-left transition-colors",
          compact ? "p-1" : "p-1.5",
          inCurrentMonth ? "bg-white" : "text-gray-400",
          isSelected && "bg-sky-50",
          !isSelected && "hover:bg-gray-50/80",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-medium",
            compact ? "h-5 w-5 text-[11px]" : "h-6 w-6 text-xs",
            isToday && "bg-sky-500 text-white",
            !isToday && inCurrentMonth && "text-gray-900",
          )}
        >
          {day.getDate()}
        </span>
        <div className="mt-1 space-y-0.5">
          {dayItems.slice(0, maxVisible).map((item) => (
            <div
              key={item.id}
              className={cn(
                "truncate rounded px-1 py-0.5 font-medium text-white",
                compact ? "text-[8px]" : "text-[10px]",
              )}
              style={{ backgroundColor: item.color }}
              title={item.title}
            >
              {item.title}
            </div>
          ))}
          {totalItems > maxVisible && (
            <div className={cn("text-gray-500", compact ? "text-[8px]" : "text-[10px]")}>
              +{totalItems - maxVisible}
            </div>
          )}
        </div>
      </button>
    );
  };

  const sourceLabel = (item: CalendarDisplayItem) => {
    if (item.source === "event" && item.calendarEvent) {
      return t(CALENDAR_EVENT_TYPE_LABEL_KEYS[normalizeEventType(item.calendarEvent.eventType)] as any);
    }
    if (item.source === "automation" && item.subtitle) {
      return t(AUTOMATION_TYPE_LABEL_KEYS[normalizeAutomationType(item.subtitle)] as any);
    }
    return t(PLATFORM_SOURCE_LABEL_KEYS[item.source] as any);
  };

  const renderDisplayItem = (item: CalendarDisplayItem) => {
    const event = item.calendarEvent;

    return (
      <div key={item.id} className="border-b border-gray-100 py-4 last:border-b-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium" style={{ color: item.color }}>
              {sourceLabel(item)}
            </p>
            <p className="truncate font-medium text-gray-900">{item.title}</p>
            <p className="text-xs text-gray-500">
              {item.amount != null && formatCalendarAmount(item.amount)}
              {item.subtitle && item.source !== "automation" && item.source !== "event"
                ? ` · ${item.subtitle}`
                : ""}
              {event?.status === "completed" && ` · ${t("calCompleted")}`}
              {event?.status === "cancelled" && ` · ${t("calCancelled")}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            {item.editable && event && event.status === "scheduled" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => void markCompleted(event)}
                title={t("calMarkComplete")}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </Button>
            )}
            {item.editable && event && (
              <>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(event)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDeleteTarget(event)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </>
            )}
            {!item.editable && item.link && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-600"
                onClick={() => navigate(item.link!)}
              >
                {t("calViewItem")}
              </Button>
            )}
          </div>
        </div>
        {event && (
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatEventTime(event)}
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </div>
            )}
            {event.description && <p className="pt-1 text-gray-500">{event.description}</p>}
          </div>
        )}
      </div>
    );
  };

  const renderEventsList = ({ fullHeight = false }: { fullHeight?: boolean } = {}) => {
    if (selectedDayItems.length === 0 && !loadingPlatform && !refreshing) {
      return (
        <p
          className={cn(
            "py-8 text-center text-sm text-gray-500",
            fullHeight && "flex min-h-0 flex-1 items-center justify-center",
          )}
        >
          {t("calNoEventsDay")}
        </p>
      );
    }

    const sorted = [...selectedDayItems].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return (
      <>
        {refreshing && typeFilter === "all" && (
          <p className="mb-2 text-center text-xs text-gray-400">{t("calLoadingActivity")}</p>
        )}
        {loadingPlatform && typeFilter === "all" && !refreshing && sorted.length === 0 && (
          <p className="text-center text-xs text-gray-400">{t("calLoadingActivity")}</p>
        )}
        {sorted.map(renderDisplayItem)}
      </>
    );
  };

  const renderMonthView = () => (
    <div className={GRID_TABLE_CLASS}>
      {weekdayLabels.map((label) => (
        <div key={label} className={HEADER_CELL_CLASS}>
          {label}
        </div>
      ))}
      {monthCells.map((day) =>
        renderDayCellContent(day, {
          inCurrentMonth: day.getMonth() === viewMonth,
          compact: true,
          minHeight: "min-h-[58px]",
        }),
      )}
    </div>
  );

  const renderWeekView = () => (
    <div className={GRID_TABLE_CLASS}>
      {weekDays.map((day) => (
        <div key={day.toISOString()} className={cn(HEADER_CELL_CLASS, "py-2.5")}>
          <div className="text-[10px]">{weekdayLabels[day.getDay()]}</div>
          <div
            className={cn(
              "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
              isSameDay(day, today) && "bg-sky-500 text-white",
              !isSameDay(day, today) && "text-gray-900",
            )}
          >
            {day.getDate()}
          </div>
        </div>
      ))}
      {weekDays.map((day) =>
        renderDayCellContent(day, { minHeight: "min-h-[140px]" }),
      )}
    </div>
  );

  const renderDayView = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
        <Button type="button" variant="ghost" size="icon" onClick={goPrev} aria-label="Previous day">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 space-y-1.5 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t("calSelectedDay")}</p>
          <h3 className="truncate text-base font-semibold text-gray-900">{viewTitle}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={goNext} aria-label="Next day">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button type="button" size="sm" className="bg-sky-500 hover:bg-sky-600" onClick={() => openCreateModal(selectedDay)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {renderEventsList({ fullHeight: true })}
      </div>
    </div>
  );

  const renderYearView = () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, month) => {
        const monthCellsYear = getYearMonthGrid(viewYear, month);
        const monthLabel = getMonthLabel(viewYear, month);
        const isCurrentMonth = month === today.getMonth() && viewYear === today.getFullYear();

        return (
          <div key={month} className={cn(isCurrentMonth && "text-sky-700")}>
            <button
              type="button"
              onClick={() => openMonthFromYear(month)}
              className="mb-2 w-full px-1 py-1 text-left text-sm font-semibold text-gray-900 hover:text-sky-600"
            >
              {monthLabel}
            </button>
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-300">
              {weekdayLabels.map((label) => (
                <div
                  key={`${month}-${label}`}
                  className="py-0.5 text-center text-[8px] font-medium uppercase text-gray-400"
                >
                  {label.charAt(0)}
                </div>
              ))}
              {monthCellsYear.map((day, idx) =>
                day ? (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      selectDay(day);
                      setViewMode("day");
                    }}
                    className={cn(
                      "relative min-h-[22px] p-0.5 text-[9px] hover:bg-sky-50",
                      isSameDay(day, today) && "bg-sky-100 font-bold text-sky-700",
                      isSameDay(day, selectedDay) && "bg-sky-50",
                    )}
                  >
                    {day.getDate()}
                    {displayItemsForDay(day).length > 0 && (
                      <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-500" />
                    )}
                  </button>
                ) : (
                  <div key={`empty-${month}-${idx}`} className="min-h-[22px]" />
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCalendarBody = () => {
    if (loading && !hasLoadedOnceRef.current) {
      if (viewMode === "year") {
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        );
      }
      return (
        <div className={GRID_TABLE_CLASS}>
          {Array.from({ length: viewMode === "week" ? 14 : 49 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("rounded-none", viewMode === "month" ? "min-h-[58px]" : "min-h-[88px]")}
            />
          ))}
        </div>
      );
    }

    switch (viewMode) {
      case "day":
        return renderDayView();
      case "week":
        return renderWeekView();
      case "year":
        return renderYearView();
      case "month":
      default:
        return renderMonthView();
    }
  };

  const showSidePanel = viewMode !== "day";
  const isDayView = viewMode === "day";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 lg:px-6 lg:pb-6">
      <div className="mb-4 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-gray-900">{t("businessCalendarTitle")}</h2>
            <HelpTip text={t("helpCalendar")} />
          </div>
          <p className="text-sm text-gray-500">{t("businessCalendarSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && handleViewModeChange(v as CalendarViewMode)}
            className="flex flex-wrap gap-1.5"
          >
            <ToggleGroupItem value="day" className={periodToggleClass}>
              {t("calViewDay")}
            </ToggleGroupItem>
            <ToggleGroupItem value="week" className={periodToggleClass}>
              {t("calViewWeek")}
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className={periodToggleClass}>
              {t("calViewMonth")}
            </ToggleGroupItem>
            <ToggleGroupItem value="year" className={periodToggleClass}>
              {t("calViewYear")}
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:border-l sm:border-gray-200 sm:pl-5">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger
              className={cn(
                "h-auto w-auto min-w-0 gap-1 border-0 bg-transparent p-0 shadow-none",
                "text-sm font-medium text-gray-600 hover:text-gray-900",
                "focus:border-0 focus:ring-0 focus:ring-offset-0",
              )}
            >
              <SelectValue placeholder={t("calAllTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("calAllTypes")}</SelectItem>
              {CALENDAR_EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(CALENDAR_EVENT_TYPE_LABEL_KEYS[type] as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={goToToday}>
            {t("calToday")}
          </Button>
          <Button type="button" size="sm" className="bg-sky-500 hover:bg-sky-600" onClick={() => openCreateModal()}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("calAddEvent")}
          </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          isDayView
            ? "flex flex-col"
            : viewMode === "month"
              ? "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-1 lg:gap-8"
              : "grid min-h-0 grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-1 lg:gap-8",
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-y-auto overscroll-y-contain",
            isDayView && "flex flex-1 flex-col overflow-hidden",
            showSidePanel && "lg:pr-1",
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {viewMode !== "day" && (
            <div className="mb-4 flex items-center justify-between">
              <Button type="button" variant="ghost" size="icon" onClick={goPrev} aria-label="Previous">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-base font-semibold text-gray-900">{viewTitle}</h3>
              <Button type="button" variant="ghost" size="icon" onClick={goNext} aria-label="Next">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
          {renderCalendarBody()}
          {viewMode !== "day" && viewMode !== "year" && (
            <div className="mt-4 flex flex-wrap gap-3">
              {typeFilter === "all" ? (
                (Object.keys(PLATFORM_SOURCE_COLORS) as Array<keyof typeof PLATFORM_SOURCE_COLORS>).map((source) => (
                  <div key={source} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PLATFORM_SOURCE_COLORS[source] }}
                    />
                    {t(PLATFORM_SOURCE_LABEL_KEYS[source] as any)}
                  </div>
                ))
              ) : (
                CALENDAR_EVENT_TYPES.slice(0, 5).map((type) => (
                  <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getEventColor({ eventType: type }) }}
                    />
                    {t(CALENDAR_EVENT_TYPE_LABEL_KEYS[type] as any)}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {showSidePanel && (
          <div className="flex min-h-0 flex-col overflow-hidden border-t border-gray-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="mb-3 flex shrink-0 items-start justify-between gap-4 lg:mb-4">
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t("calSelectedDay")}</p>
                <h3 className="text-base font-semibold text-gray-900">
                  {selectedDay.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
              </div>
              <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => openCreateModal(selectedDay)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div
              className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {renderEventsList({ fullHeight: true })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? t("calEditEvent") : t("calAddEvent")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="cal-title">{t("calEventTitle")}</Label>
              <Input
                id="cal-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("calEventTitlePlaceholder")}
              />
            </div>
            <div>
              <Label>{t("calEventType")}</Label>
              <Select
                value={form.eventType}
                onValueChange={(v) => setForm((f) => ({ ...f, eventType: v as CalendarEventType }))}
              >
                <SelectTrigger className={filterSelectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(CALENDAR_EVENT_TYPE_LABEL_KEYS[type] as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cal-date">{t("calEventDate")}</Label>
              <Input
                id="cal-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cal-allday"
                checked={form.allDay}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, allDay: Boolean(checked) }))}
              />
              <Label htmlFor="cal-allday" className="cursor-pointer font-normal">
                {t("calAllDay")}
              </Label>
            </div>
            {!form.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cal-start">{t("calStartTime")}</Label>
                  <Input
                    id="cal-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="cal-end">{t("calEndTime")}</Label>
                  <Input
                    id="cal-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="cal-location">{t("calLocation")}</Label>
              <Input
                id="cal-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder={t("calLocationPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="cal-desc">{t("calDescription")}</Label>
              <Textarea
                id="cal-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("calStatus")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as EventFormState["status"] }))}
                >
                  <SelectTrigger className={filterSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">{t("calStatusScheduled")}</SelectItem>
                    <SelectItem value="completed">{t("calCompleted")}</SelectItem>
                    <SelectItem value="cancelled">{t("calCancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("calReminder")}</Label>
                <Select
                  value={form.reminderMinutes}
                  onValueChange={(v) => setForm((f) => ({ ...f, reminderMinutes: v }))}
                >
                  <SelectTrigger className={filterSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("calReminderNone")}</SelectItem>
                    <SelectItem value="15">{t("calReminder15")}</SelectItem>
                    <SelectItem value="60">{t("calReminder60")}</SelectItem>
                    <SelectItem value="1440">{t("calReminderDay")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="bg-sky-500 hover:bg-sky-600"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? t("saving") : editingEvent ? t("save") : t("calAddEvent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("calDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("calDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-red-600 hover:bg-red-700">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
