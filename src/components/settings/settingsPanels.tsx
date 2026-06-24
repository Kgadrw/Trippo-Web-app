import { lazy, Suspense, type ComponentType } from "react";
import { Loader2 } from "lucide-react";
import SettingsProfile from "@/pages/settings/SettingsProfile";
import SettingsBusiness from "@/pages/settings/SettingsBusiness";
import SettingsLanguage from "@/pages/settings/SettingsLanguage";
import SettingsSecurity from "@/pages/settings/SettingsSecurity";
import SettingsNotifications from "@/pages/settings/SettingsNotifications";
import SettingsHelpSupport from "@/pages/settings/SettingsHelpSupport";
import SettingsDeleteAccount from "@/pages/settings/SettingsDeleteAccount";
import type { SettingsPanelKey } from "@/components/settings/settingsPanelMeta";

export type { SettingsPanelKey } from "@/components/settings/settingsPanelMeta";
export { settingsPanelItems } from "@/components/settings/settingsPanelMeta";

export type SettingsPanelProps = {
  embedded?: boolean;
};

const BillingLazy = lazy(() => import("@/pages/Billing"));

function BillingPanel(props: SettingsPanelProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      }
    >
      <BillingLazy {...props} />
    </Suspense>
  );
}

export const settingsPanelComponents: Record<
  SettingsPanelKey,
  ComponentType<SettingsPanelProps>
> = {
  profile: SettingsProfile,
  business: SettingsBusiness,
  language: SettingsLanguage,
  security: SettingsSecurity,
  notifications: SettingsNotifications,
  billing: BillingPanel,
  help: SettingsHelpSupport,
  "delete-account": SettingsDeleteAccount,
};
