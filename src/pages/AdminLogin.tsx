import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { isAdminSession, loginAsAdmin } from "@/lib/adminAuth";
import { getSavedLoginEmail, isRememberLoginEnabled, setLoginPrefs } from "@/lib/loginPrefs";
import { cn } from "@/lib/utils";

const loginInputClass =
  "!border !border-gray-400 !shadow-none focus-visible:!ring-0 focus-visible:!border-gray-600 bg-white";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const pinRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; pin?: string }>({});

  useEffect(() => {
    if (isAdminSession()) {
      navigate("/", { replace: true });
      return;
    }

    const remember = isRememberLoginEnabled();
    setRememberMe(remember);
    if (remember) {
      setEmail(getSavedLoginEmail() || "admin@trippo.rw");
    }
  }, [navigate]);

  const handlePinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 4);
    setPin(numericValue);
    if (numericValue.length > 0 && numericValue.length !== 4) {
      setErrors((prev) => ({ ...prev, pin: "PIN must be 4 digits" }));
    } else {
      setErrors((prev) => ({ ...prev, pin: undefined }));
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }
    if (pin.length !== 4) {
      setErrors((prev) => ({ ...prev, pin: "PIN must be 4 digits" }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await loginAsAdmin(pin, email);
      setLoginPrefs(email.trim().toLowerCase(), rememberMe);
      toast({
        title: "Welcome back",
        description: "Admin session started.",
      });
      navigate("/", { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Admin login failed";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="relative hidden lg:block min-h-screen bg-gray-100">
        <img
          src="/4.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.endsWith("/4.jpg")) {
              img.src = "/card4.jpg";
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-sm uppercase tracking-widest text-white/80 mb-2">Trippo Admin</p>
          <h1 className="text-3xl font-normal max-w-md">Platform control for your business operations</h1>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2.5">
              <img src="/logo.png" alt="Trippo" className="h-10 w-10 object-contain" />
              <span className="text-2xl font-normal text-gray-700 lowercase">trippo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sign in to your admin account.
            </p>
          </div>

          <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="admin@trippo.rw"
                  className={cn("pl-10", loginInputClass)}
                />
              </div>
              {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-pin">Pin</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-pin"
                  ref={pinRef}
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••"
                  className={cn("pl-10 tracking-[0.4em]", loginInputClass)}
                />
              </div>
              {errors.pin ? <p className="text-xs text-red-600">{errors.pin}</p> : null}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
              Remember email on this device
            </label>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
