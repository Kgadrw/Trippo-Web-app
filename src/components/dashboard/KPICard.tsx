import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  showMoneyToggle?: boolean;
  showMoney?: boolean;
  onToggleMoney?: () => void;
  bgColor?: string;
  valueColor?: string;
  /**
   * Optional text treatment for colored cards.
   * - "default": uses foreground/muted colors (theme aware)
   * - "inverted": uses white/near-white for better contrast on strong backgrounds
   */
  tone?: "default" | "inverted";
  linkTo?: string;
  linkText?: string;
  /**
   * Optional visual variant.
   * - "default": regular light card
   * - "imageDark": uses background image and light (white) text, intended for mobile
   */
  variant?: "default" | "imageDark";
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  showMoneyToggle,
  showMoney,
  onToggleMoney,
  bgColor,
  valueColor,
  tone = "default",
  linkTo,
  linkText,
  variant = "default",
}: KPICardProps) {
  const isImageVariant = variant === "imageDark";
  const { resolvedTheme } = useTheme();
  const hideImages = resolvedTheme === "dark";
  const isInverted = tone === "inverted";

  const cardStyle = isImageVariant
    ? {
        backgroundImage: hideImages ? "none" : "url('/card.avif')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div
      className={cn(
        "kpi-card relative",
        bgColor,
        isImageVariant && "text-white"
      )}
      style={cardStyle}
    >
      {/* White overlay for image background */}
      {isImageVariant && !hideImages && (
        <div className="absolute inset-0 bg-white/30 rounded-lg" />
      )}
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
          <p
            className={cn(
              "text-xs sm:text-sm font-medium truncate",
              isImageVariant || isInverted ? "text-white/90" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <p
              className={cn(
                "text-lg sm:text-2xl font-semibold sm:font-normal leading-tight truncate",
                valueColor || (isImageVariant || isInverted ? "text-white" : "text-foreground")
              )}
            >
              {value}
            </p>
            {showMoneyToggle && onToggleMoney && (
              <button
                onClick={onToggleMoney}
                className={cn(
                  "transition-colors p-0.5 sm:p-1 shrink-0",
                  isImageVariant || isInverted
                    ? "text-white/80 hover:text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={showMoney ? "Hide money" : "Show money"}
              >
                {showMoney ? (
                  <EyeOff size={14} className="sm:w-4 sm:h-4" />
                ) : (
                  <Eye size={14} className="sm:w-4 sm:h-4" />
                )}
              </button>
            )}
          </div>
          {subtitle && (
            <p
              className={cn(
                "text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate",
                isImageVariant || isInverted ? "text-white/80" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className={cn(
                "text-[10px] sm:text-xs font-semibold mt-0.5 sm:mt-1",
                trend.positive
                  ? isImageVariant
                    ? "text-green-300"
                    : "text-green-600"
                  : isImageVariant
                  ? "text-red-300"
                  : "text-red-600"
              )}
            >
              {trend.positive ? "↑" : "↓"} {trend.value} vs yesterday
            </p>
          )}
          {linkTo && linkText && !isImageVariant && (
            <Link
              to={linkTo}
              className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 underline mt-1 sm:mt-2 inline-block truncate"
            >
              {linkText}
            </Link>
          )}
        </div>
        <div className="ml-2 sm:ml-4 shrink-0">
          <div className="w-8 h-8 sm:w-12 sm:h-12 !border-0 outline-none flex items-center justify-center" style={{ border: "none", background: "transparent" }}>
            <Icon
              size={18}
              className={cn(
                "sm:w-6 sm:h-6",
                isImageVariant || isInverted ? "text-white" : "text-foreground"
              )}
              style={{ border: "none", outline: "none" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
