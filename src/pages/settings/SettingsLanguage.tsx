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
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";

export default function SettingsLanguage() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5">
      <SettingsSubpageHeader
        icon={Globe}
        title={t("language")}
        description={t("languagePageDesc")}
      />

      <Separator className="mb-4 bg-blue-200" />

      <div className="space-y-1.5">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Globe size={12} className="text-blue-600" />
          {t("language")}
        </Label>
        <Select value={language} onValueChange={(value: "en" | "rw" | "fr") => setLanguage(value)}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="rw">Kinyarwanda</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {t("languageAutoUpdateNote")}
        </p>
      </div>
    </div>
  );
}
