import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
 * One field: type here to search and pick a customer (no extra search box in the list).
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
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const filtered = customers.filter((c) => (c as { clientType?: string }).clientType !== "worker");
    const unique = uniqueCustomersByName(filtered);
    return unique.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [customers]);

  const selected = options.find((c) => optionId(c) === value) || null;

  useEffect(() => {
    if (!open) setQuery(selected?.name || "");
  }, [selected?.name, open, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
        setQuery(selected?.name || "");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, selected?.name]);

  const filtered = useMemo(
    () => options.filter((c) => matchesQuery(c, query)),
    [options, query],
  );

  const selectCustomer = (id: string, customer: CustomerOption | null) => {
    onChange(id, customer);
    setQuery(customer?.name || "");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("", null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        value={query}
        placeholder={open || !selected ? searchPlaceholder || placeholder : placeholder}
        onFocus={() => {
          setOpen(true);
          if (selected && query === selected.name) setQuery("");
        }}
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
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto border border-gray-200 bg-white py-1 shadow-md">
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
      ) : null}
    </div>
  );
}
