import { AppLayout } from "@/components/layout/AppLayout";
import { PlatformContactCard } from "@/components/support/PlatformContactCard";
import { usePlatformContact } from "@/hooks/usePlatformContact";
import { useTranslation } from "@/hooks/useTranslation";
import { getBillingNoPromptHint } from "@/lib/subscriptionPayment";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeBuoy } from "lucide-react";

export default function SettingsHelpSupport() {
  const { t, language } = useTranslation();
  const { contact, loading } = usePlatformContact();

  return (
    <div className="space-y-4">
      <SettingsSubpageHeader icon={LifeBuoy} title={t("settingsHelpSupport")} />

      <div className="px-4 lg:px-0 space-y-4 pb-6">
        <p className="text-sm text-muted-foreground">{t("settingsHelpSupportDesc")}</p>

        {loading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <PlatformContactCard
            contact={contact}
            title={t("callSupport")}
            description={getBillingNoPromptHint(language, "mtn", contact)}
          />
        )}
      </div>
    </div>
  );
}
