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
    return {
      label: "Meet",
      icon: CalendarClock,
      className:
        "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-500/25 dark:text-sky-200 dark:ring-sky-500/40",
    };
  }
  if (kind === "deadline") {
    return {
      label: "Deadline",
      icon: CheckSquare,
      className:
        "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/25 dark:text-amber-200 dark:ring-amber-500/40",
    };
  }
  return {
    label: "Event",
    icon: Bell,
    className:
      "bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-500/25 dark:text-violet-200 dark:ring-violet-500/40",
  };
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
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg ring-1",
            "bg-sky-100 text-sky-700 ring-sky-200",
            "dark:bg-sky-500/25 dark:text-sky-200 dark:ring-sky-500/40",
          )}
        >
          <Bell size={16} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg bg-muted/50 px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const meta = kindMeta(item.kind);
            const Icon = meta.icon;
            return (
              <li key={item.id} className="min-w-0">
                <Link
                  to={item.href}
                  className={cn(
                    "flex h-full items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    "border-border bg-muted/30 hover:border-sky-500/40 hover:bg-sky-500/10",
                    "dark:bg-white/5 dark:hover:bg-sky-500/15",
                  )}
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
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {meta.label}
                      </span>
                      <span className="text-[11px] font-medium text-sky-600 dark:text-sky-300">
                        {formatCountdown(item.at)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
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
