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
  Clock3,
  Instagram,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

type Channel = {
  id: string;
  href: string;
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  external?: boolean;
  preferred?: boolean;
};

function ChannelRow({ channel }: { channel: Channel }) {
  return (
    <a
      href={channel.href}
      target={channel.external ? "_blank" : undefined}
      rel={channel.external ? "noopener noreferrer" : undefined}
      className={cn(
        "group flex items-center gap-3 border-b border-gray-100 px-1 py-3.5 last:border-b-0",
        "transition-colors hover:bg-gray-50/80",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
        {channel.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{channel.label}</p>
          {channel.preferred ? (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
              Fastest
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-800">{channel.value}</p>
        <p className="mt-0.5 text-xs text-gray-500">{channel.hint}</p>
      </div>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-gray-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gray-600"
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

  const channels: Channel[] = [
    whatsapp
      ? {
          id: "whatsapp",
          href: whatsappHref(whatsapp),
          label: "WhatsApp",
          value: whatsapp,
          hint: "Usually the quickest reply during business hours",
          icon: <MessageCircle size={18} />,
          external: true,
          preferred: true,
        }
      : null,
    phone
      ? {
          id: "phone",
          href: phoneTelHref(phone),
          label: t("phone"),
          value: phone,
          hint: "Call for urgent account or billing help",
          icon: <Phone size={18} />,
        }
      : null,
    email
      ? {
          id: "email",
          href: `mailto:${email}`,
          label: t("email"),
          value: email,
          hint: "Best for detailed questions and screenshots",
          icon: <Mail size={18} />,
        }
      : null,
    instagram
      ? {
          id: "instagram",
          href: instagram,
          label: "Instagram",
          value: instagramHandle ? `@${instagramHandle}` : "Instagram",
          hint: "Product updates and announcements",
          icon: <Instagram size={18} />,
          external: true,
        }
      : null,
  ].filter((item): item is Channel => item !== null);

  const primary = channels.find((channel) => channel.preferred) || channels[0] || null;

  return (
    <div className={embedded ? "pb-4" : "px-4 pb-6 lg:px-6"}>
      {!embedded ? (
        <SettingsSubpageHeader
          icon={LifeBuoy}
          title={t("settingsHelpSupport")}
          description={t("settingsHelpSupportDesc")}
        />
      ) : null}

      <div className="mx-auto max-w-xl space-y-6">
        {embedded ? (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900">{t("callSupport")}</h3>
            <p className="text-xs leading-relaxed text-gray-500">{t("settingsHelpSupportDesc")}</p>
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-gray-600 ring-1 ring-gray-200">
            <Clock3 size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">We’re here to help</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              Share your account email and a short description of the issue so we can assist faster.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : channels.length > 0 ? (
          <>
            {primary ? (
              <a
                href={primary.href}
                target={primary.external ? "_blank" : undefined}
                rel={primary.external ? "noopener noreferrer" : undefined}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5",
                  "border border-sky-400 bg-sky-400 text-sm font-semibold text-white",
                  "transition-colors hover:bg-sky-500",
                )}
              >
                {primary.id === "whatsapp" ? <MessageCircle size={16} /> : null}
                {primary.id === "phone" ? <Phone size={16} /> : null}
                {primary.id === "email" ? <Mail size={16} /> : null}
                Contact via {primary.label}
              </a>
            ) : null}

            <div>
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Contact options</p>
                  <p className="text-xs text-gray-500">Choose the channel that works best for you</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white px-3">
                {channels.map((channel) => (
                  <ChannelRow key={channel.id} channel={channel} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <PlatformContactCard contact={contact} title={t("callSupport")} />
        )}

        <p className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {company}
        </p>
      </div>
    </div>
  );
}
