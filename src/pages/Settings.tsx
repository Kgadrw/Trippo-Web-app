import { NavLink } from "react-router-dom";
import { Building2, Shield, Globe, Trash2, Bell, ChevronRight, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

const Settings = () => {
  const { t } = useTranslation();

  const items = [
    { key: "business", icon: Building2, label: t("businessInfo"), to: "/settings/business", tone: "default" as const },
    { key: "language", icon: Globe, label: t("language"), to: "/settings/language", tone: "default" as const },
    { key: "security", icon: Shield, label: t("security"), to: "/settings/security", tone: "default" as const },
    {
      key: "notifications",
      icon: Bell,
      label: t("notifications"),
      to: "/settings/notifications",
      tone: "default" as const,
    },
    {
      key: "help",
      icon: LifeBuoy,
      label: t("settingsHelpSupport"),
      to: "/settings/help",
      tone: "default" as const,
    },
    {
      key: "delete",
      icon: Trash2,
      label: t("deleteAccount"),
      to: "/settings/delete-account",
      tone: "danger" as const,
    },
  ];

  return (
    <div className="lg:px-0">
      <div className="hidden lg:block px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-800">{t("settings")}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t("editProfileDesc")}</p>
      </div>

      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
          <tr>
            <th className="text-left text-sm font-semibold text-gray-700 py-4 px-4 lg:px-6">
              {t("settings")}
            </th>
            <th className="text-right text-sm font-semibold text-gray-700 py-4 px-4 lg:px-6 w-12" />
          </tr>
        </thead>
        <tbody className="bg-white">
          {items.map((it, index) => {
            const Icon = it.icon;
            const isDanger = it.tone === "danger";
            return (
              <tr
                key={it.key}
                className={cn(
                  "border-b border-gray-200",
                  index % 2 === 0 ? "bg-white" : "bg-gray-50",
                )}
              >
                <td className="p-0" colSpan={2}>
                  <NavLink
                    to={it.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 py-4 px-4 lg:px-6 transition-colors",
                        isDanger ? "hover:bg-red-50" : "hover:bg-blue-50",
                        isActive && (isDanger ? "bg-red-50" : "bg-blue-50"),
                      )
                    }
                  >
                    <Icon
                      size={18}
                      className={cn("shrink-0", isDanger ? "text-red-600" : "text-gray-500")}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium truncate",
                        isDanger ? "text-red-700" : "text-gray-900",
                      )}
                    >
                      {it.label}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-gray-400" />
                  </NavLink>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Settings;
