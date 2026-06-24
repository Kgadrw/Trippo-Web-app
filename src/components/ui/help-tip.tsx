import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type HelpTipProps = {
  text: string;
  label?: string;
};

export function HelpTip({ text, label = "Help" }: HelpTipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          aria-label={label}
        >
          <HelpCircle size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-64 max-w-[min(18rem,calc(100vw-2rem))] rounded-none border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-md"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}
