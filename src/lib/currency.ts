import { createElement } from "react";
import { cn } from "@/lib/utils";

/** Display label for Rwandan Franc across the app. */
export const CURRENCY_CODE = "Rwf";

/** ISO 4217 code used for APIs and payment providers. */
export const CURRENCY_ISO = "RWF";

/** Keeps currency code from inheriting bold on amount labels. */
export const currencyCodeClassName = "currency-code font-normal text-gray-500";

export function displayCurrencyCode(code?: string | null): string {
  if (!code) return CURRENCY_CODE;
  return code.toUpperCase() === CURRENCY_ISO ? CURRENCY_CODE : code;
}

export function formatCurrencyAmount(amount: number): string {
  return Number(amount).toLocaleString();
}

export function formatCurrency(amount: number): string {
  return `${formatCurrencyAmount(amount)} ${CURRENCY_CODE}`;
}

export function formatCurrencyPrefix(amount: number | string): string {
  return `${CURRENCY_CODE} ${amount}`;
}

type CurrencyAmountProps = {
  amount: number;
  className?: string;
  codeClassName?: string;
  /** Renders "Rwf 1,000" instead of "1,000 Rwf". */
  codeFirst?: boolean;
};

export function CurrencyAmount({
  amount,
  className,
  codeClassName,
  codeFirst = false,
}: CurrencyAmountProps) {
  const value = formatCurrencyAmount(amount);
  const code = createElement(
    "span",
    { className: cn(currencyCodeClassName, "text-[0.85em]", codeClassName) },
    CURRENCY_CODE,
  );
  const amountEl = createElement("span", null, value);

  return createElement(
    "span",
    { className: cn("tabular-nums inline-flex items-baseline gap-1", className) },
    ...(codeFirst ? [code, amountEl] : [amountEl, code]),
  );
}
