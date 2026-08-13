export const DISAPPEARING_DURATIONS = {
  OFF: 0,
  HOURS_24: 24 * 60 * 60,
  WEEKS_7: 7 * 7 * 24 * 60 * 60,
} as const;

export type DisappearingDurationSec =
  (typeof DISAPPEARING_DURATIONS)[keyof typeof DISAPPEARING_DURATIONS];

export const DISAPPEARING_OPTIONS: Array<{
  value: DisappearingDurationSec;
  labelKey: "chatDisappearOff" | "chatDisappear24h" | "chatDisappear7w";
}> = [
  { value: DISAPPEARING_DURATIONS.OFF, labelKey: "chatDisappearOff" },
  { value: DISAPPEARING_DURATIONS.HOURS_24, labelKey: "chatDisappear24h" },
  { value: DISAPPEARING_DURATIONS.WEEKS_7, labelKey: "chatDisappear7w" },
];

export function formatDisappearingLabel(
  durationSec: number,
  t: (key: "chatDisappearOff" | "chatDisappear24h" | "chatDisappear7w" | "chatDisappearCustom") => string,
) {
  const match = DISAPPEARING_OPTIONS.find((row) => row.value === Number(durationSec || 0));
  if (match) return t(match.labelKey);
  if (!durationSec) return t("chatDisappearOff");
  return t("chatDisappearCustom");
}

export function formatDisappearingSystemNotice(
  message: {
    senderName?: string;
    systemType?: string | null;
    systemPayload?: { durationSec?: number } | null;
  },
  t: (
    key:
      | "chatDisappearSystemOn"
      | "chatDisappearSystemOff"
      | "chatDisappearOff"
      | "chatDisappear24h"
      | "chatDisappear7w"
      | "chatDisappearCustom",
  ) => string,
) {
  if (message.systemType !== "disappearing") return "";
  const name = message.senderName || "User";
  const durationSec = Number(message.systemPayload?.durationSec) || 0;
  if (!durationSec) {
    return t("chatDisappearSystemOff").replace("{name}", name);
  }
  return t("chatDisappearSystemOn")
    .replace("{name}", name)
    .replace("{duration}", formatDisappearingLabel(durationSec, t));
}
