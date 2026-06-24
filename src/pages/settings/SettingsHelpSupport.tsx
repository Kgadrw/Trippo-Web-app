import type { ReactNode } from "react";
import { PlatformContactCard } from "@/components/support/PlatformContactCard";
import { usePlatformContact } from "@/hooks/usePlatformContact";
import { useTranslation } from "@/hooks/useTranslation";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatPhoneDisplay,
  instagramHref,
  phoneTelHref,
  whatsappHref,
} from "@/lib/platformContact";
import {
  ArrowUpRight,
  Headphones,
  Instagram,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

type ChannelCardProps = {
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
  accentClass: string;
  external?: boolean;
};

function ChannelCard({ href, label, value, icon, accentClass, external = false }: ChannelCardProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4",
        "transition-colors hover:border-gray-300 hover:bg-gray-50/80",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          accentClass,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{value}</p>
      </div>
      <ArrowUpRight
        size={16}
        className="mt-1 shrink-0 text-gray-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gray-600"
      />
    </a>
  );
}

export default function SettingsHelpSupport({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { contact, loading } = usePlatformContact();

  const phone = formatPhoneDisplay(contact.supportPhone);
  const whatsapp = formatPhoneDisplay(contact.whatsappNumber || contact.supportPhone);
  const email = contact.supportEmail?.trim();
  const instagram = instagramHref(contact.instagramUrl);
  const instagramHandle = contact.instagramUrl
    ?.trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split("/")[0];
  const company = contact.companyName || "Trippo";

  const channels: ChannelCardProps[] = [
    phone
      ? {
          href: phoneTelHref(phone),
          label: t("phone"),
          value: phone,
          icon: <Phone size={18} className="text-blue-700" />,
          accentClass: "bg-blue-50",
        }
      : null,
    whatsapp
      ? {
          href: whatsappHref(whatsapp),
          label: "WhatsApp",
          value: whatsapp,
          icon: <MessageCircle size={18} className="text-green-700" />,
          accentClass: "bg-green-50",
          external: true,
        }
      : null,
    email
      ? {
          href: `mailto:${email}`,
          label: t("email"),
          value: email,
          icon: <Mail size={18} className="text-violet-700" />,
          accentClass: "bg-violet-50",
        }
      : null,
    instagram
      ? {
          href: instagram,
          label: "Instagram",
          value: instagramHandle ? `@${instagramHandle}` : "Instagram",
          icon: <Instagram size={18} className="text-pink-700" />,
          accentClass: "bg-pink-50",
          external: true,
        }
      : null,
  ].filter((item): item is ChannelCardProps => item !== null);

  const primaryHref = whatsapp ? whatsappHref(whatsapp) : phone ? phoneTelHref(phone) : null;
  const primaryLabel = whatsapp ? "WhatsApp" : t("phone");
  const primaryValue = whatsapp || phone;

  return (
    <div className="space-y-5">
      {!embedded ? (
        <SettingsSubpageHeader icon={LifeBuoy} title={t("settingsHelpSupport")} />
      ) : null}

      <div className={embedded ? "space-y-5 pb-4" : "space-y-5 px-4 pb-6 lg:px-0"}>
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
              <Headphones size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">{t("callSupport")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {t("settingsHelpSupportDesc")}
              </p>
            </div>
          </div>

          {!loading && primaryHref && primaryValue ? (
            <a
              href={primaryHref}
              target={whatsapp ? "_blank" : undefined}
              rel={whatsapp ? "noopener noreferrer" : undefined}
              className={cn(
                "mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5",
                "bg-gray-900 text-sm font-semibold text-white",
                "transition-colors hover:bg-gray-800",
              )}
            >
              {whatsapp ? <MessageCircle size={16} /> : <Phone size={16} />}
              {primaryLabel} · {primaryValue}
            </a>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : channels.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("settingsHelpSupport")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {channels.map((channel) => (
                <ChannelCard key={channel.label} {...channel} />
              ))}
            </div>
          </div>
        ) : (
          <PlatformContactCard contact={contact} title={t("callSupport")} />
        )}

        <p className="text-center text-xs text-gray-500">{company}</p>
      </div>
    </div>
  );
}
