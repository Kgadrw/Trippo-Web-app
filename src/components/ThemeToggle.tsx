import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  /** Compact icon button for headers */
  compact?: boolean;
};

const THEME_CYCLE = ["system", "light", "dark"] as const;

function nextTheme(current: (typeof THEME_CYCLE)[number]) {
  const index = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length];
}

function themeMeta(theme: (typeof THEME_CYCLE)[number], resolvedTheme: "light" | "dark") {
  if (theme === "system") {
    return {
      label: "Auto",
      title: `Auto · matching device (${resolvedTheme})`,
      aria: "Use device theme (auto)",
      Icon: Monitor,
    };
  }
  if (theme === "dark") {
    return {
      label: "Dark",
      title: "Dark mode",
      aria: "Switch theme",
      Icon: Moon,
    };
  }
  return {
    label: "Light",
    title: "Light mode",
    aria: "Switch theme",
    Icon: Sun,
  };
}

/**
 * Cycles Auto (device) → Light → Dark → Auto.
 * Auto follows the device light/dark preference.
 */
export function ThemeToggle({ className, compact = true }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mode = theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
  const meta = themeMeta(mode, resolvedTheme);
  const Icon = meta.Icon;

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme(mode))}
      className={cn(
        compact
          ? "flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
          : "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
        className,
      )}
      aria-label={meta.aria}
      title={meta.title}
    >
      <Icon size={compact ? 18 : 16} />
      {!compact ? <span>{meta.label}</span> : null}
    </button>
  );
}
