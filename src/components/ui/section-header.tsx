import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/ui/help-tip";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  helpText?: string;
  className?: string;
  titleClassName?: string;
  actions?: React.ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  helpText,
  className,
  titleClassName,
  actions,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h2 className={cn("text-lg font-semibold text-gray-600", titleClassName)}>{title}</h2>
          {helpText ? <HelpTip text={helpText} /> : null}
        </div>
        {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
