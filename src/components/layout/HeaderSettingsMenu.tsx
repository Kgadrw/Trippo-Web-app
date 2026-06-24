import { Settings } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useSettingsModal } from "@/components/settings/settingsModalState";
import type { SettingsPanelKey } from "@/components/settings/settingsPanelMeta";

type HeaderSettingsMenuProps = {
  children: React.ReactNode;
  panel?: SettingsPanelKey | null;
};

export function HeaderSettingsMenu({ children, panel = null }: HeaderSettingsMenuProps) {
  const { openSettings } = useSettingsModal();

  return (
    <span
      role="presentation"
      onClick={(event) => {
        const target = event.target as HTMLElement;
        const button = target.closest("button");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        openSettings(panel);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openSettings(panel);
      }}
    >
      {children}
    </span>
  );
}

export function HeaderSettingsIconButton({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  const { openSettings } = useSettingsModal();

  return (
    <button
      type="button"
      className={className}
      aria-label={t("settings")}
      onClick={() => openSettings()}
    >
      <Settings size={18} />
    </button>
  );
}
