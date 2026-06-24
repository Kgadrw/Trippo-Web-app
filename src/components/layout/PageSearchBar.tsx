import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePageSearch } from "@/hooks/usePageSearch";
import { cn } from "@/lib/utils";

type PageSearchBarProps = {
  className?: string;
  inputClassName?: string;
};

export function PageSearchBar({ className, inputClassName }: PageSearchBarProps) {
  const { query, setQuery, enabled, placeholder } = usePageSearch();

  if (!enabled) return null;

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 border-0 bg-white pl-9 shadow-none focus-visible:border-0 focus-visible:ring-0",
          inputClassName,
        )}
        autoComplete="off"
      />
    </div>
  );
}

export function MobilePageSearchBar({ className }: { className?: string }) {
  const { enabled } = usePageSearch();
  if (!enabled) return null;

  return (
    <div className={cn("border-b border-sidebar-border/80 bg-sidebar px-4 py-2 lg:hidden", className)}>
      <PageSearchBar inputClassName="h-10 rounded-md border border-gray-200" />
    </div>
  );
}
