import type { Translations } from "@/lib/translations";
import { financeNavItems } from "@/components/finance/financeNavItems";

export type HelpTranslationKey = keyof Translations;

/** Help copy keyed by app route (longest prefix wins for nested paths). */
export const pageHelpByPath: Record<string, HelpTranslationKey> = {
  "/products": "helpProducts",
  "/sales": "helpSales",
  "/documents": "helpDocuments",
  "/reports": "helpReports",
  "/schedules": "helpAutomations",
  "/calendar": "helpCalendar",
  "/team": "helpTeamOverview",
  "/team/tasks/finance": "helpTeamFinanceTasks",
  "/team/tasks": "helpTeamTasks",
  "/team/members": "helpTeamMembers",
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
