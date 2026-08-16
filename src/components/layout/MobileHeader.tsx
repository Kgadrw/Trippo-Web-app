import { useMemo } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubdomain } from "@/hooks/useSubdomain";
import { getDashboardPath } from "@/lib/appRoutes";
import { HeaderNotificationBell } from "./HeaderNotificationBell";
import { HeaderSettingsMenu, HeaderSettingsIconButton } from "./HeaderSettingsMenu";
import { HeaderAccountAvatar } from "./HeaderAccountAvatar";
import { WorkspaceHeaderMenu } from "@/components/workspace/WorkspaceHeaderMenu";
import { HeaderPlusIcon } from "./HeaderPlusIcon";
import { HeaderWeather } from "./HeaderWeather";

interface MobileHeaderProps {
  onMenuOpen?: () => void;
  onNotificationClick?: () => void;
}

export function MobileHeader({ onMenuOpen, onNotificationClick }: MobileHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const subdomain = useSubdomain();

  const showDashboardBack = useMemo(() => {
    const path = location.pathname;
    const isRootPath = path === "/" || path === "";
    const isDashboardRoot = subdomain === "bookfy" && isRootPath;
    const isAdminRoot = subdomain === "admin" && isRootPath;
    return !isDashboardRoot && !isAdminRoot;
  }, [location.pathname, subdomain]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-1.5 px-2.5 sm:gap-2 sm:px-4">
      <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1.5">
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
      </div>

      <div className="ml-auto flex min-w-0 shrink items-center justify-end gap-0 overflow-hidden">
        <HeaderWeather compact showTime={false} className="mr-0.5 hidden min-[380px]:flex" />
        <WorkspaceHeaderMenu className="border-0 bg-transparent hover:bg-white/60" />
        <HeaderNotificationBell
          onNotificationClick={onNotificationClick}
          iconSize={22}
        />
        <HeaderSettingsIconButton className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/60" />
        <HeaderPlusIcon className="mr-0.5" />
        <HeaderSettingsMenu panel="profile">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/60"
            aria-label={t("profileSectionTitle")}
          >
            <HeaderAccountAvatar className="h-9 w-9" ringClassName="bg-blue-600" />
          </button>
        </HeaderSettingsMenu>
      </div>
    </header>
  );
}
