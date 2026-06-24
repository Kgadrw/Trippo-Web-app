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

      {activePanel && ActivePanel ? (
        <div
          className={cn(
            "absolute top-0 flex h-full flex-col bg-white",
            "w-full sm:w-[min(28rem,calc(100vw-13rem))]",
            "right-0 sm:right-52",
          )}
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
              onClick={closePanel}
              className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close settings section"
            >
              <X size={18} />
            </button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-3 py-4 sm:px-5 sm:py-5">
              <ActivePanel embedded />
            </div>
          </ScrollArea>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute top-0 flex h-full w-full flex-col bg-sidebar sm:w-52",
          "right-0",
          activePanel ? "hidden sm:flex sm:border-l-0" : "flex border-l border-sidebar-border",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t("settings")}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-3 py-4">
          <h2 className="text-sm font-semibold text-gray-600">{t("settings")}</h2>
          <button
            type="button"
            onClick={closeSettings}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 transition-colors hover:bg-gray-200/80 hover:text-gray-800"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

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
      </div>
    </div>
  );
}
