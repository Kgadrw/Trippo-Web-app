import { LucideIcon } from "lucide-react";
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
  const isDanger = tone === "danger";

  return (
    <div className="mb-4 space-y-2 px-4 pt-4 lg:px-6">
      <div className="flex items-start gap-3">
        <Icon
          size={20}
          className={cn("shrink-0 mt-0.5", isDanger ? "text-red-600" : "text-gray-500")}
        />
        <div className="min-w-0">
          <h2 className={cn("text-sm font-semibold", isDanger ? "text-red-700" : "text-gray-600")}>
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
