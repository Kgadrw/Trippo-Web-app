import { useState, useEffect } from "react";
import { Calculator, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChangeCalculatorProps {
  totalAmount: number;
}

export function ChangeCalculator({ totalAmount }: ChangeCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [change, setChange] = useState(0);

  useEffect(() => {
    if (amountPaid && totalAmount > 0) {
      const paid = parseFloat(amountPaid) || 0;
      const calculatedChange = paid - totalAmount;
      setChange(calculatedChange >= 0 ? calculatedChange : 0);
    } else {
      setChange(0);
    }
  }, [amountPaid, totalAmount]);

  const handleClear = () => {
    setAmountPaid("");
    setChange(0);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="border-blue-700 text-blue-700 hover:bg-blue-50"
      >
        <Calculator size={16} className="mr-2" />
        Calculate Change
      </Button>
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-blue-700" />
          <Label className="text-sm font-semibold text-gray-900">Change Calculator</Label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            handleClear();
          }}
          className="h-6 w-6 p-0 hover:bg-gray-100 text-gray-700"
        >
          <X size={14} className="text-gray-700" />
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Total Amount</Label>
            <div className="input-field bg-gray-50 border-gray-300 text-gray-900 font-semibold cursor-not-allowed">
              {totalAmount.toLocaleString()} rwf
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Amount Paid</Label>
            <Input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Enter amount paid"
              className="input-field border-gray-300 text-gray-900"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-gray-900 font-medium">Change</Label>
          <div className={`input-field font-bold border-2 ${
            change >= 0 
              ? "bg-green-100 border-green-500 text-green-800" 
              : "bg-red-100 border-red-500 text-red-800"
          }`}>
            {change >= 0 ? `${change.toLocaleString()} rwf` : "Insufficient payment"}
          </div>
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 hover:text-gray-900"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
