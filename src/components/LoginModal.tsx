import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import { getSubdomainUrl, useSubdomain } from "@/hooks/useSubdomain";
import { Lock, User, Mail, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getSavedLoginEmail, isRememberLoginEnabled, setLoginPrefs } from "@/lib/loginPrefs";
import { useTranslation } from "@/hooks/useTranslation";
import { ApiError } from "@/lib/api";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "create";
}

function isDesktopViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

function normalizeAccountPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("250") && digits.length >= 12) return `0${digits.slice(3, 12)}`;
  if (digits.length === 9) return `0${digits}`;
  if (digits.startsWith("0")) return digits.slice(0, 10);
  return digits.slice(0, 15);
}

function isValidAccountPhone(phone: string): boolean {
  return /^0\d{9}$/.test(normalizeAccountPhone(phone));
}

type RegistrationErrors = {
  loginPin?: string;
  createPin?: string;
  confirmPin?: string;
  name?: string;
  email?: string;
  phone?: string;
  resetEmail?: string;
  otp?: string;
  registerOtp?: string;
  newPin?: string;
  confirmNewPin?: string;
};

function mapRegistrationApiErrors(error: unknown): RegistrationErrors {
  if (!(error instanceof ApiError) || !Array.isArray(error.response?.details)) {
    return {};
  }

  const mapped: RegistrationErrors = {};
  for (const detail of error.response.details) {
    const field = typeof detail.field === "string" ? detail.field : "";
    const message = typeof detail.message === "string" ? detail.message : "";
    if (!message) continue;
    if (field === "name") mapped.name = message;
    else if (field === "email") mapped.email = message;
    else if (field === "phone") mapped.phone = message;
    else if (field === "pin") mapped.createPin = message;
    else if (field === "otp") mapped.registerOtp = message;
  }
  return mapped;
}

export function LoginModal({ open, onOpenChange, defaultTab = "login" }: LoginModalProps) {
  const navigate = useNavigate();
  const subdomain = useSubdomain();
  const { setPin } = usePinAuth(); // Still use setPin for backward compatibility
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<"login" | "create">(defaultTab);
  const [loginPin, setLoginPin] = useState("");
  const [createPin, setCreatePin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [registerOtp, setRegisterOtp] = useState("");
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  
  const loginPinRef = useRef<HTMLInputElement>(null);
  const createPinRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const registerOtpRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes or tab changes
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      setLoginPin("");
      setCreatePin("");
      setConfirmPin("");
      setName("");
      setEmail("");
      setPhone("");
      const remember = isRememberLoginEnabled();
      setRememberMe(remember);
      setLoginEmail(defaultTab === "login" && remember ? getSavedLoginEmail() : "");
      setShowForgotPin(false);
      setResetEmail("");
      setOtp("");
      setNewPin("");
      setConfirmNewPin("");
      setOtpSent(false);
      setRegisterOtp("");
      setRegisterOtpSent(false);
      setErrors({});
      
      // Focus appropriate input
      setTimeout(() => {
        if (defaultTab === "login" && loginPinRef.current) {
          loginPinRef.current.focus();
        } else if (defaultTab === "create" && createPinRef.current) {
          createPinRef.current.focus();
        }
      }, 100);
    }
  }, [open, defaultTab]);

  const handleLoginPinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 4);
    setLoginPin(numericValue);
    
    // Show error ONLY if PIN is not equal to 4 digits and has a value
    if (numericValue.length > 0 && numericValue.length !== 4) {
      setErrors((prev) => ({ ...prev, loginPin: "PIN must be 4 digits" }));
    } else {
      // Clear error when PIN is exactly 4 digits or empty
      setErrors((prev) => ({ ...prev, loginPin: undefined }));
    }
    
    // Auto-submit when 4 digits are entered
    if (numericValue.length === 4 && !isLoading) {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    if (loginPin.length !== 4) {
      setErrors((prev) => ({ ...prev, loginPin: "PIN must be 4 digits" }));
      return;
    }

    if (!loginEmail.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }

    setIsLoading(true);
    setErrors((prev) => ({ ...prev, loginPin: undefined, email: undefined }));

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      const adminAliases = new Set(["admin", "admin@trippo.rw", "admin@trippo.com"]);
      if (adminAliases.has(normalizedEmail)) {
        setIsLoading(false);
        toast({
          title: "Use the admin portal",
          description: "Administrators must sign in at the admin site, not here.",
          variant: "destructive",
        });
        return;
      }

      const response = await authApi.login({ 
        pin: loginPin,
        email: normalizedEmail
      });

      if (response.user) {
        if (response.isAdmin || response.user.email === 'admin') {
          setIsLoading(false);
          toast({
            title: "Use the admin portal",
            description: "Administrators must sign in at the admin site, not here.",
            variant: "destructive",
          });
          return;
        }

        // Store PIN in localStorage for backward compatibility
        setPin(loginPin);
        
        // Store user info and ID
        if (response.user.name) {
          localStorage.setItem("profit-pilot-user-name", response.user.name);
        }
        if (response.user.email) {
          localStorage.setItem("profit-pilot-user-email", response.user.email);
        }
        // Only store businessName if it exists and is not empty
        if (response.user.businessName && response.user.businessName.trim()) {
          localStorage.setItem("profit-pilot-business-name", response.user.businessName.trim());
        } else {
          // Clear businessName if it's empty or undefined
          localStorage.removeItem("profit-pilot-business-name");
        }
        // Store user ID for API requests
        if (response.user._id || response.user.id) {
          localStorage.setItem("profit-pilot-user-id", response.user._id || response.user.id);
        }

        // Set authentication flag in sessionStorage
        localStorage.setItem("profit-pilot-authenticated", "true");
        
        // Dispatch authentication event
        window.dispatchEvent(new Event("pin-auth-changed"));

        // Trigger user data update event
        window.dispatchEvent(new Event("user-data-changed"));

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });

        setLoginPrefs(normalizedEmail, rememberMe);

        onOpenChange(false);
        // Desktop on main domain: stay on same origin so localStorage persists across visits
        // Always redirect to dashboard subdomain
        const authToken = btoa(JSON.stringify({
          userId: response.user._id || response.user.id,
          isAdmin: false,
          authenticated: true,
          name: response.user.name,
          email: response.user.email,
          businessName: response.user.businessName || ''
        }));
        const dashboardUrl = getSubdomainUrl('dashboard', `#auth=${authToken}`);
        window.location.href = dashboardUrl;
      }
    } catch (error: any) {
      const errorMessage = error.response?.error || error.message || "Login failed. Please try again.";
      setErrors((prev) => ({ ...prev, loginPin: errorMessage }));
      setLoginPin("");
      setTimeout(() => loginPinRef.current?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 4);
    setCreatePin(numericValue);
    
    // Show error if PIN is less than 4 digits and has a value
    if (numericValue.length > 0 && numericValue.length < 4) {
      setErrors((prev) => ({ ...prev, createPin: "PIN must be 4 digits" }));
    } else {
      setErrors((prev) => ({ ...prev, createPin: undefined }));
    }
  };

  const handleConfirmPinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 4);
    setConfirmPin(numericValue);
    setErrors((prev) => ({ ...prev, confirmPin: undefined }));
  };

  const validateRegistrationFields = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!isValidAccountPhone(phone.trim())) {
      newErrors.phone = "Enter a valid phone number (e.g. 0781234567)";
    }

    if (createPin.length !== 4) {
      newErrors.createPin = "PIN must be 4 digits";
    }

    if (confirmPin.length !== 4) {
      newErrors.confirmPin = "Please confirm your PIN";
    } else if (createPin !== confirmPin) {
      newErrors.confirmPin = "PINs do not match";
    }

    return newErrors;
  };

  const handleSendRegistrationOtp = async () => {
    const fieldErrors = validateRegistrationFields();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await authApi.sendRegistrationOtp({ email: email.trim().toLowerCase() });
      setRegisterOtpSent(true);
      toast({
        title: "Verification code sent",
        description: `Check ${email.trim().toLowerCase()} for your 6-digit code.`,
      });
      setTimeout(() => registerOtpRef.current?.focus(), 100);
    } catch (error: unknown) {
      const fieldErrors = mapRegistrationApiErrors(error);
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to send verification code.";
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else if (errorMessage.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      } else {
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    const newErrors = validateRegistrationFields();

    if (!registerOtpSent) {
      newErrors.registerOtp = "Send a verification code to your email first";
    } else if (!registerOtp.trim()) {
      newErrors.registerOtp = "Verification code is required";
    } else if (registerOtp.length !== 6 || !/^\d{6}$/.test(registerOtp)) {
      newErrors.registerOtp = "Verification code must be 6 digits";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizeAccountPhone(phone.trim()),
        pin: createPin,
        otp: registerOtp.trim(),
      });

      if (response.user) {
        // Store PIN in localStorage for backward compatibility
        setPin(createPin);
        
        // Store user info and ID
        if (response.user.name) {
          localStorage.setItem("profit-pilot-user-name", response.user.name);
        }
        if (response.user.email) {
          localStorage.setItem("profit-pilot-user-email", response.user.email);
        }
        // Only store businessName if it exists and is not empty
        if (response.user.businessName && response.user.businessName.trim()) {
          localStorage.setItem("profit-pilot-business-name", response.user.businessName.trim());
        } else {
          // Clear businessName if it's empty or undefined
          localStorage.removeItem("profit-pilot-business-name");
        }
        // Store user ID for API requests
        if (response.user._id || response.user.id) {
          localStorage.setItem("profit-pilot-user-id", response.user._id || response.user.id);
        }

        // Set authentication flag in sessionStorage
        localStorage.setItem("profit-pilot-authenticated", "true");
        
        // Dispatch authentication event
        window.dispatchEvent(new Event("pin-auth-changed"));
        
        // Trigger user data update event
        window.dispatchEvent(new Event("user-data-changed"));

        toast({
          title: "Account created!",
          description: "Welcome to Trippo. Your account has been created successfully.",
        });

        setLoginPrefs(email.trim().toLowerCase(), true);

        onOpenChange(false);
        if (subdomain === null && isDesktopViewport()) {
          navigate("/dashboard", { replace: true });
          return;
        }
        const authToken = btoa(JSON.stringify({
          userId: response.user._id || response.user.id,
          isAdmin: false,
          authenticated: true,
          name: response.user.name,
          email: response.user.email,
          businessName: response.user.businessName || ''
        }));
        const dashboardUrl = getSubdomainUrl('dashboard', `#auth=${authToken}`);
        window.location.href = dashboardUrl;
      }
    } catch (error: unknown) {
      const fieldErrors = mapRegistrationApiErrors(error);
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to create account. Please try again.";

      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        return;
      }

      if (errorMessage.toLowerCase().includes("verification") || errorMessage.toLowerCase().includes("otp")) {
        setErrors((prev) => ({ ...prev, registerOtp: errorMessage }));
      } else if (errorMessage.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      } else if (errorMessage.toLowerCase().includes("phone")) {
        setErrors((prev) => ({ ...prev, phone: errorMessage }));
      } else if (errorMessage.toLowerCase().includes("name")) {
        setErrors((prev) => ({ ...prev, name: errorMessage }));
      } else if (errorMessage.includes("PIN")) {
        setErrors((prev) => ({ ...prev, createPin: errorMessage }));
      } else {
        setErrors((prev) => ({ ...prev, createPin: errorMessage }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === "Enter") {
      action();
    }
  };

  const handleSendOTP = async () => {
    if (!resetEmail.trim()) {
      setErrors((prev) => ({ ...prev, resetEmail: "Email is required" }));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setErrors((prev) => ({ ...prev, resetEmail: "Please enter a valid email address" }));
      return;
    }

    setIsLoading(true);
    setErrors((prev) => ({ ...prev, resetEmail: undefined }));

    try {
      const response = await authApi.forgotPin({ email: resetEmail.trim().toLowerCase() });
      
      if (response.message) {
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: `If an account exists for ${resetEmail.trim().toLowerCase()}, check your inbox and spam folder for the 6-digit code.`,
        });
        setTimeout(() => {
          otpRef.current?.focus();
        }, 100);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to send OTP. Please try again.";
      setErrors((prev) => ({ ...prev, resetEmail: errorMessage }));
      setOtpSent(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPin = async () => {
    const newErrors: typeof errors = {};

    if (!otp.trim()) {
      newErrors.otp = "OTP is required";
    } else if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      newErrors.otp = "OTP must be 6 digits";
    }

    if (!newPin.trim()) {
      newErrors.newPin = "New PIN is required";
    } else if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      newErrors.newPin = "PIN must be 4 digits";
    }

    if (!confirmNewPin.trim()) {
      newErrors.confirmNewPin = "Please confirm your PIN";
    } else if (confirmNewPin !== newPin) {
      newErrors.confirmNewPin = "PINs do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.resetPin({
        email: resetEmail.trim().toLowerCase(),
        otp: otp.trim(),
        newPin: newPin.trim(),
      });

      if (response.message) {
        toast({
          title: "PIN Reset Successful",
          description: "Your PIN has been reset. You can now login with your new PIN.",
        });
        setShowForgotPin(false);
        setResetEmail("");
        setOtp("");
        setNewPin("");
        setConfirmNewPin("");
        setOtpSent(false);
        setActiveTab("login");
        setLoginEmail(resetEmail.trim());
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to reset PIN. Please try again.";
      if (errorMessage.toLowerCase().includes("otp") || errorMessage.toLowerCase().includes("expired")) {
        setErrors((prev) => ({ ...prev, otp: errorMessage }));
      } else if (errorMessage.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, resetEmail: errorMessage }));
      } else {
        setErrors((prev) => ({ ...prev, newPin: errorMessage }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t("welcomeToTrippo")}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "create")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("signIn")}</TabsTrigger>
            <TabsTrigger value="create">{t("createAccount")}</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="space-y-4 mt-4">
            {!showForgotPin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="flex items-center gap-2">
                    <Mail size={16} />
                    {t("emailAddress")}
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder={t("emailAddress")}
                    className={errors.email ? "border-red-500" : ""}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-pin" className="flex items-center gap-2">
                    <Lock size={16} />
                    {t("enterYourPin")}
                  </Label>
                  <Input
                    id="login-pin"
                    ref={loginPinRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={loginPin}
                    onChange={(e) => handleLoginPinChange(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                    placeholder="Enter 4-digit PIN"
                    className={
                      loginPin.length === 4 && !errors.loginPin
                        ? "border-green-500 ring-2 ring-green-500/20 focus:ring-green-500/40"
                        : errors.loginPin && loginPin.length !== 4
                        ? "border-red-500 ring-2 ring-red-500/20 focus:ring-red-500/40"
                        : ""
                    }
                    disabled={isLoading}
                  />
                  {errors.loginPin && (errors.loginPin !== "PIN must be 4 digits" || loginPin.length !== 4) && (
                    <p className="text-sm text-red-500">{errors.loginPin}</p>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="remember-login"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="remember-login" className="text-sm text-muted-foreground cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
                <Button
                  onClick={handleLogin}
                  className="w-full bg-primary text-white hover:bg-blue-700 hover:text-white"
                  disabled={loginPin.length !== 4 || isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPin(true);
                      setResetEmail(loginEmail);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    {t("forgotPin")}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Forgot PIN Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t("resetYourPin")}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPin(false);
                        setResetEmail("");
                        setOtp("");
                        setNewPin("");
                        setConfirmNewPin("");
                        setOtpSent(false);
                        setErrors({});
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Back to Login
                    </button>
                  </div>

              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="flex items-center gap-2">
                      <Mail size={16} />
                      Email Address
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, resetEmail: undefined }));
                      }}
                      placeholder="Enter your email"
                      className={errors.resetEmail ? "border-red-500" : ""}
                      onKeyPress={(e) => handleKeyPress(e, handleSendOTP)}
                    />
                    {errors.resetEmail && (
                      <p className="text-sm text-red-500">{errors.resetEmail}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleSendOTP}
                    className="w-full bg-primary text-white hover:bg-blue-700 hover:text-white"
                    disabled={isLoading || !resetEmail.trim()}
                  >
                    {isLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      An OTP has been sent to <strong>{resetEmail}</strong>. Please check your email and enter the 6-digit code below.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="flex items-center gap-2">
                      <Lock size={16} />
                      Enter OTP (6 digits)
                    </Label>
                    <Input
                      id="otp"
                      ref={otpRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(numericValue);
                        setErrors((prev) => ({ ...prev, otp: undefined }));
                      }}
                      placeholder="Enter 6-digit OTP"
                      className={errors.otp ? "border-red-500" : ""}
                    />
                    {errors.otp && (
                      <p className="text-sm text-red-500">{errors.otp}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-pin" className="flex items-center gap-2">
                      <Lock size={16} />
                      New PIN (4 digits)
                    </Label>
                    <Input
                      id="new-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setNewPin(numericValue);
                        setErrors((prev) => ({ ...prev, newPin: undefined }));
                      }}
                      placeholder="Enter new 4-digit PIN"
                      className={errors.newPin ? "border-red-500" : ""}
                    />
                    {errors.newPin && (
                      <p className="text-sm text-red-500">{errors.newPin}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-pin" className="flex items-center gap-2">
                      <Lock size={16} />
                      Confirm New PIN
                    </Label>
                    <Input
                      id="confirm-new-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmNewPin}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setConfirmNewPin(numericValue);
                        setErrors((prev) => ({ ...prev, confirmNewPin: undefined }));
                      }}
                      placeholder="Re-enter new PIN"
                      className={errors.confirmNewPin ? "border-red-500" : ""}
                      onKeyPress={(e) => handleKeyPress(e, handleResetPin)}
                    />
                    {errors.confirmNewPin && (
                      <p className="text-sm text-red-500">{errors.confirmNewPin}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleResetPin}
                    className="w-full bg-green-600 text-white hover:bg-green-700"
                    disabled={isLoading || otp.length !== 6 || newPin.length !== 4 || confirmNewPin.length !== 4}
                  >
                    {isLoading ? "Resetting PIN..." : "Reset PIN"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setNewPin("");
                        setConfirmNewPin("");
                        setErrors({});
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Resend OTP
                    </button>
                  </div>
                </>
              )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Create Account Tab */}
          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User size={16} />
                {t("fullName")}
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Enter your full name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail size={16} />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setRegisterOtpSent(false);
                  setRegisterOtp("");
                  setErrors((prev) => ({ ...prev, email: undefined, registerOtp: undefined }));
                }}
                placeholder="Enter your email"
                className={errors.email ? "border-red-500" : ""}
                required
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone size={16} />
                {t("phoneNumber")}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="Enter your phone number"
                className={errors.phone ? "border-red-500" : ""}
                required
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-pin" className="flex items-center gap-2">
                <Lock size={16} />
                {t("setPin")} (4)
              </Label>
              <Input
                id="create-pin"
                ref={createPinRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={createPin}
                onChange={(e) => handleCreatePinChange(e.target.value)}
                placeholder="Enter 4-digit PIN"
                className={errors.createPin ? "border-red-500" : ""}
              />
              {errors.createPin && (
                <p className="text-sm text-red-500">{errors.createPin}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pin" className="flex items-center gap-2">
                <Lock size={16} />
                {t("confirmPin")}
              </Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleCreateAccount)}
                placeholder="Re-enter 4-digit PIN"
                className={errors.confirmPin ? "border-red-500" : ""}
              />
              {errors.confirmPin && (
                <p className="text-sm text-red-500">{errors.confirmPin}</p>
              )}
            </div>

            {registerOtpSent ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  A 6-digit code was sent to <strong>{email.trim().toLowerCase()}</strong>.
                </p>
                <Label htmlFor="register-otp" className="flex items-center gap-2">
                  <Mail size={16} />
                  {t("verificationCode")}
                </Label>
                <Input
                  id="register-otp"
                  ref={registerOtpRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={registerOtp}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setRegisterOtp(numericValue);
                    setErrors((prev) => ({ ...prev, registerOtp: undefined }));
                  }}
                  onKeyPress={(e) => handleKeyPress(e, handleCreateAccount)}
                  placeholder="Enter 6-digit code"
                  className={errors.registerOtp ? "border-red-500" : ""}
                />
                {errors.registerOtp && (
                  <p className="text-sm text-red-500">{errors.registerOtp}</p>
                )}
                <button
                  type="button"
                  onClick={() => void handleSendRegistrationOtp()}
                  className="text-sm text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline"
                  disabled={isLoading}
                >
                  {t("resendCode")}
                </button>
              </div>
            ) : null}

            {!registerOtpSent ? (
              <Button
                onClick={() => void handleSendRegistrationOtp()}
                className="w-full bg-primary text-white hover:bg-blue-700 hover:text-white"
                disabled={isLoading}
              >
                {isLoading ? t("sendingCode") : t("sendVerificationCode")}
              </Button>
            ) : (
              <Button
                onClick={() => void handleCreateAccount()}
                className="w-full bg-primary text-white hover:bg-blue-700 hover:text-white"
                disabled={isLoading || registerOtp.length !== 6}
              >
                {isLoading ? t("creatingAccount") : t("createAccount")}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
