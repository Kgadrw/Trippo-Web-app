import { useMemo } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubdomain } from "@/hooks/useSubdomain";
import { getDashboardPath } from "@/lib/appRoutes";
import { HeaderNotificationBell } from "./HeaderNotificationBell";
import { HeaderSettingsMenu, HeaderSettingsIconButton } from "./HeaderSettingsMenu";
import { HeaderAccountAvatar } from "./HeaderAccountAvatar";
import { useSettingsModal } from "@/components/settings/settingsModalState";
import { WorkspaceHeaderMenu } from "@/components/workspace/WorkspaceHeaderMenu";
import { WorkspaceMemberAvatarStack } from "@/components/workspace/WorkspaceMemberAvatarStack";
import { HeaderPlusIcon } from "./HeaderPlusIcon";

interface MobileHeaderProps {
  onMenuOpen?: () => void;
  onNotificationClick?: () => void;
}

export function MobileHeader({ onMenuOpen, onNotificationClick }: MobileHeaderProps) {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const subdomain = useSubdomain();

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

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onMenuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/60"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" strokeWidth={2.25} />
        </button>
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
          className="min-w-0 flex-1 rounded-lg py-1 text-left transition-colors hover:bg-white/60"
          aria-label={t("profileSectionTitle")}
        >
          <div className="flex min-w-0 flex-col">
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

      <div className="ml-auto flex shrink-0 items-center justify-end gap-0.5">
        <WorkspaceMemberAvatarStack className="mr-0.5" />
        <WorkspaceHeaderMenu className="border-0 bg-transparent hover:bg-white/60" />
        <HeaderNotificationBell
          onNotificationClick={onNotificationClick}
          iconSize={22}
          buttonClassName="rounded-full hover:bg-muted"
        />
        <HeaderSettingsIconButton className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/60" />
        <HeaderPlusIcon className="mr-0.5" />
        <HeaderSettingsMenu panel="profile">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/60"
            aria-label={t("profileSectionTitle")}
          >
            <HeaderAccountAvatar className="h-9 w-9 border-blue-600 ring-blue-100" />
          </button>
        </HeaderSettingsMenu>
      </div>
    </header>
  );
}
