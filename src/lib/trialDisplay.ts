/** Convert remaining trial hours into whole days for display (round up partial days). */
export function trialHoursToDisplayDays(hours: number): number {
  if (hours <= 0) return 0;
  return Math.ceil(hours / 24);
}

export type TrialRemaining = {
  hours: number;
  days: number;
};

type TrialPlanLike = {
  isOnTrial?: boolean;
  trialEndsAt?: string | null;
  trialHoursLeft?: number;
};

export function getTrialRemainingFromPlan(plan?: TrialPlanLike | null): TrialRemaining | null {
  if (!plan?.isOnTrial) return null;

  let hours = plan.trialHoursLeft;
  if (hours === undefined && plan.trialEndsAt) {
    const ms = new Date(plan.trialEndsAt).getTime() - Date.now();
    hours = Math.max(0, Math.ceil(ms / (1000 * 60 * 60)));
  }

  const safeHours = Math.max(0, hours ?? 0);
  return {
    hours: safeHours,
    days: trialHoursToDisplayDays(safeHours),
  };
}

export function formatTrialDaysLeft(
  t: (key: string) => string,
  days: number,
): string {
  if (days <= 0) return t("plusTrialEnded");
  if (days === 1) return t("freeTrialOneDayLeft");
  return t("freeTrialDaysLeft").replace("{days}", String(days));
}
