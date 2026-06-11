import { Link } from "react-router-dom";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import type { SubscriptionPlan } from "@/hooks/useSubscriptionAccess";

type Props = {
  plan: SubscriptionPlan | null;
};

export function SubscriptionPaywall({ plan }: Props) {
  const { t } = useTranslation();
  const amount = plan?.amount ?? 10000;
  const currency = plan?.currency || "RWF";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
        <Lock className="h-7 w-7 text-amber-800" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2 justify-center">
        <Crown className="h-5 w-5 text-yellow-600" />
        {t("billingPaymentRequired")}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {t("trialEndedPay")
          .replace("{amount}", amount.toLocaleString())
          .replace("{currency}", currency)}
      </p>
      <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold">
        <Link to="/billing">{t("payNow")}</Link>
      </Button>
    </div>
  );
}
