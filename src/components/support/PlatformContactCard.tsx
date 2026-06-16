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

  const hasAny = Boolean(phone || whatsapp || email || instagram);
  if (!hasAny) return null;

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3", className)}>
      {title ? <h3 className="text-sm font-semibold text-gray-900">{title}</h3> : null}
      {description ? (
        <p className="text-xs text-muted-foreground">
          <TextWithUssdCodes text={description} />
        </p>
      ) : null}

      <div className={cn("flex flex-col gap-2", compact ? "text-sm" : "text-sm sm:text-base")}>
        {phone ? (
          <a
            href={phoneTelHref(phone)}
            className="inline-flex items-center gap-2 text-gray-900 hover:text-blue-700 transition-colors"
          >
            <Phone className="h-4 w-4 shrink-0 text-gray-500" />
            <span>{phone}</span>
          </a>
        ) : null}

        {whatsapp ? (
          <a
            href={whatsappHref(whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-900 hover:text-green-700 transition-colors"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-gray-500" />
            <span>WhatsApp {whatsapp}</span>
          </a>
        ) : null}

        {email ? (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-2 text-gray-900 hover:text-blue-700 transition-colors"
          >
            <Mail className="h-4 w-4 shrink-0 text-gray-500" />
            <span>{email}</span>
          </a>
        ) : null}

        {instagram ? (
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-900 hover:text-pink-600 transition-colors"
          >
            <Instagram className="h-4 w-4 shrink-0 text-gray-500" />
            <span>Instagram</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function PlatformContactFooter({ contact }: { contact: PlatformContact }) {
  const phone = formatPhoneDisplay(contact.supportPhone);
  const instagram = instagramHref(contact.instagramUrl);

  return (
    <footer className="bg-stone-50 border-t border-gray-200" role="contentinfo">
      <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-20 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-6">
            {phone ? (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-600" />
                <a
                  href={phoneTelHref(phone)}
                  className="text-sm text-gray-900 hover:text-gray-600 transition-colors"
                >
                  {phone}
                </a>
              </div>
            ) : null}

            {contact.supportEmail ? (
              <a
                href={`mailto:${contact.supportEmail}`}
                className="text-sm text-gray-900 hover:text-gray-600 transition-colors"
              >
                {contact.supportEmail}
              </a>
            ) : null}

            {instagram ? (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-pink-600 transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5" />
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
