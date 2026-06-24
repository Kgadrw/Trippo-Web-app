import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountOptions } from "@/hooks/useAccountOptions";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

export type FinancePaymentPayload = {
  paymentMethod: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  accountId?: string;
};

export function showsBankAccountFields(paymentMethod: string) {
  return paymentMethod === "transfer";
}

export function buildFinancePaymentPayload(
  paymentMethod: string,
  bankAccountName: string,
  bankAccountNumber: string,
  accountId?: string,
): FinancePaymentPayload {
  const payload: FinancePaymentPayload = { paymentMethod: paymentMethod || "cash" };
  if (showsBankAccountFields(paymentMethod)) {
    const name = bankAccountName.trim();
    const number = bankAccountNumber.trim();
    if (name) payload.bankAccountName = name;
    if (number) payload.bankAccountNumber = number;
  }
  if (accountId && accountId !== "none") {
    payload.accountId = accountId;
  }
  return payload;
}

type PaymentDetailsFieldsProps = {
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  bankAccountName: string;
  onBankAccountNameChange: (value: string) => void;
  bankAccountNumber: string;
  onBankAccountNumberChange: (value: string) => void;
  accountId?: string;
  onAccountIdChange?: (value: string) => void;
  disabled?: boolean;
  labelClassName?: string;
  selectTriggerClassName?: string;
  inputClassName?: string;
};

export function PaymentDetailsFields({
  paymentMethod,
  onPaymentMethodChange,
  bankAccountName,
  onBankAccountNameChange,
  bankAccountNumber,
  onBankAccountNumberChange,
  accountId = "",
  onAccountIdChange,
  disabled = false,
  labelClassName,
  selectTriggerClassName,
  inputClassName,
}: PaymentDetailsFieldsProps) {
  const { t } = useTranslation();
  const showBank = showsBankAccountFields(paymentMethod);
  const accounts = useAccountOptions(Boolean(onAccountIdChange));

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className={labelClassName}>{t("paymentMethod")}</Label>
        <Select value={paymentMethod} onValueChange={onPaymentMethodChange} disabled={disabled}>
          <SelectTrigger className={cn(selectTriggerClassName)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">{t("cash")}</SelectItem>
            <SelectItem value="momo">{t("momoPay")}</SelectItem>
            <SelectItem value="airtel">{t("airtelPay")}</SelectItem>
            <SelectItem value="card">{t("card")}</SelectItem>
            <SelectItem value="transfer">{t("bankTransfer")}</SelectItem>
            <SelectItem value="other">{t("other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {onAccountIdChange ? (
        <div className="space-y-1">
          <Label className={labelClassName}>{t("paymentAccount")}</Label>
          <Select
            value={accountId || "none"}
            onValueChange={(value) => onAccountIdChange(value === "none" ? "" : value)}
            disabled={disabled}
          >
            <SelectTrigger className={cn(selectTriggerClassName)}>
              <SelectValue placeholder={t("selectAccount")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("noAccountSelected")}</SelectItem>
              {accounts.map((account) => {
                const id = String(account._id ?? account.id ?? "");
                return (
                  <SelectItem key={id} value={id}>
                    {account.name}
                    {account.type ? ` (${account.type})` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {showBank ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className={labelClassName}>{t("bankAccountName")}</Label>
            <Input
              value={bankAccountName}
              onChange={(e) => onBankAccountNameChange(e.target.value)}
              placeholder={t("bankAccountNamePlaceholder")}
              disabled={disabled}
              className={inputClassName}
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClassName}>{t("bankAccountNumber")}</Label>
            <Input
              value={bankAccountNumber}
              onChange={(e) => onBankAccountNumberChange(e.target.value)}
              placeholder={t("bankAccountNumberPlaceholder")}
              disabled={disabled}
              className={inputClassName}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
