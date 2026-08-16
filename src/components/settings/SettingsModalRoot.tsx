import { useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { useSettingsModal } from "@/components/settings/settingsModalState";
import { settingsPanelItems } from "@/components/settings/settingsPanelMeta";
import { settingsPanelComponents } from "@/components/settings/settingsPanels";

const mainPanelItems = settingsPanelItems.filter((item) => !item.danger);
const deletePanelItem = settingsPanelItems.find((item) => item.key === "delete-account");

function SettingsNavItem({
  label,
  isActive,
  onClick,
  danger = false,
}: {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "sidebar-item w-full",
        isActive && "sidebar-item-active",
        danger && !isActive && "text-gray-700 hover:text-red-600",
      )}
    >
      <span
        className={cn(
          "flex-1 text-left text-sm font-semibold",
          isActive && !danger ? "text-white" : "text-gray-600",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function SettingsNavList({
  activePanel,
  openPanel,
}: {
  activePanel: string | null;
  openPanel: (key: (typeof settingsPanelItems)[number]["key"]) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="px-2 py-3">
          <div className="space-y-2">
            {mainPanelItems.map((item) => (
              <SettingsNavItem
                key={item.key}
                label={t(item.labelKey)}
                isActive={activePanel === item.key}
                onClick={() => openPanel(item.key)}
              />
            ))}
          </div>
        </nav>
      </ScrollArea>

      {deletePanelItem ? (
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <SettingsNavItem
            label={t(deletePanelItem.labelKey)}
            danger
            isActive={activePanel === deletePanelItem.key}
            onClick={() => openPanel(deletePanelItem.key)}
          />
        </div>
      ) : null}
    </>
  );
}

export function SettingsModalRoot() {
  const { t } = useTranslation();
  const { open, activePanel, closeSettings, openPanel, closePanel } = useSettingsModal();

  const ActivePanel = activePanel ? settingsPanelComponents[activePanel] : null;
  const activeLabel = activePanel
    ? t(settingsPanelItems.find((item) => item.key === activePanel)!.labelKey)
    : null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activePanel) closePanel();
        else closeSettings();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, activePanel, closePanel, closeSettings]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        aria-label="Close settings"
        onClick={closeSettings}
      />

      {/* Desktop: centered modal with sidebar + panel */}
      <div
        className="absolute inset-0 hidden items-center justify-center p-6 lg:flex"
        role="presentation"
      >
        <div
          className="relative flex h-[min(42rem,calc(100vh-3rem))] w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label={t("settings")}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={closeSettings}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>

          <aside className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex shrink-0 items-center border-b border-sidebar-border px-3 py-4">
              <h2 className="text-sm font-semibold text-gray-600">{t("settings")}</h2>
            </div>
            <SettingsNavList activePanel={activePanel} openPanel={openPanel} />
          </aside>

          <section className="flex min-w-0 flex-1 flex-col bg-white">
            {activePanel && ActivePanel ? (
              <>
                <div className="flex shrink-0 items-center border-b border-gray-200 px-5 py-3.5 pr-12">
                  <h2 className="truncate text-sm font-semibold text-gray-900">{activeLabel}</h2>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="px-5 py-5 [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file])]:rounded-lg [&_textarea]:rounded-lg [&_button[role=combobox]]:rounded-lg">
                    <ActivePanel embedded />
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-8 text-center">
                <p className="text-sm text-gray-500">Choose a settings section from the list.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile / tablet: keep slide-over sheets */}
      <div className="lg:hidden">
        {activePanel && ActivePanel ? (
          <div
            className="absolute top-0 right-0 flex h-full w-full flex-col bg-white sm:w-[min(28rem,calc(100vw-13rem))] sm:right-52"
            role="dialog"
            aria-modal="true"
            aria-label={activeLabel ?? undefined}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={closePanel}
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 sm:hidden"
                  aria-label="Back to settings menu"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="truncate text-sm font-semibold text-gray-900">{activeLabel}</h2>
              </div>
              <button
                type="button"
                onClick={closeSettings}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-3 py-4 sm:px-5 sm:py-5 [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file])]:rounded-lg [&_textarea]:rounded-lg [&_button[role=combobox]]:rounded-lg">
                <ActivePanel embedded />
              </div>
            </ScrollArea>
          </div>
        ) : null}

        <div
          className={cn(
            "absolute top-0 right-0 flex h-full w-full flex-col bg-sidebar sm:w-52",
            activePanel ? "hidden sm:flex" : "flex border-l border-sidebar-border",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t("settings")}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-3 py-4">
            <h2 className="text-sm font-semibold text-gray-600">{t("settings")}</h2>
            {!activePanel ? (
              <button
                type="button"
                onClick={closeSettings}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 transition-colors hover:bg-gray-200/80 hover:text-gray-800"
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
          <SettingsNavList activePanel={activePanel} openPanel={openPanel} />
        </div>
      </div>
    </div>
  );
}
