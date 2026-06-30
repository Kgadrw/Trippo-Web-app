export type HomepageLang = "en";

export type LocalizedString = {
  en: string;
};

export type HomepageFeatureItem = {
  id: string;
  badge: LocalizedString;
  description: LocalizedString;
  color: 'blue' | 'green' | 'purple' | 'orange';
  enabled: boolean;
  order: number;
};

export type HomepageTestimonialItem = {
  id: string;
  quote: LocalizedString;
  attribution: LocalizedString;
  enabled: boolean;
  order: number;
};

export type HomepagePartnerItem = {
  id: string;
  name: LocalizedString;
  logoUrl: string;
  websiteUrl?: string;
  enabled: boolean;
  order: number;
};

export type HomepagePricingPlanItem = {
  id: string;
  name: LocalizedString;
  price: string;
  priceSuffix: LocalizedString;
  features: LocalizedString[];
  ctaLabel: LocalizedString;
  enabled: boolean;
  isPlaceholder: boolean;
  order: number;
};

export type HomepageContentDocument = {
  key?: string;
  testimonialBackgroundUrl: string;
  features: HomepageFeatureItem[];
  testimonials: HomepageTestimonialItem[];
  partners: HomepagePartnerItem[];
  pricingPlans: HomepagePricingPlanItem[];
};

export type ResolvedHomepageFeature = {
  id: string;
  badge: string;
  description: string;
  color: HomepageFeatureItem['color'];
};

export type ResolvedHomepageTestimonial = {
  id: string;
  quote: string;
  attribution: string;
};

export type ResolvedHomepagePartner = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
};

export type ResolvedHomepagePricingPlan = {
  id: string;
  name: string;
  price: string;
  priceSuffix: string;
  features: string[];
  ctaLabel: string;
  isPlaceholder: boolean;
};

export type ResolvedHomepageContent = {
  testimonialBackgroundUrl: string;
  features: ResolvedHomepageFeature[];
  testimonials: ResolvedHomepageTestimonial[];
  partners: ResolvedHomepagePartner[];
  pricingPlans: ResolvedHomepagePricingPlan[];
};

export const FEATURE_COLOR_CLASSES: Record<HomepageFeatureItem['color'], string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function emptyLocalized(): LocalizedString {
  return { en: "" };
}

export function pickLocalized(field: LocalizedString | undefined): string {
  return field?.en ?? "";
}

export function newHomepageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
