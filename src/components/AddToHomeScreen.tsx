import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isBookfySubdomainHost } from "@/hooks/useSubdomain";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SHELL_CLASS =
  "fixed top-4 left-4 right-4 z-[60] animate-slide-up-fade lg:left-auto lg:right-4 lg:max-w-sm";
const CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-sky-200/80 bg-white p-5 shadow-xl";

export function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDashboardSubdomain, setIsDashboardSubdomain] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    if (sessionStorage.getItem("add-to-home-dismissed") === "true") {
      return;
    }

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    const windows = /Windows/.test(navigator.userAgent);
    setIsIOS(iOS);
    setIsAndroid(android);
    setIsWindows(windows);

    const host = window.location.hostname.toLowerCase();
    setIsDashboardSubdomain(isBookfySubdomainHost(host) || host.startsWith("admin."));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 1500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const fallbackTimer = window.setTimeout(() => {
      setShowPrompt(true);
    }, iOS ? 3000 : 2500);

    const onInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("add-to-home-dismissed", "true");
  };

  if (isInstalled || !showPrompt || sessionStorage.getItem("add-to-home-dismissed") === "true") {
    return null;
  }

  const dismissButton = (
    <button
      type="button"
      onClick={handleDismiss}
      className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      aria-label="Dismiss"
    >
      <X size={18} />
    </button>
  );

  // Native install prompt available (desktop / Android)
  if (deferredPrompt && !isIOS) {
    return (
      <div className={SHELL_CLASS}>
        <div className={CARD_CLASS}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-400 p-2.5 shadow-sm">
                <Download className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Install Trippo</h3>
            </div>
            {dismissButton}
          </div>

          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            {isAndroid
              ? "Add Trippo to your home screen for quick access and offline use."
              : "Install Trippo as an app on your computer. It will run in its own window, work offline, and launch faster."}
          </p>
          {isDashboardSubdomain && !isAndroid ? (
            <p className="mb-4 text-xs text-sky-700">
              Install from this dashboard subdomain to remove the browser URL bar.
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button
              onClick={() => void handleInstallClick()}
              className="flex-1 rounded-full border border-sky-400 bg-sky-400 text-white hover:bg-sky-500"
              size="sm"
            >
              <Download size={16} className="mr-2" />
              {isAndroid ? "Install" : "Install App"}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="flex-1 rounded-full font-medium"
              size="sm"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop manual instructions
  if (isWindows || (!isIOS && !isAndroid)) {
    return (
      <div className={SHELL_CLASS}>
        <div className={CARD_CLASS}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-400 p-2.5 shadow-sm">
                <Download className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Install Trippo</h3>
            </div>
            {dismissButton}
          </div>

          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            Install Trippo as an app on your computer:
          </p>
          {isDashboardSubdomain ? (
            <p className="mb-3 text-xs text-sky-700">
              Tip: install while on this dashboard subdomain so it opens without browser chrome.
            </p>
          ) : null}

          <ol className="mb-4 list-inside list-decimal space-y-2 pl-1 text-sm text-gray-700">
            <li>
              Click the <strong className="text-gray-900">Install</strong> icon in the address bar, or
            </li>
            <li>
              Open the browser menu → <strong className="text-gray-900">Install Trippo</strong>
            </li>
            <li>The app will open in its own window</li>
          </ol>

          <Button
            onClick={handleDismiss}
            className="w-full rounded-full border border-sky-400 bg-sky-400 text-white hover:bg-sky-500"
            size="sm"
          >
            Got it!
          </Button>
        </div>
      </div>
    );
  }

  // iOS instructions
  if (isIOS) {
    return (
      <div className={SHELL_CLASS}>
        <div className={`${CARD_CLASS} mx-auto max-w-md`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-400 p-2.5 shadow-sm">
                <Smartphone className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Add to Home Screen</h3>
            </div>
            {dismissButton}
          </div>

          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            Install Trippo on your iPhone for quick access:
          </p>

          <ol className="mb-4 list-inside list-decimal space-y-2 pl-1 text-sm text-gray-700">
            <li>
              Tap the <strong className="text-gray-900">Share</strong> button at the bottom
            </li>
            <li>
              Scroll down and tap <strong className="text-gray-900">Add to Home Screen</strong>
            </li>
            <li>
              Tap <strong className="text-gray-900">Add</strong> to confirm
            </li>
          </ol>

          <Button
            onClick={handleDismiss}
            className="w-full rounded-full border border-sky-400 bg-sky-400 text-white hover:bg-sky-500"
            size="sm"
          >
            Got it!
          </Button>
        </div>
      </div>
    );
  }

  // Android manual instructions
  if (isAndroid) {
    return (
      <div className={SHELL_CLASS}>
        <div className={`${CARD_CLASS} mx-auto max-w-md`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-400 p-2.5 shadow-sm">
                <Smartphone className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Add to Home Screen</h3>
            </div>
            {dismissButton}
          </div>

          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            Install Trippo on your Android device:
          </p>

          <ol className="mb-4 list-inside list-decimal space-y-2 pl-1 text-sm text-gray-700">
            <li>
              Tap the <strong className="text-gray-900">Menu</strong> button (three dots)
            </li>
            <li>
              Select <strong className="text-gray-900">Add to Home screen</strong> or{" "}
              <strong className="text-gray-900">Install app</strong>
            </li>
            <li>
              Tap <strong className="text-gray-900">Add</strong> or{" "}
              <strong className="text-gray-900">Install</strong> to confirm
            </li>
          </ol>

          <Button
            onClick={handleDismiss}
            className="w-full rounded-full border border-sky-400 bg-sky-400 text-white hover:bg-sky-500"
            size="sm"
          >
            Got it!
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
