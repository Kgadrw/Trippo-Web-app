import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FEATURE_COLOR_CLASSES,
  pickLocalized,
  type HomepageFeatureItem,
  type HomepagePartnerItem,
  type HomepagePricingPlanItem,
  type HomepageTestimonialItem,
} from "@/lib/homepageContent";

export function FeaturePreviewCard({ feature }: { feature: HomepageFeatureItem }) {
  const badge = pickLocalized(feature.badge) || "Badge label";
  const description = pickLocalized(feature.description) || "Description text";

  return (
    <div
      className={cn(
        "border border-gray-200 bg-gray-100 p-4 transition-opacity",
        !feature.enabled && "opacity-40",
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-full",
            FEATURE_COLOR_CLASSES[feature.color] || FEATURE_COLOR_CLASSES.blue,
          )}
        >
          {badge}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
    </div>
  );
}

export function TestimonialPreviewCard({ item }: { item: HomepageTestimonialItem }) {
  const quote = pickLocalized(item.quote) || "Testimonial quote";
  const attribution = pickLocalized(item.attribution) || "Name · Location";

  return (
    <div className={cn("bg-gray-50 p-6 transition-opacity", !item.enabled && "opacity-40")}>
      <p className="text-sm text-gray-700 leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
          <User size={20} className="text-gray-600" />
        </div>
        <p className="text-sm text-gray-900">{attribution}</p>
      </div>
    </div>
  );
}

export function PartnerPreviewCard({ partner }: { partner: HomepagePartnerItem }) {
  const name = pickLocalized(partner.name) || "Partner";

  return (
    <div
      className={cn(
        "flex items-center justify-center p-6 bg-white border border-gray-200 rounded-lg min-h-[100px] transition-opacity",
        !partner.enabled && "opacity-40",
      )}
    >
      {partner.logoUrl ? (
        <img src={partner.logoUrl} alt={name} className="h-16 w-auto object-contain max-w-full" />
      ) : (
        <span className="text-sm text-muted-foreground">{name}</span>
      )}
    </div>
  );
}

export function PricingPreviewCard({ plan }: { plan: HomepagePricingPlanItem }) {
  const name = pickLocalized(plan.name) || "Plan name";
  const priceSuffix = pickLocalized(plan.priceSuffix);
  const ctaLabel = pickLocalized(plan.ctaLabel) || "Get started";
  const features = plan.features.map((f) => pickLocalized(f)).filter(Boolean);

  if (plan.isPlaceholder) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-xs text-muted-foreground min-h-[180px] flex items-center justify-center opacity-30">
        Coming soon placeholder
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border border-gray-200 bg-gray-100 p-4 flex flex-col min-h-[220px] transition-opacity",
        !plan.enabled && "opacity-40",
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          {name}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-3">
        {plan.price ? (
          <>
            <span className="font-semibold text-lg">{plan.price}</span>
            {priceSuffix ? <span className="text-xs text-gray-500 ml-1">{priceSuffix}</span> : null}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Price</span>
        )}
      </p>
      {features.length > 0 ? (
        <ul className="text-sm text-gray-700 space-y-2 leading-relaxed mb-4 flex-grow">
          {features.map((feature, index) => (
            <li key={`${plan.id}-preview-${index}`}>• {feature}</li>
          ))}
        </ul>
      ) : (
        <div className="flex-grow" />
      )}
      <Button type="button" variant="outline" size="sm" className="w-full mt-auto pointer-events-none">
        {ctaLabel}
      </Button>
    </div>
  );
}
