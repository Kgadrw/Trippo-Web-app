import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";
import { useSettingsModal } from "@/components/settings/settingsModalState";
import { cn } from "@/lib/utils";
import { greetingApi } from "@/lib/api";
import { HeaderNotificationBell } from "./HeaderNotificationBell";
import { HeaderSettingsMenu, HeaderSettingsIconButton } from "./HeaderSettingsMenu";
import { HeaderAccountAvatar } from "./HeaderAccountAvatar";
import { HeaderPlanBanner } from "./HeaderPlanBanner";
import { PageSearchBar } from "./PageSearchBar";
import { WorkspaceHeaderMenu } from "@/components/workspace/WorkspaceHeaderMenu";
import { WorkspaceMemberAvatarStack } from "@/components/workspace/WorkspaceMemberAvatarStack";
import { HeaderPlusIcon } from "./HeaderPlusIcon";
import { HeaderWeather } from "./HeaderWeather";
import { ChatEmojiText } from "@/components/workspace/ChatEmojiText";
import { ThemeToggle } from "@/components/ThemeToggle";

type DesktopHeaderProps = {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  onHeightChange?: (height: number) => void;
};

const headerIconButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 hover:text-gray-900";

const GREETING_CACHE_KEY = "trippo-ai-greeting-v1";

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-4 w-4 flex-col justify-center gap-[3px]", className)} aria-hidden>
      <span className="block h-[2px] w-full bg-current" />
      <span className="block h-[2px] w-full bg-current" />
      <span className="block h-[2px] w-full bg-current" />
    </span>
  );
}

function localFallbackGreeting(
  t: (key: "goodMorning" | "goodAfternoon" | "goodEvening" | "goodNight" | "hello") => string,
) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return t("goodMorning");
  if (hour >= 12 && hour < 17) return t("goodAfternoon");
  if (hour >= 17 && hour < 21) return t("goodEvening");
  return t("goodNight");
}

function readCachedGreeting(firstName: string): string | null {
  try {
    const raw = sessionStorage.getItem(GREETING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { greeting?: string; firstName?: string; expiresAt?: number };
    if (!parsed.greeting || parsed.firstName !== firstName) return null;
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed.greeting;
  } catch {
    return null;
  }
}

function writeCachedGreeting(firstName: string, greeting: string) {
  try {
    sessionStorage.setItem(
      GREETING_CACHE_KEY,
      JSON.stringify({
        firstName,
        greeting,
        expiresAt: Date.now() + 50 * 60 * 1000,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function DesktopHeader({
  sidebarOpen,
  onSidebarToggle,
  onHeightChange,
}: DesktopHeaderProps) {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const { open: settingsOpen } = useSettingsModal();
  const rootRef = useRef<HTMLDivElement>(null);

  const firstName = useMemo(() => {
    if (user?.name) return user.name.split(" ")[0];
    return t("greetingFallback");
  }, [user?.name, t]);

  const [aiGreeting, setAiGreeting] = useState<string | null>(() => readCachedGreeting(firstName));

  useEffect(() => {
    const cached = readCachedGreeting(firstName);
    if (cached) {
      setAiGreeting(cached);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await greetingApi.getMotivational(firstName);
        const phrase = String(res.greeting || "").trim();
        if (!phrase || cancelled) return;
        setAiGreeting(phrase);
        writeCachedGreeting(firstName, phrase);
      } catch {
        /* keep local fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firstName]);

  const greetingLabel = useMemo(() => {
    const phrase = aiGreeting || localFallbackGreeting(t);
    return `${phrase}, ${firstName}`;
  }, [aiGreeting, firstName, t]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onHeightChange) return;

    const report = () => onHeightChange(el.offsetHeight);
    report();

    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div
      ref={rootRef}
      className="fixed top-0 left-0 right-0 z-40 hidden flex-col lg:flex"
    >
      <HeaderPlanBanner />
      <header
        className={cn(
          "flex h-14 shrink-0 items-center gap-3 border-b border-transparent bg-sidebar pl-2 pr-4",
        )}
      >
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onSidebarToggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={sidebarOpen}
          >
            <HamburgerIcon />
          </button>
          <span className="truncate text-xl font-semibold lowercase text-sidebar-foreground/90">bookfy</span>
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-2">
          <PageSearchBar className="max-w-[32rem]" />
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
          <HeaderWeather showTime={false} className="mr-1 hidden md:flex" />
          <WorkspaceMemberAvatarStack className="mr-1 hidden sm:flex" />
          <WorkspaceHeaderMenu />
          <ThemeToggle />
          <HeaderNotificationBell iconSize={18} />

          <HeaderSettingsIconButton
            className={cn(headerIconButtonClass, settingsOpen && "bg-gray-200 text-gray-900")}
          />

          <HeaderPlusIcon className="mr-0.5" />

          <HeaderSettingsMenu panel="profile">
            <button
              type="button"
              className={cn(
                "flex h-9 items-center gap-2 rounded-full pl-1 pr-2.5 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 hover:text-gray-900",
                settingsOpen && "bg-gray-200 text-gray-900",
              )}
              aria-label={t("profileSectionTitle")}
            >
              <HeaderAccountAvatar className="h-8 w-8" ringClassName="bg-sky-300" />
              <span className="hidden max-w-[260px] truncate text-sm font-medium xl:inline">
                <ChatEmojiText text={greetingLabel} size={16} />
              </span>
            </button>
          </HeaderSettingsMenu>
        </div>
      </header>
    </div>
  );
}
