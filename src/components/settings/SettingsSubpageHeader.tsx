import { NavLink } from "react-router-dom";
import { ChevronLeft, LucideIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface SettingsSubpageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "blue" | "red";
}

export function SettingsSubpageHeader({
  icon: Icon,
  title,
  description,
  tone = "blue",
}: SettingsSubpageHeaderProps) {
  const { t } = useTranslation();
  const isRed = tone === "red";

  return (
    <div className="mb-4 space-y-3">
      <NavLink
        to="/settings"
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
      >
        <ChevronLeft size={14} />
        {t("allSettings")}
      </NavLink>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
            isRed ? "border-red-200 bg-red-100" : "border-blue-200 bg-blue-100"
          }`}
        >
          <Icon size={16} className={isRed ? "text-red-600" : "text-blue-600"} />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${isRed ? "text-red-700" : "text-blue-700"}`}>{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
