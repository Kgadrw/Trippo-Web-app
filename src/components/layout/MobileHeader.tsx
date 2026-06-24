import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubdomain } from "@/hooks/useSubdomain";
import { getDashboardPath } from "@/lib/appRoutes";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { HeaderNotificationBell } from "./HeaderNotificationBell";
import { HeaderSettingsMenu, HeaderSettingsIconButton } from "./HeaderSettingsMenu";
import { HeaderAccountAvatar } from "./HeaderAccountAvatar";
import { useSettingsModal } from "@/components/settings/settingsModalState";
import { WorkspaceHeaderMenu } from "@/components/workspace/WorkspaceHeaderMenu";
import { WorkspaceMemberAvatarStack } from "@/components/workspace/WorkspaceMemberAvatarStack";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";

interface MobileHeaderProps {
  onNotificationClick?: () => void;
}

export function MobileHeader({ onNotificationClick }: MobileHeaderProps) {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const subdomain = useSubdomain();
  const { loading: subLoading, plan } = useSubscriptionAccess();

  const { openSettings } = useSettingsModal();

  const firstName = useMemo(() => {
    if (user?.name) return user.name.split(" ")[0];
    return "User";
  }, [user?.name]);

  const showDashboardBack = useMemo(() => {
    const path = location.pathname;
    const isRootPath = path === "/" || path === "";
    const isDashboardRoot = subdomain === "bookfy" && isRootPath;
    const isAdminRoot = subdomain === "admin" && isRootPath;
    return !isDashboardRoot && !isAdminRoot;
  }, [location.pathname, subdomain]);

  const showBillingCrown = useMemo(() => {
    if (subLoading || !plan || location.pathname.startsWith("/billing")) return false;
    return (
      plan.isOnTrial ||
      plan.requiresPayment ||
      plan.status === "past_due" ||
      plan.hasPlus
    );
  }, [subLoading, plan, location.pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/30 bg-white/45 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/35 lg:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {showDashboardBack && (
          <button
            type="button"
            onClick={() => navigate(getDashboardPath(subdomain))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/60"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.25} />
          </button>
        )}
        <button
          type="button"
          onClick={() => openSettings("profile")}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left transition-colors hover:bg-white/60 sm:gap-3"
          aria-label={t("profileSectionTitle")}
        >
          <UserProfileAvatar
            name={user?.name}
            profilePictureUrl={user?.profilePictureUrl}
            className="h-10 w-10 shrink-0 rounded-full border-2 border-blue-600 bg-white"
            fallbackClassName="border-0 bg-white font-bold text-blue-600"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{t("hello")},</span>
              <span className="truncate text-sm font-semibold text-foreground">{firstName}</span>
            </div>
            {user?.businessName && (
              <span className="truncate text-xs text-muted-foreground">{user.businessName}</span>
            )}
          </div>
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
        {showBillingCrown ? (
          <button
            type="button"
            onClick={() => navigate("/billing")}
            className="p-1.5 transition-opacity hover:opacity-80"
            aria-label={t("billing")}
          >
            <img src="/plus.png" alt="Trippo Plus" className="h-9 w-9 object-contain" loading="lazy" />
          </button>
        ) : null}
        <WorkspaceMemberAvatarStack className="mr-0.5" />
        <WorkspaceHeaderMenu className="border-0 bg-transparent hover:bg-white/60" />
        <HeaderNotificationBell
          onNotificationClick={onNotificationClick}
          iconSize={22}
          buttonClassName="rounded-full hover:bg-muted"
        />
        <HeaderSettingsIconButton className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/60" />
        <HeaderSettingsMenu panel="profile">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/60"
            aria-label={t("profileSectionTitle")}
          >
            <HeaderAccountAvatar className="h-10 w-10" iconSize={18} />
          </button>
        </HeaderSettingsMenu>
      </div>
    </header>
  );
}
