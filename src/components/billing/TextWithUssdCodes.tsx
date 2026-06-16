import { cn } from "@/lib/utils";

const USSD_CODE = /^\*[\d*]+#$/;

type TextWithUssdCodesProps = {
  text: string;
  className?: string;
  codeClassName?: string;
  as?: "span" | "p";
};

export function TextWithUssdCodes({
  text,
  className,
  codeClassName,
  as: Tag = "span",
}: TextWithUssdCodesProps) {
  if (!text) return null;

  const parts = text.split(/(\*[\d*]+#)/g);

  return (
    <Tag className={className}>
      {parts.map((part, index) =>
        USSD_CODE.test(part) ? (
          <span
            key={index}
            className={cn(
              "inline-block align-baseline font-mono text-[13px] font-bold leading-none text-gray-900",
              "bg-amber-100 border border-amber-300 rounded-md px-2 py-1 mx-0.5 whitespace-nowrap",
              codeClassName,
            )}
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </Tag>
  );
}

export function ussdToastDescription(text: string) {
  return <TextWithUssdCodes text={text} />;
}
