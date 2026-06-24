import { getSubdomainUrl } from "@/hooks/useSubdomain";

export type AppSubdomain = "admin" | "bookfy" | null;

const LEGACY_APP_SUBDOMAIN = "dashboard";

function resolveAppSubdomainLabel(hostname: string): "bookfy" | null {
  const cleanHostname = hostname.replace(/^www\./, "");
  const parts = cleanHostname.split(".");

  if (parts.length >= 3 && parts[parts.length - 2] === "trippo" && parts[parts.length - 1] === "rw") {
    if (parts[0] === "bookfy" || parts[0] === LEGACY_APP_SUBDOMAIN) return "bookfy";
  }

  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    if (parts[0] === "bookfy" || parts[0] === LEGACY_APP_SUBDOMAIN) return "bookfy";
  }

  return null;
}

/** Detect subdomain from hostname (mirrors useSubdomain hook). */
export function detectSubdomain(): AppSubdomain {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname.replace(/^www\./, "");
  if (hostname === "trippo.rw" || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  if (hostname.split(".")[0] === "admin") return "admin";
  if (resolveAppSubdomainLabel(hostname)) return "bookfy";

  return null;
}

/** App home path or full URL for the current origin. */
export function getDashboardPath(subdomain: AppSubdomain = detectSubdomain()): string {
  if (subdomain === "bookfy") return "/";
  return getSubdomainUrl("bookfy", "/");
}

/** Normalize stored notification / legacy routes for react-router navigation. */
export function resolveAppRoute(route: string, subdomain: AppSubdomain = detectSubdomain()): string {
  if (!route) return getDashboardPath(subdomain);
  if (route === "/dashboard") return getDashboardPath(subdomain);
  if (route === "/admin") return "/admin-dashboard";
  return route;
}
