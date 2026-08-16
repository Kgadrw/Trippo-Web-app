import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PAGE_TITLES: Array<[RegExp, string]> = [
  [/^\/login$/, "Sign in"],
  [/^\/reports/, "Team Reporting"],
  [/^\/projects/, "Projects & Team Progress"],
  [/^\/products/, "Inventory & Stock"],
  [/^\/sales/, "Sales"],
  [/^\/finance\/income/, "Income"],
  [/^\/finance\/expenditure/, "Expenses"],
  [/^\/finance\/invoices/, "Invoices"],
  [/^\/finance\/payroll/, "Payroll"],
  [/^\/finance/, "Business Finance"],
  [/^\/team/, "Team Tasks"],
  [/^\/hr/, "People & HR"],
  [/^\/calendar/, "Calendar & Reminders"],
  [/^\/documents/, "Documents"],
  [/^\/assets/, "Assets"],
  [/^\/approvals/, "Approvals"],
  [/^\/messages/, "Team Messages"],
  [/^\/settings/, "Settings"],
  [/^\/billing/, "Billing"],
  [/^\/$/, "Business Dashboard"],
];

function pageTitle(pathname: string) {
  return PAGE_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] || "Business Workspace";
}

/**
 * Gives users meaningful browser-tab titles. The authenticated app is not a
 * public search landing page, so it also asks crawlers not to index it.
 */
export function SeoPageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isPublicSite = hostname === "trippo.rw" || hostname === "www.trippo.rw";
    const isHomepage = pathname === "/";

    document.title =
      isPublicSite && isHomepage
        ? "Trippo | Inventory, Sales, Finance & Team Management for Businesses"
        : `${pageTitle(pathname)} | Trippo`;

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = isPublicSite && isHomepage ? "index, follow" : "noindex, nofollow";
  }, [pathname]);

  return null;
}
