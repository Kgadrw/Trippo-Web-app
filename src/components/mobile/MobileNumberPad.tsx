import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onDone?: () => void;
  className?: string;
};

export function MobileNumberPad({ value, onChange, onDone, className }: Props) {
  const push = (ch: string) => onChange(`${value}${ch}`);
  const backspace = () => onChange(value.slice(0, -1));
  const clear = () => onChange("");

  return (
    <div className={cn("w-full rounded-2xl border border-gray-200 bg-white p-3", className)}>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <Button
            key={n}
            type="button"
            variant="outline"
            className="h-12 rounded-xl text-lg font-semibold"
            onClick={() => push(n)}
          >
            {n}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl text-sm font-semibold"
          onClick={clear}
          disabled={!value}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl text-lg font-semibold"
          onClick={() => push("0")}
        >
          0
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl text-sm font-semibold"
          onClick={backspace}
          disabled={!value}
        >
          ⌫
        </Button>
      </div>

      {onDone && (
        <Button
          type="button"
          className="mt-3 h-11 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold"
          onClick={onDone}
        >
          Done
        </Button>
      )}
    </div>
  );
}

