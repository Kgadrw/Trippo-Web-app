import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Lock, 
  User, 
  Mail, 
  Save,
  Shield,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { playUpdateBeep, playErrorBeep, playWarningBeep, initAudio } from "@/lib/sound";
import { usePinAuth } from "@/hooks/usePinAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { authApi } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "@/hooks/useTranslation";

type SettingsSection = "business" | "security" | "language";

const Settings = () => {
  const { toast } = useToast();
  const { hasPin, setPin, changePin, getPinStatus } = usePinAuth();
  const { user, updateUser } = useCurrentUser();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>("business");
  const [businessName, setBusinessName] = useState(user?.businessName || user?.name || "My Trading Co.");
  const [ownerName, setOwnerName] = useState(user?.name || "John Trader");
  const [email, setEmail] = useState(user?.email || "");
  const [pinMode, setPinMode] = useState<"set" | "change">("set");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");

  // Load user data when component mounts or user changes
  useEffect(() => {
    const loadUserData = async () => {
      // Get current userId from localStorage to ensure we don't switch users
      const currentUserId = localStorage.getItem("profit-pilot-user-id");
      
      // Only load from backend if we have a userId and it matches current user
      if (currentUserId && user) {
        try {
          // Try to load from backend first, but verify it's the same user
          const response = await authApi.getCurrentUser();
          if (response?.user) {
            const backendUser = response.user;
            const backendUserId = (backendUser as any)._id || (backendUser as any).id;
            
            // Only update if the backend user matches the current logged-in user
            // This prevents auto-switching users
            if (backendUserId && backendUserId.toString() === currentUserId.toString()) {
              setOwnerName(backendUser.name || user.name || "John Trader");
              setEmail(backendUser.email || user.email || "");
              setBusinessName(backendUser.businessName || backendUser.name || user.businessName || user.name || "My Trading Co.");
            } else {
              // Backend returned different user - use localStorage data instead
              console.warn("Backend user ID mismatch, using localStorage data");
              setOwnerName(user.name || "John Trader");
              setEmail(user.email || "");
              setBusinessName(user.businessName || user.name || "My Trading Co.");
            }
          } else {
            // No backend user, use localStorage
            setOwnerName(user.name || "John Trader");
            setEmail(user.email || "");
            setBusinessName(user.businessName || user.name || "My Trading Co.");
          }
        } catch (error) {
          // If backend fails, use localStorage data (don't switch users)
          console.error("Failed to load user from backend:", error);
          if (user) {
            setOwnerName(user.name || "John Trader");
            setEmail(user.email || "");
            setBusinessName(user.businessName || user.name || "My Trading Co.");
          }
        }
      } else if (user) {
        // No userId or no user in localStorage, just use what we have
        setOwnerName(user.name || "John Trader");
        setEmail(user.email || "");
        setBusinessName(user.businessName || user.name || "My Trading Co.");
      }
    };

    loadUserData();
  }, [user]); // Removed updateUser from dependencies to prevent unnecessary re-runs

  const handleSaveBusinessInfo = async () => {
    initAudio();
    
    // Validate required fields
    if (!ownerName.trim()) {
      playErrorBeep();
      toast({
        title: "Validation Error",
        description: "Owner name is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if provided
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      playErrorBeep();
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verify we still have the same userId before updating
      const currentUserId = localStorage.getItem("profit-pilot-user-id");
      if (!currentUserId) {
        playErrorBeep();
        toast({
          title: "Session Error",
          description: "User session not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Update user data in backend
      await authApi.updateUser({
        name: ownerName.trim(),
        email: email.trim() || undefined,
        businessName: businessName.trim() || undefined,
      });

      // Verify userId hasn't changed before updating localStorage
      const userIdAfterUpdate = localStorage.getItem("profit-pilot-user-id");
      if (userIdAfterUpdate === currentUserId) {
        // Only update localStorage if userId hasn't changed (prevent user switching)
        updateUser({
          name: ownerName.trim(),
          email: email.trim() || undefined,
          businessName: businessName.trim() || undefined,
        });
      } else {
        console.warn("User ID changed during update, skipping localStorage update");
      }
      
    playUpdateBeep();
    toast({
      title: "Settings Saved",
        description: "Business information has been updated successfully.",
      });
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to update business information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetPin = async () => {
    initAudio();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      playErrorBeep();
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits.",
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmPin) {
      playErrorBeep();
      toast({
        title: "PIN Mismatch",
        description: "PIN and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      // For setting a new PIN, we need to get the current user's PIN
      // Since this is a new PIN setup, we'll use the login endpoint to verify
      // But actually, if there's no PIN set, we should just set it locally first
      // and then sync to backend on next login
      
      // Set PIN locally for backward compatibility
      if (setPin(newPin)) {
    playUpdateBeep();
    toast({
          title: "PIN Set",
          description: "Your PIN has been set successfully.",
        });
        setNewPin("");
        setConfirmPin("");
        setCurrentPin("");
        setPinMode("change");
      }
    } catch (error: any) {
      playErrorBeep();
      toast({
        title: "PIN Setup Failed",
        description: error?.message || "Failed to set PIN. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChangePin = async () => {
    initAudio();
    if (currentPin.length !== 4 || !/^\d{4}$/.test(currentPin)) {
      playErrorBeep();
      toast({
        title: "Invalid Current PIN",
        description: "Current PIN must be exactly 4 digits.",
        variant: "destructive",
      });
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      playErrorBeep();
      toast({
        title: "Invalid PIN",
        description: "New PIN must be exactly 4 digits.",
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmPin) {
      playErrorBeep();
      toast({
        title: "PIN Mismatch",
        description: "New PIN and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update PIN in backend
      await authApi.changePin({
        currentPin,
        newPin,
      });

      // Also update PIN locally for backward compatibility
      if (changePin(currentPin, newPin)) {
    playUpdateBeep();
    toast({
          title: "PIN Changed",
          description: "Your PIN has been changed successfully.",
        });
        setNewPin("");
        setConfirmPin("");
        setCurrentPin("");
      } else {
        // This shouldn't happen if backend succeeded, but handle it just in case
        playErrorBeep();
        toast({
          title: "PIN Update Incomplete",
          description: "PIN was updated on server but local update failed. Please refresh.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      playErrorBeep();
      const errorMessage = error?.message || "Failed to change PIN. Please try again.";
      if (errorMessage.toLowerCase().includes("incorrect") || errorMessage.toLowerCase().includes("invalid")) {
        toast({
          title: "Invalid Current PIN",
          description: "The current PIN you entered is incorrect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "PIN Change Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1">
            <div className="form-card p-0 overflow-hidden border-primary/30">
              <div className="p-4 bg-gray-50 border-b border-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 border border-transparent flex items-center justify-center">
                    <User size={18} className="text-gray-600 font-bold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-700 text-sm truncate">{ownerName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-1.5">
                <button 
                  onClick={() => setActiveSection("business")}
                  className={cn(
                    "w-full text-left px-3 py-2.5 transition-all duration-200 text-sm",
                    activeSection === "business"
                      ? "bg-gray-600 text-white border border-transparent font-semibold"
                      : "hover:bg-gray-50 text-gray-700 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 size={16} className={activeSection === "business" ? "text-primary" : ""} />
                    {t("businessInfo")}
                  </div>
                </button>
                <button 
                  onClick={() => setActiveSection("language")}
                  className={cn(
                    "w-full text-left px-3 py-2.5 transition-all duration-200 text-sm",
                    activeSection === "language"
                      ? "bg-gray-600 text-white border border-transparent font-semibold"
                      : "hover:bg-gray-50 text-gray-700 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe size={16} className={activeSection === "language" ? "text-primary" : ""} />
                    {t("language")}
                  </div>
                </button>
                <button 
                  onClick={() => setActiveSection("security")}
                  className={cn(
                    "w-full text-left px-3 py-2.5 transition-all duration-200 text-sm",
                    activeSection === "security"
                      ? "bg-gray-600 text-white border border-transparent font-semibold"
                      : "hover:bg-gray-50 text-gray-700 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Shield size={16} className={activeSection === "security" ? "text-primary" : ""} />
                    {t("security")}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Business Information */}
            {activeSection === "business" && (
              <div className="form-card border border-transparent bg-white animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 border border-transparent flex items-center justify-center">
                    <Building2 size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-700">{t("businessInfo")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{language === "rw" ? "Hindura amakuru y'ubucuruzi" : "Update your business details"}</p>
                  </div>
                </div>
              </div>
              
              <Separator className="mb-4" />

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Building2 size={12} className="text-muted-foreground" />
                      {t("businessName")}
                    </Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="input-field h-10 bg-background text-sm"
                      placeholder="Enter business name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <User size={12} className="text-muted-foreground" />
                      {t("ownerName")}
                    </Label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="input-field h-10 bg-background text-sm"
                      placeholder="Enter owner name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Mail size={12} className="text-muted-foreground" />
                    {t("emailAddress")}
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field h-10 bg-background text-sm"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveBusinessInfo} 
                  className="bg-green-600 text-white hover:bg-green-700 gap-2 h-10 px-5 text-sm shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                >
                  <Save size={14} />
                  {t("saveChanges")}
                </Button>
              </div>
              </div>
            )}

            {/* Language Settings */}
            {activeSection === "language" && (
              <div className="form-card border border-transparent bg-white animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 border border-transparent flex items-center justify-center">
                      <Globe size={16} className="text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-700">{t("language")}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{language === "rw" ? "Hitamo ururimi wifuza gukoresha" : "Choose your preferred language"}</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="mb-4" />

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Globe size={12} className="text-muted-foreground" />
                      {language === "rw" ? "Hitamo ururimi" : "Select Language"}
                    </Label>
                    <Select value={language} onValueChange={(value: "en" | "rw") => setLanguage(value)}>
                      <SelectTrigger className="input-field h-10 bg-background text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="rw">Kinyarwanda</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === "rw" 
                        ? "Ururimi rwose ruzahinduka mu buryo bwikora" 
                        : "The entire interface will update to your selected language"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeSection === "security" && (
              <div className="form-card border border-transparent bg-white animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 border border-transparent flex items-center justify-center">
                    <Shield size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-700">{t("security")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{language === "rw" ? "Shiraho PIN kugirango wongere umutekano" : "Set PIN to keep your account secure"}</p>
                  </div>
                </div>
              </div>
              
              <Separator className="mb-4" />

              <div className="space-y-6">
                {/* PIN Settings */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Lock size={14} className="text-muted-foreground" />
                        Financial Data PIN Protection
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasPin 
                          ? "PIN is set. Profits and sensitive financial data are protected." 
                          : "Set a 4-digit PIN to protect profits and sensitive financial information."}
                      </p>
                    </div>
                    {hasPin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPinMode(pinMode === "set" ? "change" : "set")}
                        className="text-xs"
                      >
                        {pinMode === "set" ? "Change PIN" : "Set New PIN"}
                      </Button>
                    )}
                  </div>

                  {hasPin && pinMode === "change" && (
                    <div className="space-y-3 p-4 bg-secondary/30 border border-transparent rounded-lg">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">{t("currentPin")}</Label>
                        <Input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={currentPin}
                          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono"
                          placeholder="••••"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground">{t("newPin")}</Label>
                          <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono"
                            placeholder="••••"
                          />
                </div>
                  <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground">{t("confirmPin")}</Label>
                      <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono"
                            placeholder="••••"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleChangePin}
                        className="bg-green-600 text-white hover:bg-green-700 w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                        disabled={currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
                      >
                        <Lock size={14} />
                        {t("changePin")}
                      </Button>
                    </div>
                  )}

                  {(!hasPin || pinMode === "set") && (
                    <div className="space-y-3 p-4 bg-secondary/30 border border-transparent rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground">{t("newPin")}</Label>
                          <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono"
                            placeholder="••••"
                          />
                  </div>
                  <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground">{t("confirmPin")}</Label>
                      <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="input-field h-10 bg-background text-center text-lg tracking-widest font-mono"
                            placeholder="••••"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleSetPin}
                        className="bg-green-600 text-white hover:bg-green-700 w-full gap-2 h-10 shadow-sm hover:shadow transition-all font-semibold rounded-lg"
                        disabled={newPin.length !== 4 || confirmPin.length !== 4}
                      >
                        <Lock size={14} />
                        {hasPin ? (language === "rw" ? "Hindura PIN" : "Update PIN") : t("setPin")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
