import type { ReactNode } from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, searchBarInputClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  mobileFilterPanelClass,
  mobileFilterToggleActiveClass,
  mobileFilterToggleClass,
} from "@/lib/fieldStyles";

type MobileListSearchFiltersProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  showFilters: boolean;
  onToggleFilters: () => void;
  filters?: ReactNode;
  trailing?: ReactNode;
  searchName?: string;
};

export function MobileListSearchFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  showFilters,
  onToggleFilters,
  filters,
  trailing,
  searchName,
}: MobileListSearchFiltersProps) {
  return (
    <div className="lg:hidden mb-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
          />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={searchBarInputClass}
            autoComplete="off"
            name={searchName}
          />
        </div>
        {filters != null ? (
          <Button
            type="button"
            onClick={onToggleFilters}
            variant="outline"
            className={cn(
              mobileFilterToggleClass,
              showFilters && mobileFilterToggleActiveClass,
            )}
          >
            <Filter size={18} />
          </Button>
        ) : null}
        {trailing}
      </div>
      {showFilters && filters ? (
        <div className={mobileFilterPanelClass}>{filters}</div>
      ) : null}
    </div>
  );
}
