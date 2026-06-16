import { NavLink } from "react-router-dom";
import { ChevronLeft, LucideIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface SettingsSubpageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "default" | "danger";
}

export function SettingsSubpageHeader({
  icon: Icon,
  title,
  description,
  tone = "default",
}: SettingsSubpageHeaderProps) {
  const { t } = useTranslation();
  const isDanger = tone === "danger";

  return (
    <div className="mb-4 space-y-3 px-4 pt-4 lg:px-6">
      <NavLink
        to="/settings"
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
      >
        <ChevronLeft size={14} />
        {t("allSettings")}
      </NavLink>
      <div className="flex items-start gap-3">
        <Icon
          size={20}
          className={cn("shrink-0 mt-0.5", isDanger ? "text-red-600" : "text-gray-500")}
        />
        <div className="min-w-0">
          <h2 className={cn("text-sm font-semibold", isDanger ? "text-red-700" : "text-gray-900")}>
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
