import type { TeamMemberRecord } from "@/lib/api";

export interface PayrollEmployeeName {
  employeeName: string;
}

export interface PayrollImportRow {
  name: string;
  payrollCount: number;
  alreadyMember: boolean;
}

export function normalizeMemberName(name: string) {
  return name.trim().toLowerCase();
}

export function buildPayrollImportRows(
  payrolls: PayrollEmployeeName[],
  members: TeamMemberRecord[],
): PayrollImportRow[] {
  const memberNames = new Set(members.map((member) => normalizeMemberName(member.name)));
  const byName = new Map<string, { displayName: string; count: number }>();

  for (const payroll of payrolls) {
    const raw = payroll.employeeName?.trim();
    if (!raw) continue;

    const key = normalizeMemberName(raw);
    const existing = byName.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byName.set(key, { displayName: raw, count: 1 });
    }
  }

  return Array.from(byName.values())
    .map(({ displayName, count }) => ({
      name: displayName,
      payrollCount: count,
      alreadyMember: memberNames.has(normalizeMemberName(displayName)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
