import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, Save, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { authApi } from "@/lib/api";
import { playErrorBeep, playUpdateBeep, initAudio } from "@/lib/sound";

export default function SettingsBusiness() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const { user, updateUser } = useCurrentUser();

  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [ownerName, setOwnerName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    if (user) {
      setOwnerName(user.name || "");
      setEmail(user.email || "");
      setBusinessName(user.businessName || "");
    }
  }, [user]);

  const handleSaveBusinessInfo = async () => {
    initAudio();

    if (!ownerName.trim()) {
      playErrorBeep();
      toast({
        title: "Validation Error",
        description: "Owner name is required.",
        variant: "destructive",
      });
      return;
    }

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

      await authApi.updateUser({
        name: ownerName.trim(),
        email: email.trim() || undefined,
        businessName: businessName.trim() || undefined,
      });

      const userIdAfterUpdate = localStorage.getItem("profit-pilot-user-id");
      if (userIdAfterUpdate === currentUserId) {
        updateUser({
          name: ownerName.trim(),
          email: email.trim() || undefined,
          businessName: businessName.trim() || undefined,
        });
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
        description:
          error?.message ||
          "Failed to update business information. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout title={t("businessInfo")}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            {language === "rw" ? "Subira" : language === "fr" ? "Retour" : "Back"}
          </Button>
        </div>

        <div className="form-card border border-transparent lg:bg-white bg-white/80 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 border border-blue-200 flex items-center justify-center rounded-lg">
                <Building2 size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-700">
                  {t("businessInfo")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "rw"
                    ? "Hindura amakuru y'ubucuruzi"
                    : "Update your business details"}
                </p>
              </div>
            </div>
          </div>

          <Separator className="mb-4 bg-blue-200" />

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Building2 size={12} className="text-blue-600" />
                  {t("businessName")}
                </Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="input-field h-10 bg-background text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter business name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <User size={12} className="text-blue-600" />
                  {t("ownerName")}
                </Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="input-field h-10 bg-background text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter owner name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Mail size={12} className="text-blue-600" />
                {t("emailAddress")}
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field h-10 bg-background text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end">
            <Button
              onClick={handleSaveBusinessInfo}
              className="bg-blue-600 text-white hover:bg-blue-700 gap-2 h-10 px-5 text-sm shadow-sm hover:shadow transition-all font-semibold rounded-lg"
            >
              <Save size={14} />
              {t("saveChanges")}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

