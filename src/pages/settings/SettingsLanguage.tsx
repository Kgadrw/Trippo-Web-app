import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "@/hooks/useTranslation";

export default function SettingsLanguage() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <AppLayout title={t("language")}>
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
                <Globe size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-700">{t("language")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "rw"
                    ? "Hitamo ururimi wifuza gukoresha"
                    : language === "fr"
                    ? "Choisissez votre langue préférée"
                    : "Choose your preferred language"}
                </p>
              </div>
            </div>
          </div>

          <Separator className="mb-4 bg-blue-200" />

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Globe size={12} className="text-blue-600" />
                {language === "rw"
                  ? "Hitamo ururimi"
                  : language === "fr"
                  ? "Choisir la langue"
                  : "Select Language"}
              </Label>
              <Select
                value={language}
                onValueChange={(value: "en" | "rw" | "fr") => setLanguage(value)}
              >
                <SelectTrigger className="input-field h-10 bg-background text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="rw">Kinyarwanda</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "rw"
                  ? "Ururimi rwose ruzahinduka mu buryo bwikora"
                  : language === "fr"
                  ? "Toute l'interface se mettra à jour automatiquement dans la langue choisie"
                  : "The entire interface will update to your selected language"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

