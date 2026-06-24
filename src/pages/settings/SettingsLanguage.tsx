import { Label } from "@/components/ui/label";
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

export default function SettingsLanguage({ embedded = false }: { embedded?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={embedded ? "pb-4" : "px-4 pb-4 lg:px-6"}>
      {!embedded ? (
        <SettingsSubpageHeader
          icon={Globe}
          title={t("language")}
          description={t("languagePageDesc")}
        />
      ) : null}

      <div className="space-y-1.5 max-w-xl">
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
