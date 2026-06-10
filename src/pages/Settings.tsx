import { NavLink } from "react-router-dom";
import { Building2, Shield, Globe, Trash2, Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "@/hooks/useTranslation";

const Settings = () => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  const items = [
    { key: "business", icon: Building2, label: t("businessInfo"), to: "/settings/business", tone: "blue" as const },
    { key: "language", icon: Globe, label: t("language"), to: "/settings/language", tone: "blue" as const },
    { key: "security", icon: Shield, label: t("security"), to: "/settings/security", tone: "blue" as const },
    {
      key: "notifications",
      icon: Bell,
      label: language === "rw" ? "Amatangazo" : language === "fr" ? "Notifications" : "Notifications",
      to: "/settings/notifications",
      tone: "blue" as const,
    },
    {
      key: "delete",
      icon: Trash2,
      label: language === "rw" ? "Kuraho Konti" : language === "fr" ? "Supprimer le compte" : "Delete Account",
      to: "/settings/delete-account",
      tone: "red" as const,
    },
  ];

  return (
    <>
      {items.map((it, idx) => {
        const Icon = it.icon;
        const isRed = it.tone === "red";
        return (
          <NavLink
            key={it.key}
            to={it.to}
            className={({ isActive }) =>
              cn(
                "w-full text-left px-5 py-4 flex items-center gap-3 transition-colors",
                idx !== 0 && "border-t border-gray-200",
                isRed ? "hover:bg-red-50" : "hover:bg-blue-50",
                isActive && (isRed ? "bg-red-50" : "bg-blue-50"),
              )
            }
          >
            <div
              className={cn(
                "h-10 w-10 shrink-0 rounded-full flex items-center justify-center border",
                isRed ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200",
              )}
            >
              <Icon size={18} className={cn(isRed ? "text-red-600" : "text-blue-600")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn("text-sm font-medium truncate", isRed ? "text-red-700" : "text-gray-900")}>
                {it.label}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-gray-400" />
          </NavLink>
        );
      })}
    </>
  );
};

export default Settings;
