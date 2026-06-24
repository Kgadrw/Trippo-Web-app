export type CashFlowInputs = {
  incomes: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  payrolls: Array<{ paymentDate: string; amount: number; status?: string }>;
  bills: Array<{ amount: number; status?: string; paidAt?: string; dueDate: string }>;
  taxes: Array<{ amount: number; status?: string; paidAt?: string; dueDate: string }>;
  invoices: Array<{ amount: number; status?: string; paidAt?: string; dueDate: string }>;
  bankDeposits: Array<{ depositDate: string; amount: number }>;
  loans: Array<{
    startDate: string;
    principalAmount: number;
    remainingBalance?: number;
    status?: string;
    nextDueDate?: string;
    payments?: Array<{ paymentDate: string; amount: number }>;
  }>;
  sales: Array<{ date: string; timestamp?: string; revenue: number }>;
};

export type BalanceInputs = Pick<
  CashFlowInputs,
  "invoices" | "bills" | "payrolls" | "taxes" | "loans"
>;

export type BalanceSummary = {
  total: number;
  current: number;
  overdue: number;
  breakdown: CashFlowBreakdownLine[];
};

export type CashFlowBreakdownLine = {
  key: string;
  label: string;
  amount: number;
};

function parseMs(dateStr: string): number | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const t = new Date(`${dateStr}T12:00:00`).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const t = new Date(dateStr).getTime();
  return Number.isNaN(t) ? null : t;
}

function inRange(dateStr: string | undefined, startMs: number, endMs: number) {
  if (!dateStr) return false;
  const t = parseMs(dateStr);
  return t !== null && t >= startMs && t <= endMs;
}

function paidCashDate(status: string | undefined, paidAt: string | undefined, fallback: string) {
  if ((status || "pending") !== "paid") return null;
  return paidAt || fallback;
}

function startOfDayMs(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

type DueBalanceItem = { amount: number; dueDate: string };

function sumDueBalances(items: DueBalanceItem[], todayMs: number) {
  let total = 0;
  let current = 0;
  let overdue = 0;

  for (const item of items) {
    const amt = Number(item.amount) || 0;
    if (amt <= 0) continue;
    total += amt;
    const due = parseMs(item.dueDate);
    if (due !== null && due < todayMs) overdue += amt;
    else current += amt;
  }

  return { total, current, overdue };
}

export function buildReceivablesSummary(inputs: BalanceInputs): BalanceSummary {
  const todayMs = startOfDayMs(new Date());
  const dueItems: DueBalanceItem[] = [];
  const breakdown: CashFlowBreakdownLine[] = [];

  const unpaidInvoices = inputs.invoices.filter((inv) => inv.status !== "paid");
  const invoiceAmount = unpaidInvoices.reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
  if (invoiceAmount > 0) {
    breakdown.push({ key: "invoices", label: "Unpaid invoices", amount: invoiceAmount });
    for (const inv of unpaidInvoices) {
      dueItems.push({ amount: Number(inv.amount) || 0, dueDate: inv.dueDate });
    }
  }

  const totals = sumDueBalances(dueItems, todayMs);
  return { ...totals, breakdown };
}

export function buildPayablesSummary(inputs: BalanceInputs): BalanceSummary {
  const todayMs = startOfDayMs(new Date());
  const dueItems: DueBalanceItem[] = [];
  const breakdown: CashFlowBreakdownLine[] = [];

  const pendingBills = inputs.bills.filter((bill) => (bill.status || "pending") === "pending");
  const billsAmount = pendingBills.reduce((s, bill) => s + (Number(bill.amount) || 0), 0);
  if (billsAmount > 0) {
    breakdown.push({ key: "bills", label: "Bills", amount: billsAmount });
    for (const bill of pendingBills) {
      dueItems.push({ amount: Number(bill.amount) || 0, dueDate: bill.dueDate });
    }
  }

  const pendingPayroll = inputs.payrolls.filter((row) => row.status === "pending");
  const payrollAmount = pendingPayroll.reduce((s, row) => s + (Number(row.amount) || 0), 0);
  if (payrollAmount > 0) {
    breakdown.push({ key: "payroll", label: "Payroll", amount: payrollAmount });
    for (const row of pendingPayroll) {
      dueItems.push({ amount: Number(row.amount) || 0, dueDate: row.paymentDate });
    }
  }

  const pendingTaxes = inputs.taxes.filter((tax) => (tax.status || "pending") === "pending");
  const taxesAmount = pendingTaxes.reduce((s, tax) => s + (Number(tax.amount) || 0), 0);
  if (taxesAmount > 0) {
    breakdown.push({ key: "taxes", label: "Taxes", amount: taxesAmount });
    for (const tax of pendingTaxes) {
      dueItems.push({ amount: Number(tax.amount) || 0, dueDate: tax.dueDate });
    }
  }

  const activeLoans = inputs.loans.filter((loan) => loan.status !== "paid_off");
  const loansAmount = activeLoans.reduce(
    (s, loan) => s + (Number(loan.remainingBalance) || 0),
    0,
  );
  if (loansAmount > 0) {
    breakdown.push({ key: "loans", label: "Loan balances", amount: loansAmount });
    for (const loan of activeLoans) {
      const balance = Number(loan.remainingBalance) || 0;
      if (balance <= 0) continue;
      dueItems.push({
        amount: balance,
        dueDate: loan.nextDueDate || loan.startDate,
      });
    }
  }

  const totals = sumDueBalances(dueItems, todayMs);
  return { ...totals, breakdown };
}

export function sumMoneyIn(
  inputs: CashFlowInputs,
  startMs: number,
  endMs: number,
  basis: "cash" | "accrual" = "cash",
) {
  return buildMoneyInBreakdown(inputs, startMs, endMs, basis).reduce((s, line) => s + line.amount, 0);
}

export function sumMoneyOut(
  inputs: CashFlowInputs,
  startMs: number,
  endMs: number,
  basis: "cash" | "accrual" = "cash",
) {
  return buildMoneyOutBreakdown(inputs, startMs, endMs, basis).reduce((s, line) => s + line.amount, 0);
}

export function buildMoneyInBreakdown(
  inputs: CashFlowInputs,
  startMs: number,
  endMs: number,
  basis: "cash" | "accrual" = "cash",
): CashFlowBreakdownLine[] {
  const income = inputs.incomes
    .filter((row) => inRange(row.date, startMs, endMs))
    .reduce((s, row) => s + (Number(row.amount) || 0), 0);

  const sales = inputs.sales
    .filter((row) => inRange(row.timestamp || row.date, startMs, endMs))
    .reduce((s, row) => s + (Number(row.revenue) || 0), 0);

  const invoicesIn = inputs.invoices
    .filter((row) => {
      if (basis === "cash") {
        const paidDate = paidCashDate(row.status, row.paidAt, row.dueDate);
        return paidDate ? inRange(paidDate, startMs, endMs) : false;
      }
      if (row.status === "draft") return false;
      return inRange(row.dueDate, startMs, endMs);
    })
    .reduce((s, row) => s + (Number(row.amount) || 0), 0);

  const bankDeposits = inputs.bankDeposits
    .filter((row) => inRange(row.depositDate, startMs, endMs))
    .reduce((s, row) => s + (Number(row.amount) || 0), 0);

  const loansReceived = inputs.loans
    .filter((row) => inRange(row.startDate, startMs, endMs))
    .reduce((s, row) => s + (Number(row.principalAmount) || 0), 0);

  return [
    { key: "income", label: "Income", amount: income },
    { key: "sales", label: "Sales", amount: sales },
    { key: "invoices", label: basis === "cash" ? "Invoices paid" : "Invoices", amount: invoicesIn },
    { key: "deposits", label: "Bank deposits", amount: bankDeposits },
    { key: "loans", label: "Loans received", amount: loansReceived },
  ].filter((line) => line.amount > 0);
}

export function buildMoneyOutBreakdown(
  inputs: CashFlowInputs,
  startMs: number,
  endMs: number,
  basis: "cash" | "accrual" = "cash",
): CashFlowBreakdownLine[] {
  const expenditure = inputs.expenses
    .filter((row) => inRange(row.date, startMs, endMs))
    .reduce((s, row) => s + (Number(row.amount) || 0), 0);

  const payroll = inputs.payrolls
    .filter((row) => row.status !== "pending" && inRange(row.paymentDate, startMs, endMs))
    .reduce((s, row) => s + (Number(row.amount) || 0), 0);

  const billsPaid = inputs.bills
    .filter((row) => {
      if (basis === "cash") {
        const paidDate = paidCashDate(row.status, row.paidAt, row.dueDate);
        return paidDate ? inRange(paidDate, startMs, endMs) : false;
      }
      return (row.status || "pending") === "pending" && inRange(row.dueDate, startMs, endMs);
    })
    .reduce((s, row) => s + (Number(row.amount) || 0), 0);

  const taxesPaid = inputs.taxes
    .filter((row) => {
      if (basis === "cash") {
        const paidDate = paidCashDate(row.status, row.paidAt, row.dueDate);
        return paidDate ? inRange(paidDate, startMs, endMs) : false;
      }
      return (row.status || "pending") === "pending" && inRange(row.dueDate, startMs, endMs);
    })
    .reduce((s, row) => s + (Number(row.amount) || 0), 0);

  return [
    { key: "expenditure", label: "Expenditure", amount: expenditure },
    { key: "payroll", label: "Payroll", amount: payroll },
    { key: "bills", label: basis === "cash" ? "Bills paid" : "Bills due", amount: billsPaid },
    { key: "taxes", label: basis === "cash" ? "Taxes paid" : "Taxes due", amount: taxesPaid },
  ].filter((line) => line.amount > 0);
}

export function buildMonthlyCashFlow(
  inputs: CashFlowInputs,
  year: number,
  basis: "cash" | "accrual",
) {
  const monthIncome = Array.from({ length: 12 }, () => 0);
  const monthExpense = Array.from({ length: 12 }, () => 0);

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const startMs = new Date(year, monthIndex, 1).getTime();
    const endMs = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime();
    monthIncome[monthIndex] = sumMoneyIn(inputs, startMs, endMs, basis);
    monthExpense[monthIndex] = sumMoneyOut(inputs, startMs, endMs, basis);
  }

  const monthly = Array.from({ length: 12 }, (_, monthIndex) => ({
    label: new Date(year, monthIndex, 1).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    }),
    income: monthIncome[monthIndex],
    expense: monthExpense[monthIndex],
  }));

  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).getTime();

  return {
    monthly,
    totalIncome: sumMoneyIn(inputs, yearStart, yearEnd, basis),
    totalExpense: sumMoneyOut(inputs, yearStart, yearEnd, basis),
    incomeBreakdown: buildMoneyInBreakdown(inputs, yearStart, yearEnd, basis),
    expenseBreakdown: buildMoneyOutBreakdown(inputs, yearStart, yearEnd, basis),
  };
}

export type DashboardPeriod = "day" | "month" | "year";

export function getDashboardPeriodRange(period: DashboardPeriod) {
  const now = new Date();

  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return {
      startMs: start.getTime(),
      endMs: end.getTime(),
      startLabel: start.toLocaleDateString("en-GB"),
      endLabel: end.toLocaleDateString("en-GB"),
      periodLabel: start.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      startMs: start.getTime(),
      endMs: end.getTime(),
      startLabel: start.toLocaleDateString("en-GB"),
      endLabel: end.toLocaleDateString("en-GB"),
      periodLabel: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
    };
  }

  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    startLabel: start.toLocaleDateString("en-GB"),
    endLabel: end.toLocaleDateString("en-GB"),
    periodLabel: String(year),
  };
}

export function buildPeriodCashFlowChart(inputs: CashFlowInputs, period: DashboardPeriod) {
  const now = new Date();

  if (period === "year") {
    return buildYearlyCashFlowChart(inputs, now.getFullYear());
  }

  if (period === "month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daily = Array.from({ length: daysInMonth }, (_, dayIndex) => {
      const day = dayIndex + 1;
      const startMs = new Date(year, month, day).getTime();
      const endMs = new Date(year, month, day, 23, 59, 59, 999).getTime();
      const incoming = sumMoneyIn(inputs, startMs, endMs);
      const outgoing = sumMoneyOut(inputs, startMs, endMs, "cash");
      return {
        label: String(day),
        incoming,
        outgoing,
        cash: incoming - outgoing,
      };
    });
    const { startMs, endMs, startLabel, endLabel } = getDashboardPeriodRange("month");
    const incoming = sumMoneyIn(inputs, startMs, endMs);
    const outgoing = sumMoneyOut(inputs, startMs, endMs, "cash");
    return {
      openingCash: 0,
      incoming,
      outgoing,
      closingCash: incoming - outgoing,
      monthly: daily,
      startLabel,
      endLabel,
    };
  }

  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const startMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      0,
      0,
      0,
    ).getTime();
    const endMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      59,
      59,
      999,
    ).getTime();
    const incoming = sumMoneyIn(inputs, startMs, endMs);
    const outgoing = sumMoneyOut(inputs, startMs, endMs, "cash");
    return {
      label: `${String(hour).padStart(2, "0")}:00`,
      incoming,
      outgoing,
      cash: incoming - outgoing,
    };
  });
  const { startMs, endMs, startLabel, endLabel } = getDashboardPeriodRange("day");
  const incoming = sumMoneyIn(inputs, startMs, endMs);
  const outgoing = sumMoneyOut(inputs, startMs, endMs, "cash");
  return {
    openingCash: 0,
    incoming,
    outgoing,
    closingCash: incoming - outgoing,
    monthly: hourly,
    startLabel,
    endLabel,
  };
}

export function buildPeriodIncomeExpense(
  inputs: CashFlowInputs,
  period: DashboardPeriod,
  basis: "cash" | "accrual",
) {
  const now = new Date();
  const { startMs, endMs } = getDashboardPeriodRange(period);

  if (period === "year") {
    return buildMonthlyCashFlow(inputs, now.getFullYear(), basis);
  }

  if (period === "month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthly = Array.from({ length: daysInMonth }, (_, dayIndex) => {
      const day = dayIndex + 1;
      const dayStartMs = new Date(year, month, day).getTime();
      const dayEndMs = new Date(year, month, day, 23, 59, 59, 999).getTime();
      return {
        label: String(day),
        income: sumMoneyIn(inputs, dayStartMs, dayEndMs, basis),
        expense: sumMoneyOut(inputs, dayStartMs, dayEndMs, basis),
      };
    });
    return {
      monthly,
      totalIncome: sumMoneyIn(inputs, startMs, endMs, basis),
      totalExpense: sumMoneyOut(inputs, startMs, endMs, basis),
      incomeBreakdown: buildMoneyInBreakdown(inputs, startMs, endMs, basis),
      expenseBreakdown: buildMoneyOutBreakdown(inputs, startMs, endMs, basis),
    };
  }

  const monthly = Array.from({ length: 24 }, (_, hour) => {
    const hourStartMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      0,
      0,
      0,
    ).getTime();
    const hourEndMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      59,
      59,
      999,
    ).getTime();
    return {
      label: `${String(hour).padStart(2, "0")}:00`,
      income: sumMoneyIn(inputs, hourStartMs, hourEndMs, basis),
      expense: sumMoneyOut(inputs, hourStartMs, hourEndMs, basis),
    };
  });

  return {
    monthly,
    totalIncome: sumMoneyIn(inputs, startMs, endMs, basis),
    totalExpense: sumMoneyOut(inputs, startMs, endMs, basis),
    incomeBreakdown: buildMoneyInBreakdown(inputs, startMs, endMs, basis),
    expenseBreakdown: buildMoneyOutBreakdown(inputs, startMs, endMs, basis),
  };
}

export function buildYearlyCashFlowChart(
  inputs: CashFlowInputs,
  year: number,
) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const startMs = yearStart.getTime();
  const endMs = yearEnd.getTime();

  const monthIncome = Array.from({ length: 12 }, () => 0);
  const monthExpense = Array.from({ length: 12 }, () => 0);

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthStartMs = new Date(year, monthIndex, 1).getTime();
    const monthEndMs = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime();
    monthIncome[monthIndex] = sumMoneyIn(inputs, monthStartMs, monthEndMs);
    monthExpense[monthIndex] = sumMoneyOut(inputs, monthStartMs, monthEndMs, "cash");
  }

  const monthly = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    return {
      label: monthEnd.toLocaleString("en-US", { month: "short", year: "numeric" }),
      incoming: monthIncome[monthIndex],
      outgoing: monthExpense[monthIndex],
      cash: monthIncome[monthIndex] - monthExpense[monthIndex],
    };
  });

  const incoming = sumMoneyIn(inputs, startMs, endMs);
  const outgoing = sumMoneyOut(inputs, startMs, endMs, "cash");

  return {
    openingCash: 0,
    incoming,
    outgoing,
    closingCash: incoming - outgoing,
    monthly,
    startLabel: yearStart.toLocaleDateString("en-GB"),
    endLabel: yearEnd.toLocaleDateString("en-GB"),
  };
}

export function currentMonthBounds() {
  const now = new Date();
  const startMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endMs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return { startMs, endMs };
}
