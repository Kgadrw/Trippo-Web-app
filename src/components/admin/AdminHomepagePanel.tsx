import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_PANEL_CLASS } from "@/components/admin/adminStyles";
import {
  FeaturePreviewCard,
  PartnerPreviewCard,
  PricingPreviewCard,
  TestimonialPreviewCard,
} from "@/components/admin/AdminHomepageCardPreview";
import {
  emptyLocalized,
  newHomepageId,
  type HomepageContentDocument,
  type HomepageFeatureItem,
  type HomepagePartnerItem,
  type HomepagePricingPlanItem,
  type HomepageTestimonialItem,
  type LocalizedString,
} from "@/lib/homepageContent";

type SectionKey = "features" | "testimonials" | "partners" | "pricing";

const SECTION_META: Record<SectionKey, { label: string; hint: string }> = {
  features: {
    label: "Features",
    hint: "These cards appear in the Features section on the homepage.",
  },
  testimonials: {
    label: "Testimonials",
    hint: "Quotes appear over the testimonial background image.",
  },
  partners: {
    label: "Partners",
    hint: "Partner logos are shown in a row under Our Partners.",
  },
  pricing: {
    label: "Pricing",
    hint: "Plans appear as pricing cards. Use placeholder for coming-soon slots.",
  },
};

function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: LocalizedString;
  onChange: (next: LocalizedString) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const fieldValue = value.en ?? "";
  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      <InputComponent
        value={fieldValue}
        onChange={(e) => onChange({ en: e.target.value })}
        placeholder={placeholder}
        className={cn("bg-white", multiline ? "min-h-[88px]" : "h-10")}
      />
    </div>
  );
}

function EditorShell({
  title,
  onDelete,
  preview,
  children,
}: {
  title: string;
  onDelete: () => void;
  preview: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden", ADMIN_PANEL_CLASS)}>
      <div className="flex items-center justify-between gap-3 bg-gray-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-normal text-gray-800">{title}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2">
        <div className="bg-gradient-to-br from-stone-50 to-white p-4">
          <p className="mb-3 text-[11px] font-normal uppercase tracking-wider text-gray-500">
            Card preview
          </p>
          {preview}
        </div>
        <div className="space-y-4 p-4">
          <p className="text-[11px] font-normal uppercase tracking-wider text-gray-500">
            Edit content
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminHomepagePanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<SectionKey>("features");
  const [content, setContent] = useState<HomepageContentDocument | null>(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getHomepageContent();
      setContent(res.data as HomepageContentDocument);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load homepage content";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    try {
      await adminApi.updateHomepageContent({
        testimonialBackgroundUrl: content.testimonialBackgroundUrl,
        features: content.features,
        testimonials: content.testimonials,
        partners: content.partners,
        pricingPlans: content.pricingPlans,
      });
      toast({ title: "Saved", description: "Homepage content updated successfully." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save homepage content";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (id: string, patch: Partial<HomepageFeatureItem>) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            features: prev.features.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          }
        : prev,
    );
  };

  const updateTestimonial = (id: string, patch: Partial<HomepageTestimonialItem>) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            testimonials: prev.testimonials.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : prev,
    );
  };

  const updatePartner = (id: string, patch: Partial<HomepagePartnerItem>) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            partners: prev.partners.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          }
        : prev,
    );
  };

  const updatePricingPlan = (id: string, patch: Partial<HomepagePricingPlanItem>) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            pricingPlans: prev.pricingPlans.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : prev,
    );
  };

  if (loading || !content) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-normal text-gray-900">Homepage Content</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit homepage content. Each card preview updates as you type.
          </p>
        </div>
        <Button onClick={() => void handleSave()} disabled={saving} className="gap-2 shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SECTION_META) as SectionKey[]).map((key) => (
            <Button
              key={key}
              type="button"
              variant={section === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSection(key)}
            >
              {SECTION_META[key].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
        {SECTION_META[section].hint}
      </div>

      <div className="space-y-4">
        {section === "features" && (
          <>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 bg-white"
                onClick={() =>
                  setContent((prev) =>
                    prev
                      ? {
                          ...prev,
                          features: [
                            ...prev.features,
                            {
                              id: newHomepageId("feature"),
                              badge: emptyLocalized(),
                              description: emptyLocalized(),
                              color: "blue",
                              enabled: true,
                              order: prev.features.length,
                            },
                          ],
                        }
                      : prev,
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Add feature
              </Button>
            </div>
            {content.features.map((feature, index) => (
              <EditorShell
                key={feature.id}
                title={`Feature ${index + 1}`}
                onDelete={() =>
                  setContent((prev) =>
                    prev
                      ? { ...prev, features: prev.features.filter((f) => f.id !== feature.id) }
                      : prev,
                  )
                }
                preview={<FeaturePreviewCard feature={feature} />}
              >
                <LocalizedField
                  label="Badge label"
                  value={feature.badge}
                  onChange={(badge) => updateFeature(feature.id, { badge })}
                  placeholder="Services & Stock"
                />
                <LocalizedField
                  label="Description"
                  value={feature.description}
                  multiline
                  onChange={(description) => updateFeature(feature.id, { description })}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Badge color</Label>
                    <Select
                      value={feature.color}
                      onValueChange={(color) =>
                        updateFeature(feature.id, {
                          color: color as HomepageFeatureItem["color"],
                        })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Display order</Label>
                    <Input
                      type="number"
                      className="bg-white"
                      value={feature.order}
                      onChange={(e) =>
                        updateFeature(feature.id, { order: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <Checkbox
                    checked={feature.enabled}
                    onCheckedChange={(checked) =>
                      updateFeature(feature.id, { enabled: checked === true })
                    }
                  />
                  Show on homepage
                </label>
              </EditorShell>
            ))}
          </>
        )}

        {section === "testimonials" && (
          <>
            <div className={cn("p-4", ADMIN_PANEL_CLASS)}>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Background image URL</Label>
                <Input
                  className="bg-white"
                  value={content.testimonialBackgroundUrl}
                  onChange={(e) =>
                    setContent((prev) =>
                      prev ? { ...prev, testimonialBackgroundUrl: e.target.value } : prev,
                    )
                  }
                  placeholder="/testmonial.webp"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 bg-white"
                onClick={() =>
                  setContent((prev) =>
                    prev
                      ? {
                          ...prev,
                          testimonials: [
                            ...prev.testimonials,
                            {
                              id: newHomepageId("testimonial"),
                              quote: emptyLocalized(),
                              attribution: emptyLocalized(),
                              enabled: true,
                              order: prev.testimonials.length,
                            },
                          ],
                        }
                      : prev,
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Add testimonial
              </Button>
            </div>
            {content.testimonials.map((item, index) => (
              <EditorShell
                key={item.id}
                title={`Testimonial ${index + 1}`}
                onDelete={() =>
                  setContent((prev) =>
                    prev
                      ? {
                          ...prev,
                          testimonials: prev.testimonials.filter((t) => t.id !== item.id),
                        }
                      : prev,
                  )
                }
                preview={<TestimonialPreviewCard item={item} />}
              >
                <LocalizedField
                  label="Quote"
                  value={item.quote}
                  multiline
                  onChange={(quote) => updateTestimonial(item.id, { quote })}
                />
                <LocalizedField
                  label="Attribution"
                  value={item.attribution}
                  onChange={(attribution) => updateTestimonial(item.id, { attribution })}
                  placeholder="Name · Location"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <Checkbox
                    checked={item.enabled}
                    onCheckedChange={(checked) =>
                      updateTestimonial(item.id, { enabled: checked === true })
                    }
                  />
                  Show on homepage
                </label>
              </EditorShell>
            ))}
          </>
        )}

        {section === "partners" && (
          <>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 bg-white"
                onClick={() =>
                  setContent((prev) =>
                    prev
                      ? {
                          ...prev,
                          partners: [
                            ...prev.partners,
                            {
                              id: newHomepageId("partner"),
                              name: emptyLocalized(),
                              logoUrl: "",
                              websiteUrl: "",
                              enabled: true,
                              order: prev.partners.length,
                            },
                          ],
                        }
                      : prev,
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Add partner
              </Button>
            </div>
            {content.partners.map((partner, index) => (
              <EditorShell
                key={partner.id}
                title={`Partner ${index + 1}`}
                onDelete={() =>
                  setContent((prev) =>
                    prev
                      ? { ...prev, partners: prev.partners.filter((p) => p.id !== partner.id) }
                      : prev,
                  )
                }
                preview={<PartnerPreviewCard partner={partner} />}
              >
                <LocalizedField
                  label="Partner name"
                  value={partner.name}
                  onChange={(name) => updatePartner(partner.id, { name })}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Logo URL</Label>
                    <Input
                      className="bg-white"
                      value={partner.logoUrl}
                      onChange={(e) => updatePartner(partner.id, { logoUrl: e.target.value })}
                      placeholder="/lindo.png"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Website URL</Label>
                    <Input
                      className="bg-white"
                      value={partner.websiteUrl || ""}
                      onChange={(e) => updatePartner(partner.id, { websiteUrl: e.target.value })}
                      placeholder="https://"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <Checkbox
                    checked={partner.enabled}
                    onCheckedChange={(checked) =>
                      updatePartner(partner.id, { enabled: checked === true })
                    }
                  />
                  Show on homepage
                </label>
              </EditorShell>
            ))}
          </>
        )}

        {section === "pricing" && (
          <>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 bg-white"
                onClick={() =>
                  setContent((prev) =>
                    prev
                      ? {
                          ...prev,
                          pricingPlans: [
                            ...prev.pricingPlans,
                            {
                              id: newHomepageId("plan"),
                              name: emptyLocalized(),
                              price: "",
                              priceSuffix: emptyLocalized(),
                              features: [],
                              ctaLabel: emptyLocalized(),
                              enabled: true,
                              isPlaceholder: false,
                              order: prev.pricingPlans.length,
                            },
                          ],
                        }
                      : prev,
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Add plan
              </Button>
            </div>
            {content.pricingPlans.map((plan, index) => (
              <EditorShell
                key={plan.id}
                title={`Plan ${index + 1}`}
                onDelete={() =>
                  setContent((prev) =>
                    prev
                      ? {
                          ...prev,
                          pricingPlans: prev.pricingPlans.filter((p) => p.id !== plan.id),
                        }
                      : prev,
                  )
                }
                preview={<PricingPreviewCard plan={plan} />}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <LocalizedField
                    label="Plan name"
                    value={plan.name}
                    onChange={(name) => updatePricingPlan(plan.id, { name })}
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Price</Label>
                    <Input
                      className="bg-white"
                      value={plan.price}
                      onChange={(e) => updatePricingPlan(plan.id, { price: e.target.value })}
                      placeholder="$0"
                    />
                  </div>
                </div>
                <LocalizedField
                  label="Price suffix"
                  value={plan.priceSuffix}
                  onChange={(priceSuffix) => updatePricingPlan(plan.id, { priceSuffix })}
                  placeholder="/month"
                />
                <LocalizedField
                  label="Button label"
                  value={plan.ctaLabel}
                  onChange={(ctaLabel) => updatePricingPlan(plan.id, { ctaLabel })}
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600">Plan features</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 bg-white"
                      onClick={() =>
                        updatePricingPlan(plan.id, {
                          features: [...plan.features, emptyLocalized()],
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {plan.features.map((feature, featureIndex) => (
                    <div key={`${plan.id}-feature-${featureIndex}`} className="flex gap-2">
                      <div className="flex-1">
                        <LocalizedField
                          label={`Feature ${featureIndex + 1}`}
                          value={feature}
                          onChange={(next) => {
                            const features = [...plan.features];
                            features[featureIndex] = next;
                            updatePricingPlan(plan.id, { features });
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 text-red-600"
                        onClick={() =>
                          updatePricingPlan(plan.id, {
                            features: plan.features.filter((_, i) => i !== featureIndex),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <Checkbox
                      checked={plan.enabled}
                      onCheckedChange={(checked) =>
                        updatePricingPlan(plan.id, { enabled: checked === true })
                      }
                    />
                    Show on homepage
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <Checkbox
                      checked={plan.isPlaceholder}
                      onCheckedChange={(checked) =>
                        updatePricingPlan(plan.id, { isPlaceholder: checked === true })
                      }
                    />
                    Placeholder card
                  </label>
                </div>
                {plan.isPlaceholder ? (
                  <Badge variant="secondary" className="w-fit">
                    Empty coming-soon card on the homepage
                  </Badge>
                ) : null}
              </EditorShell>
            ))}
          </>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
