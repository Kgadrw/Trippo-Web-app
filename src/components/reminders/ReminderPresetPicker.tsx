import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filterSelectClass } from "@/lib/fieldStyles";
import {
  REMINDER_OFFSET_OPTIONS,
  type ReminderPreset,
  offsetsFromPreset,
} from "@/lib/workReminders";
import { cn } from "@/lib/utils";

export function ReminderPresetPicker({
  preset,
  customOffsets,
  onPresetChange,
  onCustomChange,
  disabled,
  helperText = "You'll get in-app, push, and email reminders.",
}: {
  preset: ReminderPreset;
  customOffsets: number[];
  onPresetChange: (preset: ReminderPreset) => void;
  onCustomChange: (offsets: number[]) => void;
  disabled?: boolean;
  helperText?: string;
}) {
  const toggleOffset = (value: number) => {
    const next = customOffsets.includes(value)
      ? customOffsets.filter((item) => item !== value)
      : [...customOffsets, value];
    onCustomChange(offsetsFromPreset("custom", next));
  };

  return (
    <div className="space-y-2">
      <Label>Reminders</Label>
      <Select
        value={preset}
        onValueChange={(value) => onPresetChange(value as ReminderPreset)}
        disabled={disabled}
      >
        <SelectTrigger className={filterSelectClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No reminder</SelectItem>
          <SelectItem value="default">Default (1 day + 1 hour)</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {preset === "custom" ? (
        <div className="flex flex-wrap gap-2">
          {REMINDER_OFFSET_OPTIONS.map((option) => {
            const active = customOffsets.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleOffset(option.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                {option.value === 15
                  ? "15 min"
                  : option.value === 60
                    ? "1 hour"
                    : option.value === 1440
                      ? "1 day"
                      : "2 days"}
              </button>
            );
          })}
        </div>
      ) : null}

      {preset !== "none" ? <p className="text-xs text-gray-500">{helperText}</p> : null}
    </div>
  );
}
