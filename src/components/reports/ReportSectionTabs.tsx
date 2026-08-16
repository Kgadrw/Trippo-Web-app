import { cn } from "@/lib/utils";

export type ReportSection = "overview" | "sales" | "finance" | "inventory" | "team";

type ReportSectionTabsProps = {
  value: ReportSection;
  onChange: (section: ReportSection) => void;
  labels: {
    overview: string;
    sales: string;
    finance: string;
    inventory: string;
    team: string;
  };
};

const sections: ReportSection[] = ["overview", "team", "sales", "finance", "inventory"];

export function ReportSectionTabs({ value, onChange, labels }: ReportSectionTabsProps) {
  const labelMap: Record<ReportSection, string> = {
    overview: labels.overview,
    team: labels.team,
    sales: labels.sales,
    finance: labels.finance,
    inventory: labels.inventory,
  };

  return (
    <div className="flex flex-wrap gap-2">
      {sections.map((section) => (
        <button
          key={section}
          type="button"
          onClick={() => onChange(section)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === section
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {labelMap[section]}
        </button>
      ))}
    </div>
  );
}
