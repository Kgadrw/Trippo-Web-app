import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Wallet } from "lucide-react";
import { formatDateWithTime } from "@/lib/utils";

interface Expense {
  id?: number;
  _id?: string;
  title: string;
  amount: number;
  category?: string;
  date: string;
  note?: string;
}

export default function Expenses() {
  const { toast } = useToast();
  const { items: expenses, isLoading, add, remove, refresh } = useApi<Expense>({
    endpoint: "expenses",
    defaultValue: [],
  });

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );

  const sorted = useMemo(() => {
    return [...expenses].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [expenses]);

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
    }
  };

  return (
    <AppLayout title="Expenses">
      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Wallet size={18} />
            <span className="font-medium">Total Expenses</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-red-600">{total.toLocaleString()} rwf</p>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Expense Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rent, Utilities, Transport" />
            </div>
            <div className="space-y-1">
              <Label>Amount (rwf)</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Rent, Supplies, Salaries" />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Note (Optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional details..." />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>
            Save Expense
          </Button>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">Recent Expenses</h3>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading expenses...</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-gray-500">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((expense) => {
                const id = (expense as any)._id || expense.id;
                return (
                  <div key={id} className="rounded-md border p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{expense.title}</p>
                      <p className="text-xs text-gray-500">
                        {expense.category || "general"} • {formatDateWithTime(expense.date)}
                      </p>
                      {expense.note && <p className="text-xs text-gray-500">{expense.note}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-red-600">{Number(expense.amount).toLocaleString()} rwf</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(expense)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
