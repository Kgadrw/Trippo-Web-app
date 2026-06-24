import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, Shield, CreditCard, Building2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { displayCurrencyCode } from "@/lib/currency";
import { ADMIN_PANEL_CLASS, ADMIN_TITLE_CLASS } from "@/components/admin/adminStyles";

export type PlatformSettings = {
  adminEmail: string;
  subscriptionAmount: number;
  trialDays: number;
  currency: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
  companyName: string;
  maintenanceMode: boolean;
  updatedAt?: string;
};

type SettingsForm = {
  adminEmail: string;
  currentPin: string;
  newPin: string;
  confirmNewPin: string;
  subscriptionAmount: string;
  trialDays: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
  companyName: string;
  maintenanceMode: boolean;
};

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>
      <div>
        <h3 className={cn("text-base text-gray-900", ADMIN_TITLE_CLASS)}>{title}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function PinInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-gray-600">
        {label}
      </Label>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder={placeholder}
        className="h-10 bg-white"
      />
    </div>
  );
}

export function AdminSettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    adminEmail: "",
    currentPin: "",
    newPin: "",
    confirmNewPin: "",
    subscriptionAmount: "10000",
    trialDays: "7",
    supportEmail: "",
    supportPhone: "",
    whatsappNumber: "",
    instagramUrl: "",
    companyName: "Trippo",
    maintenanceMode: false,
  });

  const applySettings = useCallback((data: PlatformSettings) => {
    setSettings(data);
    setForm((prev) => ({
      ...prev,
      adminEmail: data.adminEmail,
      subscriptionAmount: String(data.subscriptionAmount),
      trialDays: String(data.trialDays),
      supportEmail: data.supportEmail || "",
      supportPhone: data.supportPhone || "",
      whatsappNumber: data.whatsappNumber || "",
      instagramUrl: data.instagramUrl || "",
      companyName: data.companyName || "Trippo",
      maintenanceMode: Boolean(data.maintenanceMode),
      currentPin: "",
      newPin: "",
      confirmNewPin: "",
    }));
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPlatformSettings();
      applySettings(res.data as PlatformSettings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load settings";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [applySettings, toast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const patchForm = (patch: Partial<SettingsForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    if (!form.currentPin || form.currentPin.length !== 4) {
      toast({
        title: "PIN required",
        description: "Enter your current 4-digit PIN to save changes.",
        variant: "destructive",
      });
      return;
    }

    if (form.newPin && form.newPin !== form.confirmNewPin) {
      toast({
        title: "PIN mismatch",
        description: "New PIN and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await adminApi.updatePlatformSettings({
        currentPin: form.currentPin,
        adminEmail: form.adminEmail.trim(),
        newPin: form.newPin || undefined,
        confirmNewPin: form.confirmNewPin || undefined,
        subscriptionAmount: Number(form.subscriptionAmount),
        trialDays: Number(form.trialDays),
        supportEmail: form.supportEmail.trim(),
        supportPhone: form.supportPhone.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        instagramUrl: form.instagramUrl.trim(),
        companyName: form.companyName.trim(),
        maintenanceMode: form.maintenanceMode,
      });
      applySettings(res.data as PlatformSettings);
      toast({ title: "Saved", description: "Platform settings updated successfully." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="admin-panel space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={cn("text-xl text-gray-900", ADMIN_TITLE_CLASS)}>Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage admin login, subscription pricing, and platform options.
          </p>
          {settings?.updatedAt && (
            <p className="mt-1 text-xs text-gray-400">
              Last updated {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="shrink-0">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <div className={cn("overflow-hidden", ADMIN_PANEL_CLASS)}>
        <SectionHeader
          icon={Shield}
          title="Login credentials"
          description="Change the email and PIN used to sign in to the admin portal."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="admin-email" className="text-xs text-gray-600">
              Admin email
            </Label>
            <Input
              id="admin-email"
              type="email"
              value={form.adminEmail}
              onChange={(e) => patchForm({ adminEmail: e.target.value })}
              className="h-10 bg-white"
              autoComplete="email"
            />
          </div>
          <PinInput
            id="current-pin"
            label="Current PIN (required to save)"
            value={form.currentPin}
            onChange={(value) => patchForm({ currentPin: value })}
            placeholder="••••"
          />
          <div className="hidden sm:block" />
          <PinInput
            id="new-pin"
            label="New PIN (optional)"
            value={form.newPin}
            onChange={(value) => patchForm({ newPin: value })}
            placeholder="Leave blank to keep current"
          />
          <PinInput
            id="confirm-pin"
            label="Confirm new PIN"
            value={form.confirmNewPin}
            onChange={(value) => patchForm({ confirmNewPin: value })}
            placeholder="Repeat new PIN"
          />
        </div>
      </div>

      <div className={cn("overflow-hidden", ADMIN_PANEL_CLASS)}>
        <SectionHeader
          icon={CreditCard}
          title="Subscription"
          description="Set the monthly subscription amount and free trial length for new users."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="subscription-amount" className="text-xs text-gray-600">
              Subscription amount ({displayCurrencyCode(settings?.currency)})
            </Label>
            <Input
              id="subscription-amount"
              type="number"
              min={0}
              step={100}
              value={form.subscriptionAmount}
              onChange={(e) => patchForm({ subscriptionAmount: e.target.value })}
              className="h-10 bg-white"
            />
            <p className="text-xs text-gray-400">Default is 10,000 Rwf per month.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trial-days" className="text-xs text-gray-600">
              Trial days
            </Label>
            <Input
              id="trial-days"
              type="number"
              min={0}
              max={90}
              value={form.trialDays}
              onChange={(e) => patchForm({ trialDays: e.target.value })}
              className="h-10 bg-white"
            />
            <p className="text-xs text-gray-400">Number of free trial days (0–90).</p>
          </div>
        </div>
      </div>

      <div className={cn("overflow-hidden", ADMIN_PANEL_CLASS)}>
        <SectionHeader
          icon={Phone}
          title="Contact & support"
          description="Phone, email, and social links shown in the footer, billing help, and Settings → Help & support."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="support-phone" className="text-xs text-gray-600">
              Support phone
            </Label>
            <Input
              id="support-phone"
              value={form.supportPhone}
              onChange={(e) => patchForm({ supportPhone: e.target.value })}
              className="h-10 bg-white"
              placeholder="0791998365"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp-number" className="text-xs text-gray-600">
              WhatsApp number
            </Label>
            <Input
              id="whatsapp-number"
              value={form.whatsappNumber}
              onChange={(e) => patchForm({ whatsappNumber: e.target.value })}
              className="h-10 bg-white"
              placeholder="0791998365"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support-email-contact" className="text-xs text-gray-600">
              Support email
            </Label>
            <Input
              id="support-email-contact"
              type="email"
              value={form.supportEmail}
              onChange={(e) => patchForm({ supportEmail: e.target.value })}
              className="h-10 bg-white"
              placeholder="support@trippo.rw"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram-url" className="text-xs text-gray-600">
              Instagram URL or handle
            </Label>
            <Input
              id="instagram-url"
              value={form.instagramUrl}
              onChange={(e) => patchForm({ instagramUrl: e.target.value })}
              className="h-10 bg-white"
              placeholder="https://instagram.com/trippoltd"
            />
          </div>
        </div>
      </div>

      <div className={cn("overflow-hidden", ADMIN_PANEL_CLASS)}>
        <SectionHeader
          icon={Building2}
          title="Platform"
          description="General platform details and operational toggles."
        />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company-name" className="text-xs text-gray-600">
                Company name
              </Label>
              <Input
                id="company-name"
                value={form.companyName}
                onChange={(e) => patchForm({ companyName: e.target.value })}
                className="h-10 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm text-gray-800">Maintenance mode</p>
              <p className="text-xs text-gray-500">
                When enabled, regular users may be blocked from using the app.
              </p>
            </div>
            <Switch
              checked={form.maintenanceMode}
              onCheckedChange={(checked) => patchForm({ maintenanceMode: checked })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
