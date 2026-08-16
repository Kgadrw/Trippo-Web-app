import type { ReactNode } from "react";
import { Mail, Phone, Instagram, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextWithUssdCodes } from "@/components/billing/TextWithUssdCodes";
import {
  formatPhoneDisplay,
  instagramHref,
  phoneTelHref,
  type PlatformContact,
  whatsappHref,
} from "@/lib/platformContact";

type PlatformContactCardProps = {
  contact: PlatformContact;
  className?: string;
  compact?: boolean;
  title?: string;
  description?: string;
};

type ContactRow = {
  key: string;
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
  external?: boolean;
};

function ContactLinkRow({
  href,
  label,
  value,
  icon,
  external,
  isLast,
}: ContactRow & { isLast?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50",
        !isLast && "border-b border-gray-100",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-gray-200 bg-white text-gray-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <span className="block truncate text-sm font-medium text-gray-900">{value}</span>
      </span>
    </a>
  );
}

export function PlatformContactCard({
  contact,
  className,
  compact = false,
  title,
  description,
}: PlatformContactCardProps) {
  const phone = formatPhoneDisplay(contact.supportPhone);
  const whatsapp = formatPhoneDisplay(contact.whatsappNumber || contact.supportPhone);
  const instagram = instagramHref(contact.instagramUrl);
  const email = contact.supportEmail?.trim();

  const rows: ContactRow[] = [];
  if (phone) {
    rows.push({
      key: "phone",
      href: phoneTelHref(phone),
      label: "Phone",
      value: phone,
      icon: <Phone className="h-3.5 w-3.5" />,
    });
  }
  if (whatsapp) {
    rows.push({
      key: "whatsapp",
      href: whatsappHref(whatsapp),
      label: "WhatsApp",
      value: whatsapp,
      icon: <MessageCircle className="h-3.5 w-3.5" />,
      external: true,
    });
  }
  if (email) {
    rows.push({
      key: "email",
      href: `mailto:${email}`,
      label: "Email",
      value: email,
      icon: <Mail className="h-3.5 w-3.5" />,
    });
  }
  if (instagram) {
    rows.push({
      key: "instagram",
      href: instagram,
      label: "Instagram",
      value: "Follow us",
      icon: <Instagram className="h-3.5 w-3.5" />,
      external: true,
    });
  }

  if (!rows.length) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-gray-200 bg-white",
        className,
      )}
    >
      {(title || description) && (
        <div className={cn("border-b border-gray-100 px-3", compact ? "py-2.5" : "py-3")}>
          {title ? (
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          ) : null}
          {description ? (
            <p className={cn("text-xs leading-relaxed text-gray-500", title && "mt-0.5")}>
              <TextWithUssdCodes text={description} />
            </p>
          ) : null}
        </div>
      )}

      <div>
        {rows.map((row, index) => (
          <ContactLinkRow
            key={row.key}
            {...row}
            isLast={index === rows.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

export function PlatformContactFooter({ contact }: { contact: PlatformContact }) {
  const phone = formatPhoneDisplay(contact.supportPhone);
  const instagram = instagramHref(contact.instagramUrl);

  return (
    <footer className="border-t border-gray-200 bg-stone-50" role="contentinfo">
      <div className="mx-auto w-full max-w-none px-4 py-12 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-6">
            {phone ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-600" />
                <a
                  href={phoneTelHref(phone)}
                  className="text-sm text-gray-900 transition-colors hover:text-gray-600"
                >
                  {phone}
                </a>
              </div>
            ) : null}

            {contact.supportEmail ? (
              <a
                href={`mailto:${contact.supportEmail}`}
                className="text-sm text-gray-900 transition-colors hover:text-gray-600"
              >
                {contact.supportEmail}
              </a>
            ) : null}

            {instagram ? (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 transition-colors hover:text-pink-600"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            ) : null}
          </div>

          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} {contact.companyName || "Trippo"}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
