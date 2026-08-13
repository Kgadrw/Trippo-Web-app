import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CustomerOption = {
  id?: number;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  clientType?: string;
};

function optionId(c: CustomerOption): string {
  return String(c._id ?? c.id ?? "");
}

function normalizeCustomerKey(c: CustomerOption): string {
  return (c.name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Deduplicate by normalized name (keep first). */
export function uniqueCustomersByName(customers: CustomerOption[]): CustomerOption[] {
  const seen = new Set<string>();
  const out: CustomerOption[] = [];
  for (const entry of customers) {
    const key = normalizeCustomerKey(entry);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function matchesQuery(c: CustomerOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${c.name || ""} ${c.phone || ""} ${c.email || ""}`.toLowerCase();
  return haystack.includes(q);
}

type CustomerSearchSelectProps = {
  customers: CustomerOption[];
  value: string;
  onChange: (customerId: string, customer: CustomerOption | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noneLabel?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * One field: type here to search, pick from the list below (no extra search box).
 */
export function CustomerSearchSelect({
  customers,
  value,
  onChange,
  placeholder = "Select customer",
  searchPlaceholder = "Search customer…",
  noneLabel = "No customer",
  emptyLabel = "No customer found",
  disabled,
  className,
}: CustomerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const options = useMemo(() => {
    const filtered = customers.filter((c) => (c as { clientType?: string }).clientType !== "worker");
    const unique = uniqueCustomersByName(filtered);
    return unique.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [customers]);

  const selected = options.find((c) => optionId(c) === value) || null;

  useEffect(() => {
    if (!open) {
      setQuery(selected?.name || "");
    }
  }, [selected?.name, open, value]);

  const filtered = useMemo(
    () => options.filter((c) => matchesQuery(c, query)),
    [options, query],
  );

  const clearBlurTimer = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  };

  const selectCustomer = (id: string, customer: CustomerOption | null) => {
    clearBlurTimer();
    onChange(id, customer);
    setQuery(customer?.name || "");
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    clearBlurTimer();
    setOpen(true);
    // Show full list when focusing a selected value
    if (selected && query === selected.name) {
      setQuery("");
    }
  };

  const handleBlur = () => {
    clearBlurTimer();
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      setQuery(selected?.name || "");
    }, 150);
  };

  const handleClear = () => {
    clearBlurTimer();
    onChange("", null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <Input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            disabled={disabled}
            value={query}
            placeholder={open || !selected ? searchPlaceholder || placeholder : placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (value) onChange("", null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery(selected?.name || "");
                inputRef.current?.blur();
              }
              if (e.key === "Enter" && filtered.length === 1) {
                e.preventDefault();
                selectCustomer(optionId(filtered[0]), filtered[0]);
              }
            }}
            className="h-10 w-full pr-16"
            autoComplete="off"
          />
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-0.5">
            {(query || value) && !disabled ? (
              <button
                type="button"
                tabIndex={-1}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Clear"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className="max-h-56 overflow-y-auto py-1"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => selectCustomer("", null)}
          >
            <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />
            <span className="text-muted-foreground">{noneLabel}</span>
          </button>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            filtered.map((c) => {
              const id = optionId(c);
              return (
                <button
                  key={id}
                  type="button"
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => selectCustomer(id, c)}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {c.name}
                    {c.phone ? (
                      <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
