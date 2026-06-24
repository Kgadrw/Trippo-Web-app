import { cn } from "@/lib/utils";

type ReportEmptyIllustrationProps = {
  title: string;
  description?: string;
  className?: string;
  variant?: "chart" | "finance" | "inventory";
};

export function ReportEmptyIllustration({
  title,
  description,
  className,
  variant = "chart",
}: ReportEmptyIllustrationProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <svg viewBox="0 0 200 140" className="mb-4 h-28 w-40 text-primary/80" aria-hidden>
        {variant === "finance" ? (
          <>
            <rect x="30" y="70" width="24" height="50" rx="4" fill="#dbeafe" />
            <rect x="62" y="50" width="24" height="70" rx="4" fill="#93c5fd" />
            <rect x="94" y="35" width="24" height="85" rx="4" fill="#3b82f6" />
            <rect x="126" y="55" width="24" height="65" rx="4" fill="#60a5fa" />
            <circle cx="150" cy="32" r="18" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
            <text x="150" y="37" textAnchor="middle" fontSize="14" fill="#b45309">
              Rwf
            </text>
          </>
        ) : variant === "inventory" ? (
          <>
            <rect x="55" y="45" width="90" height="70" rx="8" fill="#ecfdf5" stroke="#6ee7b7" strokeWidth="2" />
            <rect x="68" y="58" width="64" height="12" rx="3" fill="#34d399" opacity="0.5" />
            <rect x="68" y="76" width="48" height="10" rx="3" fill="#34d399" opacity="0.35" />
            <rect x="68" y="92" width="56" height="10" rx="3" fill="#34d399" opacity="0.25" />
            <path d="M45 115 L155 115" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
          </>
        ) : (
          <>
            <path
              d="M20 100 Q 55 40, 90 70 T 160 45 L 180 100 Z"
              fill="#dbeafe"
              opacity="0.6"
            />
            <path
              d="M20 100 L 50 85 L 80 92 L 110 60 L 140 75 L 180 55 L 180 100 Z"
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <circle cx="110" cy="60" r="5" fill="#2563eb" />
            <circle cx="140" cy="75" r="5" fill="#2563eb" />
            <circle cx="50" cy="85" r="5" fill="#2563eb" />
          </>
        )}
      </svg>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}
