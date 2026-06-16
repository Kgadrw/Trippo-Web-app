export type PlatformContact = {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
};

export const DEFAULT_PLATFORM_CONTACT: PlatformContact = {
  companyName: "Trippo",
  supportEmail: "",
  supportPhone: "0791998365",
  whatsappNumber: "0791998365",
  instagramUrl: "https://instagram.com/trippoltd",
};

export function normalizePhoneDigits(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return "";
  if (digits.startsWith("250") && digits.length >= 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9) return `0${digits}`;
  return phone.trim();
}

export function phoneTelHref(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return "";
  if (digits.startsWith("250")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+250${digits.slice(1)}`;
  return `tel:${phone}`;
}

export function whatsappHref(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return "";
  const intl = digits.startsWith("250") ? digits : `250${digits.replace(/^0/, "")}`;
  return `https://wa.me/${intl}`;
}

export function instagramHref(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  const handle = raw.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}
