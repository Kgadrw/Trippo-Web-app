import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initAudio, playErrorBeep, playUpdateBeep } from "@/lib/sound";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { authApi } from "@/lib/api";
import { removeProfilePicture, uploadProfilePicture } from "@/lib/profilePicture";
import { SettingsSubpageHeader } from "@/components/settings/SettingsSubpageHeader";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";

const MAX_PROFILE_PICTURE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export default function SettingsProfile({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const { user, updateUser } = useCurrentUser();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ownerName, setOwnerName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [removingPicture, setRemovingPicture] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setOwnerName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSaveProfile = async () => {
    initAudio();

    if (!ownerName.trim()) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("nameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      playErrorBeep();
      toast({
        title: t("invalidEmailTitle"),
        description: t("invalidEmailDescMsg"),
        variant: "destructive",
      });
      return;
    }

    const currentUserId = localStorage.getItem("profit-pilot-user-id");
    if (!currentUserId) {
      playErrorBeep();
      toast({
        title: t("sessionErrorTitle"),
        description: t("sessionNotFoundDesc"),
        variant: "destructive",
      });
      return;
    }

    setSavingProfile(true);
    try {
      await authApi.updateUser({
        name: ownerName.trim(),
        email: email.trim() || undefined,
      });

      updateUser({
        name: ownerName.trim(),
        email: email.trim() || undefined,
      });

      playUpdateBeep();
      toast({
        title: t("profileSavedTitle"),
        description: t("profileSavedDesc"),
      });
    } catch (error: unknown) {
      playErrorBeep();
      const message = error instanceof Error ? error.message : t("profileUpdateFailedDesc");
      toast({
        title: t("saveFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePictureSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    initAudio();

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("profilePictureInvalidType"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
      playErrorBeep();
      toast({
        title: t("validationErrorTitle"),
        description: t("profilePictureTooLarge"),
        variant: "destructive",
      });
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreview;
    });

    setUploadingPicture(true);
    try {
      const { profilePictureUrl } = await uploadProfilePicture(file);
      updateUser({ profilePictureUrl });
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      playUpdateBeep();
      toast({
        title: t("profilePictureUploadedTitle"),
        description: t("profilePictureUploadedDesc"),
      });
    } catch (error: unknown) {
      playErrorBeep();
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      const message = error instanceof Error ? error.message : t("profileUpdateFailedDesc");
      toast({
        title: t("saveFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleRemovePicture = async () => {
    if (!user?.profilePictureUrl) return;

    initAudio();
    setRemovingPicture(true);
    try {
      await removeProfilePicture();
      updateUser({ profilePictureUrl: "" });
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      playUpdateBeep();
      toast({
        title: t("profilePictureRemovedTitle"),
        description: t("profilePictureRemovedDesc"),
      });
    } catch (error: unknown) {
      playErrorBeep();
      const message = error instanceof Error ? error.message : t("profileUpdateFailedDesc");
      toast({
        title: t("saveFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setRemovingPicture(false);
    }
  };

  return (
    <div className={embedded ? "pb-4" : "px-4 pb-6 lg:px-6"}>
      {!embedded ? (
        <SettingsSubpageHeader
          icon={User}
          title={t("profileSectionTitle")}
          description={t("editProfileDesc")}
        />
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-4 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="flex flex-col gap-4 lg:max-w-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UserProfileAvatar
              name={ownerName || user?.name}
              profilePictureUrl={user?.profilePictureUrl}
              previewUrl={previewUrl}
              className="h-16 w-16 border-2 border-sky-400"
              fallbackClassName="bg-sky-400 text-base text-white"
            />

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => void handlePictureSelect(e)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={uploadingPicture || removingPicture}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingPicture ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
                <span>{t("profilePictureChange")}</span>
              </Button>

              {user?.profilePictureUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  disabled={uploadingPicture || removingPicture}
                  onClick={() => void handleRemovePicture()}
                >
                  {removingPicture ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  <span>{t("profilePictureRemove")}</span>
                </Button>
              ) : null}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("profilePictureHint")}</p>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">{t("ownerName")}</Label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="h-10 text-sm"
              placeholder={t("ownerName")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">{t("emailAddress")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-sm"
              placeholder={t("emailAddress")}
            />
          </div>

          <Button
            onClick={() => void handleSaveProfile()}
            disabled={savingProfile}
            className="w-full gap-2 border border-sky-400 bg-sky-400 text-white hover:bg-sky-500 sm:w-auto"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{t("saveChanges")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
