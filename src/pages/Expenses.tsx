import { useCallback, useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";

import { useApi } from "@/hooks/useApi";

import { recurringExpenseApi } from "@/lib/api";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

import { Trash2, Plus, Loader2, MoreVertical, RefreshCw, CheckCircle2, Pencil } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { cn, formatDateWithTime } from "@/lib/utils";
import { DesktopDataTable, MobileDataList, MobileListCard } from "@/components/ui/mobile-list-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";



interface Expense {

  id?: number;

  _id?: string;

  title: string;

  amount: number;

  category?: string;

  date: string;

  note?: string;

}



interface RecurringExpense {

  _id?: string;

  id?: number;

  title: string;

  amount: number;

  category?: string;

  note?: string;

  frequency: "weekly" | "monthly" | "yearly" | "custom";

  intervalDays?: number;

  nextDueDate: string;

  autoRecord?: boolean;

  notifyEmail?: boolean;

  advanceNotificationDays?: number;

  repeatUntil?: string;

  active?: boolean;

}



const frequencyLabels: Record<RecurringExpense["frequency"], string> = {

  weekly: "Every week",

  monthly: "Every month",

  yearly: "Every year",

  custom: "Custom interval",

};



const defaultRecurringForm = () => ({

  title: "",

  amount: "",

  category: "general",

  note: "",

  frequency: "monthly" as RecurringExpense["frequency"],

  intervalDays: "30",

  nextDueDate: new Date().toISOString().split("T")[0],

  autoRecord: false,

  notifyEmail: true,

  advanceNotificationDays: "1",

});



export default function Expenses() {

  const { toast } = useToast();
  const { t } = useTranslation();

  const { items: expenses, isLoading, add, remove, refresh } = useApi<Expense>({

    endpoint: "expenses",

    defaultValue: [],

  });



  const [title, setTitle] = useState("");

  const [amount, setAmount] = useState("");

  const [category, setCategory] = useState("general");

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [note, setNote] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);



  const [recurringItems, setRecurringItems] = useState<RecurringExpense[]>([]);

  const [recurringLoading, setRecurringLoading] = useState(true);

  const [recurringSaving, setRecurringSaving] = useState(false);

  const [recurringActionId, setRecurringActionId] = useState<string | null>(null);

  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);

  const [recurringForm, setRecurringForm] = useState(defaultRecurringForm);

  const [expenseMode, setExpenseMode] = useState<"one-time" | "recurring">("one-time");

  const total = useMemo(

    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),

    [expenses],

  );



  const sorted = useMemo(() => {

    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [expenses]);



  const loadRecurring = useCallback(async () => {

    setRecurringLoading(true);

    try {

      const res = await recurringExpenseApi.getAll();

      setRecurringItems((res.data as RecurringExpense[]) || []);

    } catch (error: any) {

      toast({

        title: "Failed to load recurring expenses",

        description: error?.message || "Please try again.",

        variant: "destructive",

      });

    } finally {

      setRecurringLoading(false);

    }

  }, [toast]);



  useEffect(() => {

    void loadRecurring();

  }, [loadRecurring]);



  const resetRecurringForm = () => {

    setRecurringForm(defaultRecurringForm());

    setEditingRecurringId(null);

  };



  const handleSave = async () => {

    const parsedAmount = parseFloat(amount);

    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {

      toast({

        title: "Missing Information",

        description: "Please provide expense title and valid amount.",

        variant: "destructive",

      });

      return;

    }



    try {

      const now = new Date();

      const savedDate = new Date((date || new Date().toISOString().split("T")[0]) + "T00:00:00");

      savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      await add({

        title: title.trim(),

        amount: parsedAmount,

        category,

        date: savedDate.toISOString(),

        note: note.trim() || undefined,

      } as any);

      await refresh(true);

      setTitle("");

      setAmount("");

      setCategory("general");

      setDate(new Date().toISOString().split("T")[0]);

      setNote("");

      toast({ title: "Expense Added", description: "Daily expense recorded." });

      window.dispatchEvent(new CustomEvent("expenses-should-refresh"));

    } catch (error: any) {

      toast({

        title: "Save Failed",

        description: error?.message || "Failed to record expense.",

        variant: "destructive",

      });

    }

  };



  const handleDelete = async (expense: Expense) => {

    if (!window.confirm(`Delete expense "${expense.title}"?`)) return;

    const id = String((expense as { _id?: string; id?: number })._id ?? expense.id ?? "");

    if (!id) return;

    setDeletingId(id);

    try {

      await remove(expense as any);

      await refresh(true);

      toast({ title: "Deleted", description: "Expense removed." });

      window.dispatchEvent(new CustomEvent("expenses-should-refresh"));

    } catch (error: any) {

      toast({

        title: "Delete Failed",

        description: error?.message || "Failed to delete expense.",

        variant: "destructive",

      });

    } finally {

      setDeletingId(null);

    }

  };



  const handleSaveRecurring = async () => {

    const parsedAmount = parseFloat(recurringForm.amount);

    if (!recurringForm.title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {

      toast({

        title: "Missing Information",

        description: "Please provide title and valid amount for the recurring expense.",

        variant: "destructive",

      });

      return;

    }



    if (!recurringForm.nextDueDate) {

      toast({

        title: "Missing due date",

        description: "Please choose the next due date.",

        variant: "destructive",

      });

      return;

    }



    setRecurringSaving(true);

    try {

      const payload = {

        title: recurringForm.title.trim(),

        amount: parsedAmount,

        category: recurringForm.category.trim() || "general",

        note: recurringForm.note.trim() || undefined,

        frequency: recurringForm.frequency,

        intervalDays:

          recurringForm.frequency === "custom"

            ? Math.max(1, parseInt(recurringForm.intervalDays, 10) || 30)

            : undefined,

        nextDueDate: recurringForm.nextDueDate,

        autoRecord: recurringForm.autoRecord,

        notifyEmail: recurringForm.notifyEmail,

        advanceNotificationDays: Math.max(

          0,

          parseInt(recurringForm.advanceNotificationDays, 10) || 0,

        ),

      };



      if (editingRecurringId) {

        await recurringExpenseApi.update(editingRecurringId, payload);

        toast({ title: "Updated", description: "Recurring expense updated." });

      } else {

        await recurringExpenseApi.create(payload);

        toast({

          title: "Recurring expense saved",

          description: recurringForm.notifyEmail

            ? "You will receive email reminders before each due date."

            : "Recurring schedule created.",

        });

      }



      resetRecurringForm();

      await loadRecurring();

    } catch (error: any) {

      toast({

        title: "Save Failed",

        description: error?.message || "Failed to save recurring expense.",

        variant: "destructive",

      });

    } finally {

      setRecurringSaving(false);

    }

  };



  const handleEditRecurring = (item: RecurringExpense) => {

    const id = String(item._id ?? item.id ?? "");

    setExpenseMode("recurring");

    setEditingRecurringId(id);

    setRecurringForm({

      title: item.title,

      amount: String(item.amount),

      category: item.category || "general",

      note: item.note || "",

      frequency: item.frequency,

      intervalDays: String(item.intervalDays || 30),

      nextDueDate: item.nextDueDate

        ? new Date(item.nextDueDate).toISOString().split("T")[0]

        : new Date().toISOString().split("T")[0],

      autoRecord: Boolean(item.autoRecord),

      notifyEmail: item.notifyEmail !== false,

      advanceNotificationDays: String(item.advanceNotificationDays ?? 1),

    });

  };



  const handleDeleteRecurring = async (item: RecurringExpense) => {

    const id = String(item._id ?? item.id ?? "");

    if (!id || !window.confirm(`Delete recurring expense "${item.title}"?`)) return;



    setRecurringActionId(id);

    try {

      await recurringExpenseApi.delete(id);

      if (editingRecurringId === id) resetRecurringForm();

      await loadRecurring();

      toast({ title: "Deleted", description: "Recurring expense removed." });

    } catch (error: any) {

      toast({

        title: "Delete Failed",

        description: error?.message || "Failed to delete recurring expense.",

        variant: "destructive",

      });

    } finally {

      setRecurringActionId(null);

    }

  };



  const handleMarkPaid = async (item: RecurringExpense) => {

    const id = String(item._id ?? item.id ?? "");

    if (!id) return;



    setRecurringActionId(id);

    try {

      await recurringExpenseApi.markPaid(id);

      await loadRecurring();

      await refresh(true);

      toast({

        title: "Payment recorded",

        description: `${item.title} was added to expenses and the next due date was scheduled.`,

      });

      window.dispatchEvent(new CustomEvent("expenses-should-refresh"));

    } catch (error: any) {

      toast({

        title: "Action failed",

        description: error?.message || "Could not record payment.",

        variant: "destructive",

      });

    } finally {

      setRecurringActionId(null);

    }

  };



  const getFrequencyText = (item: RecurringExpense) => {

    if (item.frequency === "custom") {

      return `Every ${item.intervalDays || 30} days`;

    }

    return frequencyLabels[item.frequency];

  };



  return (

    <AppLayout title={t("expenses")}>

      <div className="lg:bg-white lg:rounded-lg lg:overflow-hidden p-4 sm:p-5 space-y-4">
          <ToggleGroup
            type="single"
            value={expenseMode}
            onValueChange={(v) => v && setExpenseMode(v as "one-time" | "recurring")}
            className="grid grid-cols-2 gap-1.5 w-full sm:max-w-md"
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="one-time" className="h-9 text-xs sm:text-sm">
              {t("oneTimeExpense")}
            </ToggleGroupItem>
            <ToggleGroupItem value="recurring" className="h-9 text-xs sm:text-sm">
              {t("recurringExpenses")}
            </ToggleGroupItem>
          </ToggleGroup>

          {expenseMode === "one-time" ? (
          <>
          <p className="text-xs text-muted-foreground">Record a single expense manually.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            <div className="space-y-1">

              <Label>{t("expenseTitle")}</Label>

              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rent, Utilities, Transport" />

            </div>

            <div className="space-y-1">

              <Label>{t("amount")} (rwf)</Label>

              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("amount")} />

            </div>

            <div className="space-y-1">

              <Label>{t("category")}</Label>

              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Rent, Supplies, Salaries" />

            </div>

            <div className="space-y-1">

              <Label>{t("date")}</Label>

              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

            </div>

          </div>

          <div className="space-y-1">

            <Label>{t("noteOptional")}</Label>

            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional details..." />

          </div>

          <Button

            size="sm"

            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-fit rounded-lg"

            onClick={() => void handleSave()}

          >

            <Plus size={16} />

            {t("saveExpense")}
          </Button>
          </>
          ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Set monthly or custom schedules. You receive an email when payment is pending, and can auto-record expenses on the due date.
            </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            <div className="space-y-1">

              <Label>Title</Label>

              <Input

                value={recurringForm.title}

                onChange={(e) => setRecurringForm((f) => ({ ...f, title: e.target.value }))}

                placeholder="e.g. Shop rent, Internet"

              />

            </div>

            <div className="space-y-1">

              <Label>Amount (rwf)</Label>

              <Input

                type="number"

                min="0"

                value={recurringForm.amount}

                onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))}

                placeholder="Amount"

              />

            </div>

            <div className="space-y-1">

              <Label>Category</Label>

              <Input

                value={recurringForm.category}

                onChange={(e) => setRecurringForm((f) => ({ ...f, category: e.target.value }))}

                placeholder="e.g. Rent"

              />

            </div>

            <div className="space-y-1">

              <Label>Repeat every</Label>

              <Select

                value={recurringForm.frequency}

                onValueChange={(value) =>

                  setRecurringForm((f) => ({ ...f, frequency: value as RecurringExpense["frequency"] }))

                }

              >

                <SelectTrigger>

                  <SelectValue />

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="weekly">Every week</SelectItem>

                  <SelectItem value="monthly">Every month</SelectItem>

                  <SelectItem value="yearly">Every year</SelectItem>

                  <SelectItem value="custom">Custom (days)</SelectItem>

                </SelectContent>

              </Select>

            </div>

            {recurringForm.frequency === "custom" && (

              <div className="space-y-1">

                <Label>Interval (days)</Label>

                <Input

                  type="number"

                  min="1"

                  value={recurringForm.intervalDays}

                  onChange={(e) => setRecurringForm((f) => ({ ...f, intervalDays: e.target.value }))}

                />

              </div>

            )}

            <div className="space-y-1">

              <Label>Next due date</Label>

              <Input

                type="date"

                value={recurringForm.nextDueDate}

                onChange={(e) => setRecurringForm((f) => ({ ...f, nextDueDate: e.target.value }))}

              />

            </div>

            <div className="space-y-1">

              <Label>Email reminder (days before)</Label>

              <Input

                type="number"

                min="0"

                max="30"

                value={recurringForm.advanceNotificationDays}

                onChange={(e) =>

                  setRecurringForm((f) => ({ ...f, advanceNotificationDays: e.target.value }))

                }

                disabled={!recurringForm.notifyEmail}

              />

            </div>

          </div>



          <div className="space-y-1">

            <Label>Note (Optional)</Label>

            <Input

              value={recurringForm.note}

              onChange={(e) => setRecurringForm((f) => ({ ...f, note: e.target.value }))}

              placeholder="Additional details..."

            />

          </div>



          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">

            <div className="flex items-center gap-2">

              <Switch

                checked={recurringForm.notifyEmail}

                onCheckedChange={(checked) =>

                  setRecurringForm((f) => ({ ...f, notifyEmail: checked }))

                }

              />

              <Label className="font-normal">Email me when payment is pending</Label>

            </div>

            <div className="flex items-center gap-2">

              <Switch

                checked={recurringForm.autoRecord}

                onCheckedChange={(checked) =>

                  setRecurringForm((f) => ({ ...f, autoRecord: checked }))

                }

              />

              <Label className="font-normal">Auto-record expense on due date</Label>

            </div>

          </div>



          <div className="flex flex-wrap gap-2">

            <Button

              size="sm"

              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-lg"

              onClick={() => void handleSaveRecurring()}

              disabled={recurringSaving}

            >

              {recurringSaving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}

              {editingRecurringId ? "Update recurring expense" : "Save recurring expense"}

            </Button>

            {editingRecurringId && (

              <Button size="sm" variant="outline" onClick={resetRecurringForm}>

                Cancel edit

              </Button>

            )}

          </div>



          {recurringLoading ? (

            <div className="space-y-2">

              {Array.from({ length: 3 }).map((_, i) => (

                <Skeleton key={i} className="h-12 w-full" />

              ))}

            </div>

          ) : recurringItems.length === 0 ? (

            <p className="text-sm text-gray-500">No recurring expenses yet.</p>

          ) : (

            <>
            <DesktopDataTable>

              <table className="w-full border-collapse">

                <thead className="bg-gray-100 border-b border-gray-200">

                  <tr>

                    <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Title</th>

                    <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Amount</th>

                    <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Schedule</th>

                    <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Next due</th>

                    <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Reminders</th>

                    <th className="text-right text-sm font-semibold text-gray-700 py-3 px-4">Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {recurringItems.map((item, index) => {

                    const id = String(item._id ?? item.id ?? "");

                    const isBusy = recurringActionId === id;

                    const isOverdue =

                      item.active !== false &&

                      new Date(item.nextDueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

                    return (

                      <tr

                        key={id}

                        className={cn(

                          "border-b border-gray-200",

                          index % 2 === 0 ? "bg-white" : "bg-gray-50",

                        )}

                      >

                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.title}</td>

                        <td className="py-3 px-4 text-sm text-red-600 tabular-nums">

                          {Number(item.amount).toLocaleString()} rwf

                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700">{getFrequencyText(item)}</td>

                        <td className="py-3 px-4 text-sm whitespace-nowrap">

                          <span className={cn(isOverdue ? "text-red-600 font-medium" : "text-gray-700")}>

                            {formatDateWithTime(item.nextDueDate)}

                            {isOverdue ? " (pending)" : ""}

                          </span>

                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700">

                          {item.notifyEmail

                            ? `Email ${item.advanceNotificationDays ?? 1}d before + on due date`

                            : "Off"}

                          {item.autoRecord ? " · Auto-record" : ""}

                        </td>

                        <td className="py-3 px-4 text-right">

                          <DropdownMenu>

                            <DropdownMenuTrigger asChild>

                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isBusy}>

                                {isBusy ? (

                                  <Loader2 size={16} className="animate-spin" />

                                ) : (

                                  <MoreVertical size={16} />

                                )}

                              </Button>

                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">

                              <DropdownMenuItem onClick={() => void handleMarkPaid(item)}>

                                <CheckCircle2 size={14} className="mr-2" />

                                Mark paid

                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleEditRecurring(item)}>

                                <Pencil size={14} className="mr-2" />

                                Edit

                              </DropdownMenuItem>

                              <DropdownMenuItem

                                onClick={() => void handleDeleteRecurring(item)}

                                className="text-red-600 focus:text-red-600 focus:bg-red-50"

                              >

                                <Trash2 size={14} className="mr-2" />

                                Delete

                              </DropdownMenuItem>

                            </DropdownMenuContent>

                          </DropdownMenu>

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </DesktopDataTable>

            <MobileDataList>
              {recurringItems.map((item, index) => {
                const id = String(item._id ?? item.id ?? "");
                const isBusy = recurringActionId === id;
                const isOverdue =
                  item.active !== false &&
                  new Date(item.nextDueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
                return (
                  <MobileListCard key={id} index={index}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        <p className="text-sm font-semibold text-red-600 tabular-nums mt-0.5">
                          {Number(item.amount).toLocaleString()} rwf
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" disabled={isBusy}>
                            {isBusy ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <MoreVertical size={16} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void handleMarkPaid(item)}>
                            <CheckCircle2 size={14} className="mr-2" />
                            Mark paid
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditRecurring(item)}>
                            <Pencil size={14} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void handleDeleteRecurring(item)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                      <p>{getFrequencyText(item)}</p>
                      <p className={cn(isOverdue ? "text-red-600 font-medium" : "text-gray-700")}>
                        Due: {formatDateWithTime(item.nextDueDate)}
                        {isOverdue ? " (pending)" : ""}
                      </p>
                      <p>
                        {item.notifyEmail
                          ? `Email ${item.advanceNotificationDays ?? 1}d before + on due date`
                          : "Reminders off"}
                        {item.autoRecord ? " · Auto-record" : ""}
                      </p>
                    </div>
                  </MobileListCard>
                );
              })}
            </MobileDataList>
            </>

          )}
          </>
          )}

          <h3 className="text-sm font-semibold text-gray-800 border-t border-gray-200 pt-6 mt-6">{t("recentExpenses")}</h3>



          {isLoading ? (

            <>
            <DesktopDataTable>

              <table className="w-full border-collapse">

                <thead className="bg-gray-100 border-b border-gray-200">

                  <tr>

                    {["Title", "Category", "Amount", "Date", "Note", ""].map((col) => (

                      <th key={col} className="text-left py-4 px-6">

                        <Skeleton className="h-4 w-20" />

                      </th>

                    ))}

                  </tr>

                </thead>

                <tbody className="bg-white">

                  {Array.from({ length: 5 }).map((_, i) => (

                    <tr key={i} className="border-b border-gray-200">

                      {Array.from({ length: 6 }).map((_, j) => (

                        <td key={j} className="py-4 px-6">

                          <Skeleton className="h-4 w-24" />

                        </td>

                      ))}

                    </tr>

                  ))}

                </tbody>

              </table>

            </DesktopDataTable>
            <MobileDataList>
              {Array.from({ length: 4 }).map((_, i) => (
                <MobileListCard key={i} index={i}>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </MobileListCard>
              ))}
            </MobileDataList>
            </>

          ) : sorted.length === 0 ? (

            <p className="px-4 py-5 text-sm text-gray-500">No expenses recorded yet.</p>

          ) : (

            <>
            <DesktopDataTable>

              <table className="w-full border-collapse">

                <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">

                  <tr>

                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">Title</th>

                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">Category</th>

                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">Amount</th>

                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">Date</th>

                    <th className="text-left text-sm font-semibold text-gray-700 py-4 px-6">Note</th>

                    <th className="text-right text-sm font-semibold text-gray-700 py-4 px-6">Actions</th>

                  </tr>

                </thead>

                <tbody className="bg-white">

                  {sorted.map((expense, index) => {

                    const id = (expense as any)._id || expense.id;

                    const idStr = id != null ? String(id) : "";

                    const isDeletingThis = deletingId !== null && idStr === deletingId;

                    return (

                      <tr

                        key={id}

                        className={cn(

                          "border-b border-gray-200",

                          index % 2 === 0 ? "bg-white" : "bg-gray-50",

                        )}

                      >

                        <td className="py-4 px-6">

                          <div className="text-sm text-gray-900 font-medium">{expense.title}</div>

                        </td>

                        <td className="py-4 px-6">

                          <div className="text-sm text-gray-700">{expense.category || "general"}</div>

                        </td>

                        <td className="py-4 px-6">

                          <div className="text-sm font-semibold text-red-600 tabular-nums">

                            {Number(expense.amount).toLocaleString()} rwf

                          </div>

                        </td>

                        <td className="py-4 px-6">

                          <div className="text-sm text-gray-700 whitespace-nowrap">

                            {formatDateWithTime(expense.date)}

                          </div>

                        </td>

                        <td className="py-4 px-6">

                          <div className="text-sm text-gray-500 max-w-[200px] truncate">

                            {expense.note || "—"}

                          </div>

                        </td>

                        <td className="py-4 px-6 text-right">

                          <DropdownMenu>

                            <DropdownMenuTrigger asChild>

                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Expense actions">

                                {isDeletingThis ? (

                                  <Loader2 size={16} className="animate-spin" />

                                ) : (

                                  <MoreVertical size={16} />

                                )}

                              </Button>

                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">

                              <DropdownMenuItem

                                onClick={() => void handleDelete(expense)}

                                disabled={isDeletingThis}

                                className="text-red-600 focus:text-red-600 focus:bg-red-50"

                              >

                                <Trash2 size={14} className="mr-2" />

                                Delete

                              </DropdownMenuItem>

                            </DropdownMenuContent>

                          </DropdownMenu>

                        </td>

                      </tr>

                    );

                  })}

                  <tr className="border-t border-gray-200 bg-blue-50/70">

                    <td colSpan={2} className="py-4 px-6 text-sm font-semibold text-gray-800">

                      Total

                    </td>

                    <td className="py-4 px-6 text-sm font-semibold text-red-600 tabular-nums">

                      {total.toLocaleString()} rwf

                    </td>

                    <td colSpan={3} />

                  </tr>

                </tbody>

              </table>

            </DesktopDataTable>

            <MobileDataList>
              {sorted.map((expense, index) => {
                const id = (expense as { _id?: string; id?: number })._id || expense.id;
                const idStr = id != null ? String(id) : "";
                const isDeletingThis = deletingId !== null && idStr === deletingId;
                return (
                  <MobileListCard key={id} index={index}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{expense.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{expense.category || "general"}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" aria-label="Expense actions">
                            {isDeletingThis ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <MoreVertical size={16} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => void handleDelete(expense)}
                            disabled={isDeletingThis}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-red-600 tabular-nums">
                        {Number(expense.amount).toLocaleString()} rwf
                      </span>
                      <span className="text-xs text-gray-500">{formatDateWithTime(expense.date)}</span>
                    </div>
                    {expense.note ? (
                      <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{expense.note}</p>
                    ) : null}
                  </MobileListCard>
                );
              })}
              <MobileListCard className="bg-blue-50/70">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-gray-800">Total</span>
                  <span className="text-red-600 tabular-nums">{total.toLocaleString()} rwf</span>
                </div>
              </MobileListCard>
            </MobileDataList>
            </>

          )}
      </div>
    </AppLayout>

  );

}


