import * as React from "react";

import { cn } from "@/lib/utils";
import {
  searchBarInputClass,
  filterDateInputClass,
  activeFieldClass,
  dateInputClass,
} from "@/lib/fieldStyles";

const DATE_LIKE_INPUT_TYPES = new Set(["date", "datetime-local", "month", "time"]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isDateLike = type != null && DATE_LIKE_INPUT_TYPES.has(type);

    return (
      <input
        type={type}
        className={cn(
          isDateLike
            ? "flex text-base text-gray-900 ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            : "flex h-10 w-full rounded-none border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-300/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isDateLike && dateInputClass,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, searchBarInputClass, filterDateInputClass, activeFieldClass, dateInputClass };
