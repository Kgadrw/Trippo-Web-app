export type AutomationType =
  | "payment_reminder"
  | "payment_link"
  | "invoice"
  | "report"
  | "payroll"
  | "tax_bill"
  | "follow_up"
  | "custom";

export const AUTOMATION_TYPE_VALUES: AutomationType[] = [
  "payment_reminder",
  "payment_link",
  "invoice",
  "report",
  "payroll",
  "tax_bill",
  "follow_up",
  "custom",
];

export const AUTOMATION_TYPE_LABEL_KEYS: Record<
  AutomationType,
  | "automationTypePaymentReminder"
  | "automationTypePaymentLink"
  | "automationTypeInvoice"
  | "automationTypeReport"
  | "automationTypePayroll"
  | "automationTypeTaxBill"
  | "automationTypeFollowUp"
  | "automationTypeCustom"
> = {
  payment_reminder: "automationTypePaymentReminder",
  payment_link: "automationTypePaymentLink",
  invoice: "automationTypeInvoice",
  report: "automationTypeReport",
  payroll: "automationTypePayroll",
  tax_bill: "automationTypeTaxBill",
  follow_up: "automationTypeFollowUp",
  custom: "automationTypeCustom",
};

export const AUTOMATION_TYPE_TITLE_PH_KEYS: Record<AutomationType, string> = {
  payment_reminder: "automationTitlePhPaymentReminder",
  payment_link: "automationTitlePhPaymentLink",
  invoice: "automationTitlePhInvoice",
  report: "automationTitlePhReport",
  payroll: "automationTitlePhPayroll",
  tax_bill: "automationTitlePhTaxBill",
  follow_up: "automationTitlePhFollowUp",
  custom: "automationTitlePhCustom",
};

export function normalizeAutomationType(value: unknown): AutomationType {
  if (typeof value === "string" && AUTOMATION_TYPE_VALUES.includes(value as AutomationType)) {
    return value as AutomationType;
  }
  return "custom";
}
