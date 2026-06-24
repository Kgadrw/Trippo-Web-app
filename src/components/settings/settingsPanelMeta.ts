export type SettingsPanelKey =
  | "profile"
  | "business"
  | "language"
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
    | "language"
    | "security"
    | "notifications"
    | "billing"
    | "settingsHelpSupport"
    | "deleteAccount";
  danger?: boolean;
}> = [
  { key: "profile", labelKey: "profileSectionTitle" },
  { key: "business", labelKey: "businessInfo" },
  { key: "language", labelKey: "language" },
  { key: "security", labelKey: "security" },
  { key: "notifications", labelKey: "notifications" },
  { key: "billing", labelKey: "billing" },
  { key: "help", labelKey: "settingsHelpSupport" },
  { key: "delete-account", labelKey: "deleteAccount", danger: true },
];
