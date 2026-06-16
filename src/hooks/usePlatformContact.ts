import { useCallback, useEffect, useState } from "react";
import { contentApi } from "@/lib/api";
import { DEFAULT_PLATFORM_CONTACT, type PlatformContact } from "@/lib/platformContact";

let cachedContact: PlatformContact | null = null;
let inflight: Promise<PlatformContact> | null = null;

async function fetchPlatformContact(): Promise<PlatformContact> {
  if (cachedContact) return cachedContact;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await contentApi.getContact();
      const data = res.data as Partial<PlatformContact>;
      cachedContact = {
        companyName: data.companyName || DEFAULT_PLATFORM_CONTACT.companyName,
        supportEmail: data.supportEmail || "",
        supportPhone: data.supportPhone || DEFAULT_PLATFORM_CONTACT.supportPhone,
        whatsappNumber: data.whatsappNumber || data.supportPhone || DEFAULT_PLATFORM_CONTACT.whatsappNumber,
        instagramUrl: data.instagramUrl || DEFAULT_PLATFORM_CONTACT.instagramUrl,
      };
      return cachedContact;
    } catch {
      cachedContact = { ...DEFAULT_PLATFORM_CONTACT };
      return cachedContact;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function usePlatformContact() {
  const [contact, setContact] = useState<PlatformContact>(cachedContact || DEFAULT_PLATFORM_CONTACT);
  const [loading, setLoading] = useState(!cachedContact);

  const refresh = useCallback(async () => {
    cachedContact = null;
    setLoading(true);
    try {
      const next = await fetchPlatformContact();
      setContact(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedContact) {
      setContact(cachedContact);
      setLoading(false);
      return;
    }
    void fetchPlatformContact().then((next) => {
      setContact(next);
      setLoading(false);
    });
  }, []);

  return { contact, loading, refresh };
}
