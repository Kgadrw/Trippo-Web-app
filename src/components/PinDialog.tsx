import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, X } from "lucide-react";
import { usePinAuth } from "@/hooks/usePinAuth";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const PinDialog = ({
  open,
  onOpenChange,
  onSuccess,
  title = "Enter PIN",
  description = "Please enter your 4-digit PIN to view sensitive information",
}: PinDialogProps) => {
  const { verifyPin } = usePinAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      // Focus input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handlePinChange = (value: string) => {
    // Only allow digits and max 4 characters
    const numericValue = value.replace(/\D/g, "").slice(0, 4);
    setPin(numericValue);
    setError("");

    // Auto-submit when 4 digits are entered
    if (numericValue.length === 4) {
      handleSubmit(numericValue);
    }
  };

  const handleSubmit = (pinToVerify?: string) => {
    const pinValue = pinToVerify || pin;
    if (pinValue.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    if (verifyPin(pinValue)) {
      setError("");
      onSuccess();
      onOpenChange(false);
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pin.length === 4) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pin-input" className="text-sm font-medium">
              4-Digit PIN
            </Label>
            <Input
              id="pin-input"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-center text-2xl tracking-widest h-14 font-mono"
              placeholder="••••"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </div>
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => handleSubmit()}
              disabled={pin.length !== 4}
              className="w-full"
            >
              Verify PIN
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setPin("");
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
