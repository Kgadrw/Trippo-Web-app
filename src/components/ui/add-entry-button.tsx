import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddEntryButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-primary hover:bg-blue-700 text-white gap-2 shrink-0 rounded-lg h-10 px-4 font-medium shadow-sm",
        className,
      )}
    >
      <Plus size={16} />
      {label}
    </Button>
  );
}
