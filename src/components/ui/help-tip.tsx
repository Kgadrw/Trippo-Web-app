import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type HelpTipProps = {
  text: string;
  label?: string;
};

export function HelpTip({ text, label = "Help" }: HelpTipProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          aria-label={label}
        >
          <HelpCircle size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="max-w-[min(18rem,calc(100vw-2rem))] whitespace-normal rounded-none border border-gray-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-gray-600 shadow-md"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
