import { useCallback, useMemo, useState, type ReactNode } from "react";
import { SettingsModalRoot } from "@/components/settings/SettingsModalRoot";
import {
  SettingsModalContext,
  type SettingsModalContextValue,
} from "@/components/settings/settingsModalState";
import type { SettingsPanelKey } from "@/components/settings/settingsPanelMeta";

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<SettingsPanelKey | null>(null);

  const closeSettings = useCallback(() => {
    setOpen(false);
    setActivePanel(null);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const openSettings = useCallback((panel?: SettingsPanelKey | null) => {
    setOpen(true);
    setActivePanel(panel ?? null);
  }, []);

  const openPanel = useCallback((panel: SettingsPanelKey) => {
    setOpen(true);
    setActivePanel(panel);
  }, []);

  const value = useMemo<SettingsModalContextValue>(
    () => ({
      open,
      activePanel,
      openSettings,
      closeSettings,
      openPanel,
      closePanel,
    }),
    [open, activePanel, openSettings, closeSettings, openPanel, closePanel],
  );

  return (
    <SettingsModalContext.Provider value={value}>
      {children}
      <SettingsModalRoot />
    </SettingsModalContext.Provider>
  );
}
