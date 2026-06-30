export type PageSearchScope = {
  labelKey: string;
  fullPlaceholder?: boolean;
};

const PATH_SCOPES: Array<{ prefix: string; labelKey: string; fullPlaceholder?: boolean }> = [
  { prefix: "/finance/invoices", labelKey: "invoices" },
  { prefix: "/finance/accounts", labelKey: "accounts" },
  { prefix: "/finance/customers", labelKey: "customers" },
  { prefix: "/finance/vendors", labelKey: "vendors" },
  { prefix: "/finance/deposits", labelKey: "bankDeposits" },
  { prefix: "/finance/bills", labelKey: "bills" },
  { prefix: "/finance/taxes", labelKey: "taxes" },
  { prefix: "/finance/income", labelKey: "income" },
  { prefix: "/finance/expenditure", labelKey: "expenditure" },
  { prefix: "/finance/payroll", labelKey: "payroll" },
  { prefix: "/finance/transactions", labelKey: "transactions" },
  { prefix: "/finance/loans", labelKey: "loans" },
  { prefix: "/finance/budgets", labelKey: "categoryBudgets" },
  { prefix: "/finance/reconciliation", labelKey: "bankReconciliation" },
  { prefix: "/products", labelKey: "products" },
  { prefix: "/sales", labelKey: "sales" },
  { prefix: "/documents/archive", labelKey: "docArchiveTitle" },
  { prefix: "/documents/registry", labelKey: "docRegistryTitle" },
  { prefix: "/assets", labelKey: "assets" },
  { prefix: "/crm/contacts", labelKey: "crmContactsTitle" },
  { prefix: "/crm/quotes", labelKey: "crmQuotesTitle" },
  { prefix: "/crm/contracts", labelKey: "crmContractsTitle" },
  { prefix: "/crm/pipeline", labelKey: "crmPipelineTitle" },
  { prefix: "/projects/all", labelKey: "projectAllProjects" },
  { prefix: "/hr/people", labelKey: "hrPeople" },
  { prefix: "/hr/org-chart", labelKey: "hrOrgChart" },
  { prefix: "/hr/leave", labelKey: "hrLeave" },
  { prefix: "/team/tasks", labelKey: "teamAllTasks" },
  { prefix: "/calendar/schedules", labelKey: "searchAutomationsPlaceholder", fullPlaceholder: true },
];

export function resolvePageSearchScope(pathname: string): PageSearchScope | null {
  const path = pathname.toLowerCase();
  const match = PATH_SCOPES.find((rule) => path.startsWith(rule.prefix));
  return match ? { labelKey: match.labelKey, fullPlaceholder: match.fullPlaceholder } : null;
}

export function filterByPageSearch<T>(
  items: readonly T[],
  query: string,
  fields: (item: T) => Array<string | number | null | undefined>,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter((item) =>
    fields(item).some((value) => String(value ?? "").toLowerCase().includes(q)),
  );
}
