export const DEFAULT_REMINDER_OFFSETS = [1440, 60] as const;

export const REMINDER_OFFSET_OPTIONS = [
  { value: 15, labelKey: "calReminder15" },
  { value: 60, labelKey: "calReminder60" },
  { value: 1440, labelKey: "calReminderDay" },
  { value: 2880, labelKey: "calReminder2Days" },
] as const;

export type ReminderPreset = "none" | "default" | "custom";

export function normalizeReminderOffsets(values: Array<number | string | { offsetMinutes?: number }>): number[] {
  return [
    ...new Set(
      values
        .map((item) => Number(typeof item === "object" ? item?.offsetMinutes : item))
        .filter((value) => Number.isFinite(value) && value >= 0),
    ),
  ].sort((a, b) => b - a);
}

export function detectReminderPreset(offsets: number[]): ReminderPreset {
  const normalized = normalizeReminderOffsets(offsets);
  if (normalized.length === 0) return "none";
  const defaults = [...DEFAULT_REMINDER_OFFSETS].sort((a, b) => b - a);
  if (
    normalized.length === defaults.length &&
    normalized.every((value, index) => value === defaults[index])
  ) {
    return "default";
  }
  return "custom";
}

export function offsetsFromPreset(preset: ReminderPreset, customOffsets: number[] = []): number[] {
  if (preset === "none") return [];
  if (preset === "default") return [...DEFAULT_REMINDER_OFFSETS];
  return normalizeReminderOffsets(customOffsets);
}

export function reminderOffsetsFromRecord(record?: {
  reminders?: Array<number | { offsetMinutes?: number }>;
  reminderMinutes?: number;
}): number[] {
  const fromArray = normalizeReminderOffsets(record?.reminders || []);
  if (fromArray.length) return fromArray;
  if (Number(record?.reminderMinutes) > 0) return [Number(record?.reminderMinutes)];
  return [];
}

export type UpcomingReminderItem = {
  id: string;
  kind: "meeting" | "event" | "deadline";
  title: string;
  at: string;
  href: string;
  subtitle?: string;
  reminderOffsets?: number[];
};
