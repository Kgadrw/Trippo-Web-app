export type CalendarEventType =
  | "meeting"
  | "activity"
  | "appointment"
  | "deadline"
  | "event"
  | "reminder"
  | "other";

export const CALENDAR_EVENT_TYPES: CalendarEventType[] = [
  "meeting",
  "activity",
  "appointment",
  "deadline",
  "event",
  "reminder",
  "other",
];

export const CALENDAR_EVENT_TYPE_LABEL_KEYS: Record<CalendarEventType, string> = {
  meeting: "calEventTypeMeeting",
  activity: "calEventTypeActivity",
  appointment: "calEventTypeAppointment",
  deadline: "calEventTypeDeadline",
  event: "calEventTypeEvent",
  reminder: "calEventTypeReminder",
  other: "calEventTypeOther",
};

export const CALENDAR_EVENT_COLORS: Record<CalendarEventType, string> = {
  meeting: "#2563eb",
  activity: "#16a34a",
  appointment: "#9333ea",
  deadline: "#dc2626",
  event: "#ea580c",
  reminder: "#0891b2",
  other: "#64748b",
};

export type CalendarEventStatus = "scheduled" | "completed" | "cancelled";

export interface CalendarEventRecord {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  eventType: CalendarEventType;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  location?: string;
  color?: string;
  status?: CalendarEventStatus;
  reminderMinutes?: number;
}

export function getEventColor(event: { eventType?: CalendarEventType; color?: string }) {
  if (event.color) return event.color;
  return CALENDAR_EVENT_COLORS[event.eventType || "other"];
}

export function normalizeEventType(value?: string): CalendarEventType {
  if (value && CALENDAR_EVENT_TYPES.includes(value as CalendarEventType)) {
    return value as CalendarEventType;
  }
  return "event";
}
