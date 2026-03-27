import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onDone?: () => void;
  className?: string;
};

export function MobileTextPad({ value, onChange, onDone, className }: Props) {
  const [shift, setShift] = useState(false);

  const rows = useMemo(
    () => [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["z", "x", "c", "v", "b", "n", "m"],
    ],
    []
  );

  const push = (ch: string) => {
    onChange(`${value}${shift ? ch.toUpperCase() : ch}`);
    if (shift) setShift(false);
  };
  const backspace = () => onChange(value.slice(0, -1));
  const clear = () => onChange("");
  const space = () => onChange(`${value} `);

  return (
    <div className={cn("w-full rounded-2xl border border-gray-200 bg-white p-3", className)}>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-1.5 justify-center">
            {row.map((k) => (
              <Button
                key={k}
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl text-base font-semibold"
                onClick={() => push(k)}
              >
                {shift ? k.toUpperCase() : k}
              </Button>
            ))}
          </div>
        ))}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn("h-11 rounded-xl px-4 font-semibold", shift && "border-blue-400 text-blue-700")}
            onClick={() => setShift((s) => !s)}
          >
            Shift
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl text-base font-semibold"
            onClick={space}
          >
            Space
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl px-4 font-semibold"
            onClick={backspace}
            disabled={!value}
          >
            ⌫
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl px-4 font-semibold"
            onClick={clear}
            disabled={!value}
          >
            Clear
          </Button>
          {onDone && (
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold"
              onClick={onDone}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

