import { useState, useEffect, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import { getSubdomainUrl } from "@/hooks/useSubdomain";
import { Lock, User, Mail, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getSavedLoginEmail, isRememberLoginEnabled, setLoginPrefs } from "@/lib/loginPrefs";
import { useTranslation } from "@/hooks/useTranslation";
import { ApiError } from "@/lib/api";
import { GoogleSignInSection } from "@/components/auth/GoogleSignInSection";
import type { CredentialResponse } from "@react-oauth/google";

const MIN_PASSWORD_LENGTH = 8;

function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "create";
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

export function LoginModal({ open, onOpenChange, defaultTab = "login" }: LoginModalProps) {
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

  // Reset form when modal opens/closes or tab changes
  useEffect(() => {
    if (open) {
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
      
      setTimeout(() => {
        if (defaultTab === "login" && loginPasswordRef.current) {
          loginPasswordRef.current.focus();
        } else if (defaultTab === "create" && createPasswordRef.current) {
          createPasswordRef.current.focus();
        }
      }, 100);
    }
  }, [open, defaultTab]);

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

    onOpenChange(false);

    const authToken = btoa(JSON.stringify({
      userId: user._id || user.id,
      isAdmin: false,
      authenticated: true,
      name: user.name,
      email: user.email,
      businessName: user.businessName || "",
      profilePictureUrl: user.profilePictureUrl || "",
    }));
    const dashboardUrl = getSubdomainUrl("bookfy", `#auth=${authToken}`);
    window.location.href = dashboardUrl;
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
                description: "Your Google account is now linked. You can sign in with Google or your password.",
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

      if (errorMessage.toLowerCase().includes("verification") || errorMessage.toLowerCase().includes("otp")) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="login-modal sm:max-w-[425px]">
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
            {!showForgotPassword ? (
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
                  <Label htmlFor="login-password" className="flex items-center gap-2">
                    <Lock size={16} />
                    Password
                  </Label>
                  <Input
                    id="login-password"
                    ref={loginPasswordRef}
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, loginPassword: undefined }));
                    }}
                    onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                    placeholder="Enter your password"
                    className={errors.loginPassword ? "border-red-500" : ""}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  {errors.loginPassword && (
                    <p className="text-sm text-red-500">{errors.loginPassword}</p>
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
                  className="w-full rounded-full bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white"
                  disabled={!isValidPassword(loginPassword) || isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                <GoogleSignInSection onSuccess={handleGoogleSuccess} disabled={isLoading} />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setResetEmail(loginEmail);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Forgot PIN Section */}
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
                    className="w-full rounded-full bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white"
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
                    <Label htmlFor="new-password" className="flex items-center gap-2">
                      <Lock size={16} />
                      New password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }}
                      placeholder="Enter new password"
                      className={errors.newPassword ? "border-red-500" : ""}
                      autoComplete="new-password"
                    />
                    {errors.newPassword && (
                      <p className="text-sm text-red-500">{errors.newPassword}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password" className="flex items-center gap-2">
                      <Lock size={16} />
                      Confirm new password
                    </Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirmNewPassword: undefined }));
                      }}
                      placeholder="Re-enter new password"
                      className={errors.confirmNewPassword ? "border-red-500" : ""}
                      onKeyPress={(e) => handleKeyPress(e, handleResetPassword)}
                      autoComplete="new-password"
                    />
                    {errors.confirmNewPassword && (
                      <p className="text-sm text-red-500">{errors.confirmNewPassword}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleResetPassword}
                    className="w-full rounded-full bg-green-600 text-white hover:bg-green-700"
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
              <Label htmlFor="create-password" className="flex items-center gap-2">
                <Lock size={16} />
                Password
              </Label>
              <Input
                id="create-password"
                ref={createPasswordRef}
                type="password"
                value={createPassword}
                onChange={(e) => {
                  setCreatePassword(e.target.value);
                  setErrors((prev) => ({ ...prev, createPassword: undefined }));
                }}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                className={errors.createPassword ? "border-red-500" : ""}
                autoComplete="new-password"
              />
              {errors.createPassword && (
                <p className="text-sm text-red-500">{errors.createPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="flex items-center gap-2">
                <Lock size={16} />
                Confirm password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                onKeyPress={(e) => handleKeyPress(e, handleCreateAccount)}
                placeholder="Re-enter your password"
                className={errors.confirmPassword ? "border-red-500" : ""}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
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

            <GoogleSignInSection onSuccess={handleGoogleSuccess} disabled={isLoading} />

            {!registerOtpSent ? (
              <Button
                onClick={() => void handleSendRegistrationOtp()}
                    className="w-full rounded-full bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white"
                disabled={isLoading}
              >
                {isLoading ? t("sendingCode") : t("sendVerificationCode")}
              </Button>
            ) : (
              <Button
                onClick={() => void handleCreateAccount()}
                    className="w-full rounded-full bg-sky-400 text-white hover:bg-sky-500 border border-sky-400 hover:text-white"
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
