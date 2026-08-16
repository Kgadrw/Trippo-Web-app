import { Link } from "react-router-dom";
import { Bell, CalendarClock, CheckSquare } from "lucide-react";
import type { UpcomingReminderItem } from "@/lib/workReminders";
import { cn } from "@/lib/utils";

function formatCountdown(at: string) {
  const target = new Date(at).getTime();
  const diffMs = target - Date.now();
  if (!Number.isFinite(target)) return "";
  if (diffMs <= 0) return "Due now";
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days}d`;
}

function formatWhen(at: string) {
  return new Date(at).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindMeta(kind: UpcomingReminderItem["kind"]) {
  if (kind === "meeting") {
    return { label: "Meet", icon: CalendarClock, className: "bg-sky-50 text-sky-700 ring-sky-100" };
  }
  if (kind === "deadline") {
    return { label: "Deadline", icon: CheckSquare, className: "bg-amber-50 text-amber-700 ring-amber-100" };
  }
  return { label: "Event", icon: Bell, className: "bg-violet-50 text-violet-700 ring-violet-100" };
}

export function UpcomingRemindersCard({
  items,
  title = "Upcoming reminders",
  emptyText = "No meetings or deadlines in the next 7 days.",
  subtitle,
  className,
}: {
  items: UpcomingReminderItem[];
  title?: string;
  emptyText?: string;
  subtitle?: string | null;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-gray-200 bg-white p-4 shadow-sm", className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Bell size={16} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const meta = kindMeta(item.kind);
            const Icon = meta.icon;
            return (
              <li key={item.id} className="min-w-0">
                <Link
                  to={item.href}
                  className="flex h-full items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:border-sky-200 hover:bg-sky-50/60"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                      meta.className,
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {meta.label}
                      </span>
                      <span className="text-[11px] font-medium text-sky-600">{formatCountdown(item.at)}</span>
                    </div>
                    <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="truncate text-xs text-gray-500">
                      {formatWhen(item.at)}
                      {item.subtitle ? ` · ${item.subtitle}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
