import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useHeaderSubscriptionBadge } from "@/hooks/useHeaderSubscriptionBadge";
import { cn } from "@/lib/utils";

type HeaderPlusIconProps = {
  className?: string;
  imageClassName?: string;
};

export function HeaderPlusIcon({ className, imageClassName }: HeaderPlusIconProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showPlusIcon } = useHeaderSubscriptionBadge();

  if (!showPlusIcon) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate("/billing")}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full p-0.5 transition-opacity hover:opacity-80",
        className,
      )}
      aria-label={t("billing")}
      title={t("plusActive")}
    >
      <img
        src="/plus.png"
        alt="Trippo Plus"
        className={cn("h-9 w-9 object-contain", imageClassName)}
        loading="lazy"
      />
    </button>
  );
}
