export type SettingsPanelKey =
  | "profile"
  | "business"
  | "security"
  | "notifications"
  | "billing"
  | "help"
  | "delete-account";

export const settingsPanelItems: Array<{
  key: SettingsPanelKey;
  labelKey:
    | "profileSectionTitle"
    | "businessInfo"
    | "security"
    | "notifications"
    | "billing"
    | "settingsHelpSupport"
    | "deleteAccount";
  danger?: boolean;
}> = [
  { key: "profile", labelKey: "profileSectionTitle" },
  { key: "business", labelKey: "businessInfo" },
  { key: "security", labelKey: "security" },
  { key: "notifications", labelKey: "notifications" },
  { key: "billing", labelKey: "billing" },
  { key: "help", labelKey: "settingsHelpSupport" },
  { key: "delete-account", labelKey: "deleteAccount", danger: true },
];
