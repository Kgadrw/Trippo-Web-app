import { cn } from "@/lib/utils";

export type ReportSection = "overview" | "sales" | "finance" | "inventory";

type ReportSectionTabsProps = {
  value: ReportSection;
  onChange: (section: ReportSection) => void;
  labels: {
    overview: string;
    sales: string;
    finance: string;
    inventory: string;
  };
};

const sections: ReportSection[] = ["overview", "sales", "finance", "inventory"];

export function ReportSectionTabs({ value, onChange, labels }: ReportSectionTabsProps) {
  const labelMap: Record<ReportSection, string> = {
    overview: labels.overview,
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
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
          )}
        >
          {labelMap[section]}
        </button>
      ))}
    </div>
  );
}
