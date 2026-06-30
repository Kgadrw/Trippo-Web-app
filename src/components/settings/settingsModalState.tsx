import { createContext, useContext } from "react";
import type { SettingsPanelKey } from "@/components/settings/settingsPanelMeta";

export type SettingsModalContextValue = {
  open: boolean;
  activePanel: SettingsPanelKey | null;
  openSettings: (panel?: SettingsPanelKey | null) => void;
  closeSettings: () => void;
  openPanel: (panel: SettingsPanelKey) => void;
  closePanel: () => void;
};

export const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);

const PANEL_PATH_SUFFIX: Record<string, SettingsPanelKey> = {
  profile: "profile",
  business: "business",
  security: "security",
  notifications: "notifications",
  billing: "billing",
  subscription: "billing",
  help: "help",
  "delete-account": "delete-account",
};

export function pathnameToSettingsPanel(pathname: string): SettingsPanelKey | null {
  if (!pathname.startsWith("/settings")) return null;
  if (pathname === "/settings" || pathname === "/settings/") return null;
  const segment = pathname.replace(/^\/settings\/?/, "").split("/")[0];
  return PANEL_PATH_SUFFIX[segment] ?? null;
}

export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error("useSettingsModal must be used within SettingsModalProvider");
  }
  return ctx;
}
