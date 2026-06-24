import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { useSettingsModal } from "@/components/settings/settingsModalState";
import { cn } from "@/lib/utils";
import { HeaderNotificationBell } from "./HeaderNotificationBell";
import { HeaderSettingsMenu, HeaderSettingsIconButton } from "./HeaderSettingsMenu";
import { HeaderAccountAvatar } from "./HeaderAccountAvatar";
import { PageSearchBar } from "./PageSearchBar";
import { WorkspaceHeaderMenu } from "@/components/workspace/WorkspaceHeaderMenu";
import { WorkspaceMemberAvatarStack } from "@/components/workspace/WorkspaceMemberAvatarStack";

type DesktopHeaderProps = {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
};

const headerIconButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 hover:text-gray-900";

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-4 w-4 flex-col justify-center gap-[3px]", className)} aria-hidden>
      <span className="block h-[2px] w-full bg-current" />
      <span className="block h-[2px] w-full bg-current" />
      <span className="block h-[2px] w-full bg-current" />
    </span>
  );
}

export function DesktopHeader({ sidebarOpen, onSidebarToggle }: DesktopHeaderProps) {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const { open: settingsOpen } = useSettingsModal();

  const firstName = useMemo(() => {
    if (user?.name) return user.name.split(" ")[0];
    return "User";
  }, [user?.name]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 hidden h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar pl-2 pr-4 lg:flex",
      )}
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onSidebarToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
        >
          <HamburgerIcon />
        </button>
        <span className="text-xl font-semibold lowercase text-gray-600 truncate">bookfy</span>
      </div>

      <div className="flex min-w-0 flex-1 justify-center px-2">
        <PageSearchBar className="max-w-[32rem]" />
      </div>

      <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
        <WorkspaceMemberAvatarStack className="mr-1 hidden sm:flex" />
        <WorkspaceHeaderMenu />
        <HeaderNotificationBell iconSize={18} />

        <HeaderSettingsIconButton
          className={cn(headerIconButtonClass, settingsOpen && "bg-gray-200 text-gray-900")}
        />

        <HeaderSettingsMenu panel="profile">
          <button
            type="button"
            className={cn(
              "flex h-9 items-center gap-2 rounded-full px-2.5 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 hover:text-gray-900",
              settingsOpen && "bg-gray-200 text-gray-900",
            )}
            aria-label={t("profileSectionTitle")}
          >
            <HeaderAccountAvatar />
            <span className="hidden max-w-[120px] truncate text-sm font-medium xl:inline">
              {firstName}
            </span>
          </button>
        </HeaderSettingsMenu>
      </div>
    </header>
  );
}
