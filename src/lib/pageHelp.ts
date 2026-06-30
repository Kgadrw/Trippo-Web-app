import type { Translations } from "@/lib/translations";
import { financeNavItems } from "@/components/finance/financeNavItems";

export type HelpTranslationKey = keyof Translations;

/** Help copy keyed by app route (longest prefix wins for nested paths). */
export const pageHelpByPath: Record<string, HelpTranslationKey> = {
  "/products": "helpProducts",
  "/sales": "helpSales",
  "/documents": "helpDocOverview",
  "/documents/archive": "helpDocArchive",
  "/documents/registry": "helpDocRegistry",
  "/assets": "helpAssets",
  "/approvals": "helpApprovals",
  "/reports": "helpReports",
  "/calendar": "helpCorpCalOverview",
  "/calendar/view": "helpCalendar",
  "/calendar/schedules": "helpAutomations",
  "/calendar/announcements": "helpCorpCalAnnouncements",
  "/team": "helpTeamOverview",
  "/team/tasks": "helpTeamTasks",
  "/hr": "helpHrOverview",
  "/hr/people": "helpTeamMembers",
  "/hr/org-chart": "helpHrOrgChart",
  "/hr/leave": "helpTeamLeave",
  "/projects": "helpProjectOverview",
  "/projects/all": "helpProjectList",
  "/crm": "helpCrmOverview",
  "/crm/pipeline": "helpCrmPipeline",
  "/crm/contacts": "helpCrmContacts",
  "/crm/quotes": "helpCrmQuotes",
  "/crm/contracts": "helpCrmContracts",
  "/expenses": "helpExpenditure",
};

for (const item of financeNavItems) {
  if (item.helpKey) {
    pageHelpByPath[item.to] = item.helpKey;
  }
}

export function resolvePageHelpKey(pathname: string): HelpTranslationKey | undefined {
  if (pageHelpByPath[pathname]) {
    return pageHelpByPath[pathname];
  }

  const sorted = Object.keys(pageHelpByPath).sort((a, b) => b.length - a.length);
  for (const path of sorted) {
    if (pathname.startsWith(path)) {
      return pageHelpByPath[path];
    }
  }

  return undefined;
}
