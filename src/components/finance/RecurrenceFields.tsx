import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export function formatRecurrenceLabel(frequency?: string | null) {
  if (frequency === "weekly") return "Weekly";
  if (frequency === "monthly") return "Monthly";
  if (frequency === "yearly") return "Yearly";
  return "";
}

export function RecurrenceFields({
  isRecurring,
  frequency,
  onIsRecurringChange,
  onFrequencyChange,
  disabled,
}: {
  isRecurring: boolean;
  frequency: RecurrenceFrequency | "";
  onIsRecurringChange: (value: boolean) => void;
  onFrequencyChange: (value: RecurrenceFrequency | "") => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-300"
          checked={isRecurring}
          onChange={(e) => onIsRecurringChange(e.target.checked)}
          disabled={disabled}
        />
        This is recurring
      </label>
      {isRecurring ? (
        <div className="space-y-1">
          <Label>Recurring period</Label>
          <Select
            value={frequency || "monthly"}
            onValueChange={(value) => onFrequencyChange(value as RecurrenceFrequency)}
            disabled={disabled}
          >
            <SelectTrigger className={cn("bg-white")}>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Mark how often this income/bill repeats so your team can track it clearly.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function RecurrenceBadge({
  isRecurring,
  frequency,
}: {
  isRecurring?: boolean;
  frequency?: string | null;
}) {
  if (!isRecurring) return null;
  const label = formatRecurrenceLabel(frequency) || "Recurring";
  return (
    <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
      {label}
    </span>
  );
}
