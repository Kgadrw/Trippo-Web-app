import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import { redirectToBookfyWithSession } from "@/hooks/useSubdomain";
import { Checkbox } from "@/components/ui/checkbox";
import { getSavedLoginEmail, isRememberLoginEnabled, setLoginPrefs } from "@/lib/loginPrefs";
import { useTranslation } from "@/hooks/useTranslation";
import { ApiError } from "@/lib/api";
import { GoogleSignInSection } from "@/components/auth/GoogleSignInSection";
import { GoogleOneTapPrompt } from "@/components/auth/GoogleOneTapPrompt";
import { PasswordInput } from "@/components/auth/PasswordInput";
import type { CredentialResponse } from "@react-oauth/google";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
  loginPassword?: string;
  createPassword?: string;
  confirmPassword?: string;
  name?: string;
  email?: string;
  phone?: string;
  resetEmail?: string;
  otp?: string;
  registerOtp?: string;
  newPassword?: string;
  confirmNewPassword?: string;
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
    else if (field === "pin" || field === "password") mapped.createPassword = message;
    else if (field === "otp") mapped.registerOtp = message;
  }
  return mapped;
}

export interface LoginFormProps {
  defaultTab?: "login" | "create";
  /** Called after session is stored. Use for in-app navigation on the dashboard login page. */
  onSuccess?: () => void;
  /** When true, redirect to bookfy via URL hash (main-site modal flow). */
  redirectToBookfy?: boolean;
  className?: string;
  showTitle?: boolean;
  /** Pill-shaped inputs, tabs, and buttons (dashboard login page). */
  pillStyle?: boolean;
  /** Smaller card-friendly sizing for dashboard login overlay. */
  compact?: boolean;
}

function fieldLabelClass(pillStyle: boolean, compact?: boolean) {
  return cn(
    "block",
    compact ? "mb-2.5 text-xs sm:text-sm" : pillStyle ? "text-sm mb-2 sm:mb-3" : "mb-2 text-sm",
  );
}

function fieldErrorClass(compact?: boolean) {
  return cn("mt-0.5 text-red-500", compact ? "text-[11px]" : "mt-1 text-xs sm:mt-1.5 sm:text-sm");
}

function fieldInputClass(pillStyle: boolean, hasError?: boolean, compact?: boolean) {
  return cn(
    pillStyle &&
      cn(
        "!rounded-none border-gray-200 !bg-gray-100 !shadow-none text-sm focus-visible:!border-gray-300 focus-visible:!bg-gray-50 focus-visible:!shadow-none focus-visible:!ring-0",
        compact ? "!h-9 px-3.5 text-sm" : "!h-9 px-3 sm:!h-11 sm:px-4",
      ),
    hasError && "border-red-500",
  );
}

function inlineActionInputClass(pillStyle: boolean, hasError?: boolean, compact?: boolean) {
  return cn(fieldInputClass(pillStyle, hasError, compact), pillStyle && "!pr-[7.5rem]");
}

function inlineActionButtonClass(pillStyle: boolean, compact?: boolean) {
  return cn(
    "absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center !rounded-full font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    pillStyle
      ? cn(
          "bg-sky-400 hover:bg-sky-500",
          compact ? "h-7 min-w-[4.5rem] px-2.5 text-[11px]" : "h-8 min-w-[5rem] px-3 text-xs",
        )
      : "h-8 bg-sky-400 px-3 text-xs hover:bg-sky-500",
  );
}

const pillPrimaryButtonClass =
  "w-full !rounded-full border border-sky-400 bg-sky-400 text-white hover:bg-sky-500 hover:text-white";
const pillSuccessButtonClass =
  "w-full !rounded-full bg-green-600 text-white hover:bg-green-700";

function actionButtonClass(
  pillStyle: boolean,
  variant: "primary" | "success" = "primary",
  compact?: boolean,
) {
  const sizeClass = compact
    ? "!h-9 text-sm"
    : pillStyle
      ? "!h-9 text-sm sm:!h-11 sm:text-base"
      : "";
  if (!pillStyle) {
    return variant === "success"
      ? cn("w-full !rounded-full bg-green-600 text-white hover:bg-green-700", sizeClass)
      : cn(
          "w-full !rounded-full border border-sky-400 bg-sky-400 text-white hover:bg-sky-500 hover:text-white",
          sizeClass,
        );
  }
  return cn(variant === "success" ? pillSuccessButtonClass : pillPrimaryButtonClass, sizeClass);
}

function pillTabListClass(compact?: boolean) {
  return cn("rounded-full bg-gray-100", compact ? "h-9 p-0.5" : "h-9 p-0.5 sm:h-12 sm:p-1");
}

const pillTabTriggerClass =
  "h-full w-full rounded-full font-medium transition-all data-[state=active]:!rounded-full data-[state=active]:!bg-white data-[state=active]:!text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground";

function pillTabTriggerClassFor(compact?: boolean) {
  return cn(
    pillTabTriggerClass,
    compact ? "px-2.5 py-1.5 text-xs" : "px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm",
  );
}

function pillRememberCheckboxClassFor(compact?: boolean) {
  return cn(
    "!rounded-full border-gray-300 !bg-gray-100 !shadow-none hover:border-gray-400 focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=checked]:!border-sky-400 data-[state=checked]:!bg-sky-400 data-[state=checked]:text-white",
    compact ? "!h-4 !w-4" : "!h-4 !w-4 sm:!h-5 sm:!w-5",
  );
}

function tabsContentClass(pillStyle: boolean, compact?: boolean) {
  return cn(
    "mt-4 space-y-4",
    pillStyle && (compact ? "mt-2.5 space-y-2.5" : "mt-2.5 space-y-2.5 sm:mt-4 sm:space-y-4"),
  );
}

export function LoginForm({
  defaultTab = "login",
  onSuccess,
  redirectToBookfy = false,
  className,
  showTitle = true,
  pillStyle = false,
  compact = false,
}: LoginFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"login" | "create">(defaultTab);
  const [loginPassword, setLoginPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [registerOtp, setRegisterOtp] = useState("");
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<RegistrationErrors>({});

  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const createPasswordRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const registerOtpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(defaultTab);
    setLoginPassword("");
    setCreatePassword("");
    setConfirmPassword("");
    setName("");
    setEmail("");
    setPhone("");
    const remember = isRememberLoginEnabled();
    setRememberMe(remember);
    setLoginEmail(defaultTab === "login" && remember ? getSavedLoginEmail() : "");
    setShowForgotPassword(false);
    setResetEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setOtpSent(false);
    setRegisterOtp("");
    setRegisterOtpSent(false);
    setErrors({});

    const timer = window.setTimeout(() => {
      if (defaultTab === "login" && loginPasswordRef.current) {
        loginPasswordRef.current.focus();
      } else if (defaultTab === "create" && createPasswordRef.current) {
        createPasswordRef.current.focus();
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, [defaultTab]);

  const googleLoginHint = useMemo(() => {
    const typed = loginEmail.trim();
    if (typed && isValidEmail(typed)) return typed.toLowerCase();
    return getSavedLoginEmail();
  }, [loginEmail]);

  const completeLogin = (
    user: {
      _id?: string;
      id?: string;
      name?: string;
      email?: string;
      businessName?: string;
      profilePictureUrl?: string;
    },
    emailForRemember?: string,
    welcome?: { title: string; description: string },
  ) => {
    if (user.name) {
      localStorage.setItem("profit-pilot-user-name", user.name);
    }
    if (user.email) {
      localStorage.setItem("profit-pilot-user-email", user.email);
    }
    if (user.businessName && user.businessName.trim()) {
      localStorage.setItem("profit-pilot-business-name", user.businessName.trim());
    } else {
      localStorage.removeItem("profit-pilot-business-name");
    }
    if (user.profilePictureUrl) {
      localStorage.setItem("profit-pilot-profile-picture-url", user.profilePictureUrl);
    } else {
      localStorage.removeItem("profit-pilot-profile-picture-url");
    }
    if (user._id || user.id) {
      localStorage.setItem("profit-pilot-user-id", user._id || user.id || "");
    }

    localStorage.setItem("profit-pilot-authenticated", "true");
    window.dispatchEvent(new Event("pin-auth-changed"));
    window.dispatchEvent(new Event("user-data-changed"));

    toast({
      title: welcome?.title || "Welcome back!",
      description: welcome?.description || "You have successfully logged in.",
    });

    if (emailForRemember) {
      setLoginPrefs(emailForRemember, rememberMe);
    }

    if (redirectToBookfy) {
      redirectToBookfyWithSession("/");
      return;
    }

    onSuccess?.();
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;
    if (!credential) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.googleAuth({ credential });

      if (response.needsProfile) {
        return;
      }

      if (response.user) {
        const welcome = response.created
          ? {
              title: "Account created!",
              description: response.merged
                ? "Your Google account is now linked to your existing Trippo account."
                : "Welcome to Trippo. Your Google account is connected.",
            }
          : response.merged
            ? {
                title: "Account linked",
                description:
                  "Your Google account is now linked. You can sign in with Google or your password.",
              }
            : undefined;

        completeLogin(response.user, response.user.email, welcome);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Google sign-in failed. Please try again.";
      toast({
        title: "Google sign-in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!isValidPassword(loginPassword)) {
      setErrors((prev) => ({
        ...prev,
        loginPassword: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      }));
      return;
    }

    if (!loginEmail.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }

    setIsLoading(true);
    setErrors((prev) => ({ ...prev, loginPassword: undefined, email: undefined }));

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
        password: loginPassword,
        email: normalizedEmail,
      });

      if (response.user) {
        if (response.isAdmin || response.user.email === "admin") {
          setIsLoading(false);
          toast({
            title: "Use the admin portal",
            description: "Administrators must sign in at the admin site, not here.",
            variant: "destructive",
          });
          return;
        }

        completeLogin(response.user, normalizedEmail);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Login failed. Please try again.";
      setErrors((prev) => ({ ...prev, loginPassword: errorMessage }));
      setLoginPassword("");
      setTimeout(() => loginPasswordRef.current?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
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

    if (!isValidPassword(createPassword)) {
      newErrors.createPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!isValidPassword(confirmPassword)) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (createPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const handleSendRegistrationOtp = async (emailOnly = false) => {
    if (emailOnly) {
      const emailErrors: RegistrationErrors = {};
      if (!email.trim()) {
        emailErrors.email = "Email is required";
      } else if (!isValidEmail(email)) {
        emailErrors.email = "Please enter a valid email address";
      }
      if (Object.keys(emailErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...emailErrors }));
        return;
      }
    } else {
      const fieldErrors = validateRegistrationFields();
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);
    setErrors((prev) => ({ ...prev, email: undefined, registerOtp: undefined }));

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
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
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
        password: createPassword,
        otp: registerOtp.trim(),
      });

      if (response.user) {
        completeLogin(response.user, email.trim().toLowerCase(), {
          title: "Account created!",
          description: "Welcome to Trippo. Your account has been created successfully.",
        });
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

      if (
        errorMessage.toLowerCase().includes("verification") ||
        errorMessage.toLowerCase().includes("otp")
      ) {
        setErrors((prev) => ({ ...prev, registerOtp: errorMessage }));
      } else if (errorMessage.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      } else if (errorMessage.toLowerCase().includes("phone")) {
        setErrors((prev) => ({ ...prev, phone: errorMessage }));
      } else if (errorMessage.toLowerCase().includes("name")) {
        setErrors((prev) => ({ ...prev, name: errorMessage }));
      } else if (errorMessage.includes("password") || errorMessage.includes("Password")) {
        setErrors((prev) => ({ ...prev, createPassword: errorMessage }));
      } else {
        setErrors((prev) => ({ ...prev, createPassword: errorMessage }));
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
      const response = await authApi.forgotPassword({ email: resetEmail.trim().toLowerCase() });

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

  const handleResetPassword = async () => {
    const newErrors: typeof errors = {};

    if (!otp.trim()) {
      newErrors.otp = "OTP is required";
    } else if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      newErrors.otp = "OTP must be 6 digits";
    }

    if (!isValidPassword(newPassword)) {
      newErrors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!isValidPassword(confirmNewPassword)) {
      newErrors.confirmNewPassword = "Please confirm your password";
    } else if (confirmNewPassword !== newPassword) {
      newErrors.confirmNewPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.resetPassword({
        email: resetEmail.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword: newPassword.trim(),
      });

      if (response.message) {
        toast({
          title: "Password reset successful",
          description: "You can now sign in with your new password.",
        });
        setShowForgotPassword(false);
        setResetEmail("");
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
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
            : "Failed to reset password. Please try again.";
      if (errorMessage.toLowerCase().includes("otp") || errorMessage.toLowerCase().includes("expired")) {
        setErrors((prev) => ({ ...prev, otp: errorMessage }));
      } else if (errorMessage.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, resetEmail: errorMessage }));
      } else {
        setErrors((prev) => ({ ...prev, newPassword: errorMessage }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {showTitle ? (
        <h1 className="text-2xl font-bold text-gray-900">{t("welcomeToTrippo")}</h1>
      ) : null}

      <GoogleOneTapPrompt
        onSuccess={handleGoogleSuccess}
        disabled={isLoading || showForgotPassword}
        autoSelect
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "login" | "create")}
        className="w-full"
      >
        <TabsList className={cn("grid w-full grid-cols-2", pillStyle && pillTabListClass(compact))}>
          <TabsTrigger value="login" className={cn(pillStyle && pillTabTriggerClassFor(compact))}>
            {t("signIn")}
          </TabsTrigger>
          <TabsTrigger value="create" className={cn(pillStyle && pillTabTriggerClassFor(compact))}>
            {t("createAccount")}
          </TabsTrigger>
        </TabsList>

        {!showForgotPassword ? (
          <div className={cn(compact ? "mt-3 space-y-3" : "mt-4 space-y-4")}>
            <GoogleSignInSection
              onSuccess={handleGoogleSuccess}
              disabled={isLoading}
              compact={compact || pillStyle}
              loginHint={googleLoginHint}
              hideDivider
            />
            <div className={cn("relative", compact ? "py-0.5" : "py-1")}>
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or use email</span>
              </div>
            </div>
          </div>
        ) : null}

        <TabsContent value="login" className={tabsContentClass(pillStyle, compact)}>
          {!showForgotPassword ? (
            <>
              <div>
                <Label htmlFor="login-email" className={fieldLabelClass(pillStyle, compact)}>
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
                  className={fieldInputClass(pillStyle, Boolean(errors.email), compact)}
                  required
                />
                {errors.email ? <p className={fieldErrorClass(compact)}>{errors.email}</p> : null}
              </div>
              <div>
                <Label htmlFor="login-password" className={fieldLabelClass(pillStyle, compact)}>
                  Password
                </Label>
                <PasswordInput
                  id="login-password"
                  ref={loginPasswordRef}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, loginPassword: undefined }));
                  }}
                  onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                  placeholder="Enter your password"
                  className={fieldInputClass(pillStyle, Boolean(errors.loginPassword), compact)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                {errors.loginPassword ? (
                  <p className={fieldErrorClass(compact)}>{errors.loginPassword}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="remember-login"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v === true)}
                  className={cn(pillStyle && pillRememberCheckboxClassFor(compact))}
                />
                <label
                  htmlFor="remember-login"
                  className={cn(
                    "cursor-pointer select-none text-muted-foreground",
                    compact ? "text-xs" : "text-xs sm:text-sm",
                  )}
                >
                  Remember me
                </label>
              </div>
              <Button
                onClick={handleLogin}
                className={actionButtonClass(pillStyle, "primary", compact)}
                disabled={!isValidPassword(loginPassword) || isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetEmail(loginEmail);
                  }}
                  className="text-sm text-blue-600 underline hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Reset your password</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                    setOtp("");
                    setNewPassword("");
                    setConfirmNewPassword("");
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
                  <div>
                    <Label htmlFor="reset-email" className={fieldLabelClass(pillStyle, compact)}>
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
                      className={fieldInputClass(pillStyle, Boolean(errors.resetEmail), compact)}
                      onKeyPress={(e) => handleKeyPress(e, handleSendOTP)}
                    />
                    {errors.resetEmail ? (
                      <p className={fieldErrorClass(compact)}>{errors.resetEmail}</p>
                    ) : null}
                  </div>
                  <Button
                    onClick={handleSendOTP}
                    className={actionButtonClass(pillStyle, "primary", compact)}
                    disabled={isLoading || !resetEmail.trim()}
                  >
                    {isLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      "mb-4 border border-blue-200 bg-blue-50 p-3",
                      pillStyle ? "rounded-3xl px-4 py-3" : "rounded-lg",
                    )}
                  >
                    <p className="text-sm text-blue-800">
                      An OTP has been sent to <strong>{resetEmail}</strong>. Please check your email
                      and enter the 6-digit code below.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="otp" className={fieldLabelClass(pillStyle, compact)}>
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
                      className={fieldInputClass(pillStyle, Boolean(errors.otp), compact)}
                    />
                    {errors.otp ? <p className={fieldErrorClass(compact)}>{errors.otp}</p> : null}
                  </div>
                  <div>
                    <Label htmlFor="new-password" className={fieldLabelClass(pillStyle, compact)}>
                      New password
                    </Label>
                    <PasswordInput
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }}
                      placeholder="Enter new password"
                      className={fieldInputClass(pillStyle, Boolean(errors.newPassword), compact)}
                      autoComplete="new-password"
                    />
                    {errors.newPassword ? (
                      <p className={fieldErrorClass(compact)}>{errors.newPassword}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="confirm-new-password" className={fieldLabelClass(pillStyle, compact)}>
                      Confirm new password
                    </Label>
                    <PasswordInput
                      id="confirm-new-password"
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirmNewPassword: undefined }));
                      }}
                      placeholder="Re-enter new password"
                      className={fieldInputClass(pillStyle, Boolean(errors.confirmNewPassword), compact)}
                      onKeyPress={(e) => handleKeyPress(e, handleResetPassword)}
                      autoComplete="new-password"
                    />
                    {errors.confirmNewPassword ? (
                      <p className={fieldErrorClass(compact)}>{errors.confirmNewPassword}</p>
                    ) : null}
                  </div>
                  <Button
                    onClick={handleResetPassword}
                    className={actionButtonClass(pillStyle, "success", compact)}
                    disabled={
                      isLoading ||
                      otp.length !== 6 ||
                      !isValidPassword(newPassword) ||
                      newPassword !== confirmNewPassword
                    }
                  >
                    {isLoading ? "Resetting password..." : "Reset password"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setErrors({});
                      }}
                      className="text-sm text-blue-600 underline hover:text-blue-700"
                    >
                      Resend OTP
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className={tabsContentClass(pillStyle, compact)}>
          <div>
            <Label htmlFor="name" className={fieldLabelClass(pillStyle, compact)}>
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
              className={fieldInputClass(pillStyle, Boolean(errors.name), compact)}
            />
            {errors.name ? <p className={fieldErrorClass(compact)}>{errors.name}</p> : null}
          </div>

          <div>
            <Label
              htmlFor={registerOtpSent ? "register-otp" : "email"}
              className={fieldLabelClass(pillStyle, compact)}
            >
              {registerOtpSent ? t("verificationCode") : "Email"}
            </Label>
            {!registerOtpSent ? (
              <div className="relative">
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValidEmail(email) && !isLoading) {
                      e.preventDefault();
                      void handleSendRegistrationOtp(true);
                    }
                  }}
                  placeholder="Enter your email"
                  className={inlineActionInputClass(pillStyle, Boolean(errors.email), compact)}
                  required
                />
                {isValidEmail(email) ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void handleSendRegistrationOtp(true)}
                    className={inlineActionButtonClass(pillStyle, compact)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      "Verify OTP"
                    )}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && registerOtp.length === 6 && !isLoading) {
                        e.preventDefault();
                        void handleCreateAccount();
                      }
                    }}
                    placeholder="Enter 6-digit code"
                    className={fieldInputClass(pillStyle, Boolean(errors.registerOtp), compact)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Code sent to <strong>{email.trim().toLowerCase()}</strong>.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterOtpSent(false);
                      setRegisterOtp("");
                      setErrors((prev) => ({ ...prev, registerOtp: undefined }));
                    }}
                    className="text-blue-600 underline-offset-2 hover:underline"
                  >
                    Change email
                  </button>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => void handleSendRegistrationOtp(true)}
                    className="text-blue-600 underline-offset-2 hover:underline"
                    disabled={isLoading}
                  >
                    {t("resendCode")}
                  </button>
                </p>
              </div>
            )}
            {errors.email ? <p className={fieldErrorClass(compact)}>{errors.email}</p> : null}
            {errors.registerOtp ? (
              <p className={fieldErrorClass(compact)}>{errors.registerOtp}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="phone" className={fieldLabelClass(pillStyle, compact)}>
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
              className={fieldInputClass(pillStyle, Boolean(errors.phone), compact)}
              required
            />
            {errors.phone ? <p className={fieldErrorClass(compact)}>{errors.phone}</p> : null}
          </div>

          <div>
            <Label htmlFor="create-password" className={fieldLabelClass(pillStyle, compact)}>
              Password
            </Label>
            <PasswordInput
              id="create-password"
              ref={createPasswordRef}
              value={createPassword}
              onChange={(e) => {
                setCreatePassword(e.target.value);
                setErrors((prev) => ({ ...prev, createPassword: undefined }));
              }}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              className={fieldInputClass(pillStyle, Boolean(errors.createPassword), compact)}
              autoComplete="new-password"
            />
            {errors.createPassword ? (
              <p className={fieldErrorClass(compact)}>{errors.createPassword}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="confirm-password" className={fieldLabelClass(pillStyle, compact)}>
              Confirm password
            </Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              onKeyPress={(e) => handleKeyPress(e, handleCreateAccount)}
              placeholder="Re-enter your password"
              className={fieldInputClass(pillStyle, Boolean(errors.confirmPassword), compact)}
              autoComplete="new-password"
            />
            {errors.confirmPassword ? (
              <p className={fieldErrorClass(compact)}>{errors.confirmPassword}</p>
            ) : null}
          </div>

          <Button
            onClick={() => void handleCreateAccount()}
            className={actionButtonClass(pillStyle, "primary", compact)}
            disabled={isLoading || !registerOtpSent || registerOtp.length !== 6}
          >
            {isLoading ? t("creatingAccount") : t("createAccount")}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
