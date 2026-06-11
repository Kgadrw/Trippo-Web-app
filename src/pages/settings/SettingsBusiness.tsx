import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";

import { Building2, Phone, Save } from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import { useTranslation } from "@/hooks/useTranslation";

import { useCurrentUser } from "@/hooks/useCurrentUser";

import { authApi } from "@/lib/api";

import { playErrorBeep, playUpdateBeep, initAudio } from "@/lib/sound";

import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";



export default function SettingsBusiness() {

  const { toast } = useToast();

  const { t, language } = useTranslation();

  const { user, updateUser } = useCurrentUser();

  const [businessName, setBusinessName] = useState(user?.businessName || "");

  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);



  useEffect(() => {

    setBusinessName(user?.businessName || "");

  }, [user?.businessName]);



  useEffect(() => {

    const storedPhone = localStorage.getItem("profit-pilot-user-phone");

    setPhone(storedPhone || "");

  }, []);



  const handleSave = async () => {

    initAudio();

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



    const trimmedName = businessName.trim();

    if (!trimmedName) {

      playErrorBeep();

      toast({

        title: "Validation Error",

        description:

          language === "rw"

            ? "Izina ry'ubucuruzi rirakenewe."

            : language === "fr"

            ? "Le nom de l'entreprise est requis."

            : "Business name is required.",

        variant: "destructive",

      });

      return;

    }



    setSaving(true);

    try {

      await authApi.updateUser({

        businessName: trimmedName,

        phone: phone.trim() || undefined,

      });



      updateUser({ businessName: trimmedName });



      if (phone.trim()) {

        localStorage.setItem("profit-pilot-user-phone", phone.trim());

      } else {

        localStorage.removeItem("profit-pilot-user-phone");

      }



      playUpdateBeep();

      toast({

        title: language === "rw" ? "Byabitswe" : language === "fr" ? "Enregistré" : "Settings Saved",

        description:

          language === "rw"

            ? "Amakuru y'ubucuruzi yavuguruwe."

            : language === "fr"

            ? "Les informations de l'entreprise ont été mises à jour."

            : "Business information has been updated.",

      });

    } catch (error: unknown) {

      playErrorBeep();

      const message = error instanceof Error ? error.message : "Failed to update business information.";

      toast({

        title: "Save Failed",

        description: message,

        variant: "destructive",

      });

    } finally {

      setSaving(false);

    }

  };



  return (

    <div className="flex flex-1 flex-col overflow-y-auto p-5">

      <SettingsSubpageHeader

        icon={Building2}

        title={t("businessInfo")}

        description={

          language === "rw"

            ? "Shyiramo izina ry'ubucuruzi n'imeri ya telefone"

            : language === "fr"

            ? "Définissez le nom et le téléphone de votre entreprise"

            : "Set your business name and phone number"

        }

      />



      <Separator className="mb-4 bg-blue-200" />



      <div className="space-y-5">

        <div className="space-y-1.5">

          <Label className="text-xs font-medium flex items-center gap-1.5">

            <Building2 size={12} className="text-blue-600" />

            {t("businessName")}

          </Label>

          <Input

            value={businessName}

            onChange={(e) => setBusinessName(e.target.value)}

            className="h-10 text-sm"

            placeholder={

              language === "rw"

                ? "Urugero: Trippo Salon"

                : language === "fr"

                ? "Ex. : Trippo Salon"

                : "e.g. Trippo Salon"

            }

          />

          <p className="text-xs text-muted-foreground">

            {language === "rw"

              ? "Iri zina rigaragara ku manota n'inyemezabuguzi."

              : language === "fr"

              ? "Ce nom apparaît sur les reçus et les tickets."

              : "Shown on receipts and tickets."}

          </p>

        </div>



        <div className="space-y-1.5">

          <Label className="text-xs font-medium flex items-center gap-1.5">

            <Phone size={12} className="text-blue-600" />

            {language === "rw" ? "Telefone" : language === "fr" ? "Téléphone" : "Business phone"}

          </Label>

          <Input

            value={phone}

            onChange={(e) => setPhone(e.target.value)}

            className="h-10 text-sm"

            placeholder="+250 ..."

          />

        </div>

      </div>



      <Separator className="my-4" />



      <div className="flex justify-end">

        <Button

          onClick={() => void handleSave()}

          disabled={saving}

          className="bg-blue-600 text-white hover:bg-blue-700 gap-2 h-10 px-5 text-sm font-semibold rounded-lg"

        >

          <Save size={14} />

          {t("saveChanges")}

        </Button>

      </div>

    </div>

  );

}

