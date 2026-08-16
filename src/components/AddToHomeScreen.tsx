import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "add-to-home-dismissed";

const OVERLAY_CLASS =
  "fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-in fade-in-0";
const CARD_CLASS =
  "relative w-full max-w-md overflow-hidden rounded-2xl border border-sky-200/80 bg-white p-6 shadow-2xl";
const PRIMARY_BTN =
  "rounded-xl border border-sky-400 bg-sky-400 text-white hover:bg-sky-500";
const SECONDARY_BTN = "rounded-xl font-medium";

function isDashboardHomePath(pathname: string) {
  return pathname === "/" || pathname === "";
}

function isLoggedIn() {
  return localStorage.getItem("profit-pilot-authenticated") === "true";
}

export function AddToHomeScreen() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const onDashboard = isDashboardHomePath(location.pathname);
  const authenticated = isLoggedIn();

  useEffect(() => {
    if (!onDashboard || !authenticated) {
      setShowPrompt(false);
      return;
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    if (sessionStorage.getItem(DISMISS_KEY) === "true") {
      return;
    }

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    const windows = /Windows/.test(navigator.userAgent);
    setIsIOS(iOS);
    setIsAndroid(android);
    setIsWindows(windows);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      window.setTimeout(() => setShowPrompt(true), 1200);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const fallbackTimer = window.setTimeout(() => {
      setShowPrompt(true);
    }, iOS ? 2800 : 2200);

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
  }, [onDashboard, authenticated]);

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
    sessionStorage.setItem(DISMISS_KEY, "true");
  };

  if (
    !onDashboard ||
    !authenticated ||
    isInstalled ||
    !showPrompt ||
    sessionStorage.getItem(DISMISS_KEY) === "true"
  ) {
    return null;
  }

  const dismissButton = (
    <button
      type="button"
      onClick={handleDismiss}
      className="rounded-xl p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      aria-label="Dismiss"
    >
      <X size={18} />
    </button>
  );

  const shell = (content: React.ReactNode) => (
    <div className={OVERLAY_CLASS} role="dialog" aria-modal="true" aria-labelledby="install-app-title">
      <div className={CARD_CLASS}>{content}</div>
    </div>
  );

  if (deferredPrompt && !isIOS) {
    return shell(
      <>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-400 p-2.5 shadow-sm">
              <Download className="text-white" size={20} />
            </div>
            <h3 id="install-app-title" className="text-lg font-bold text-gray-900">
              Install Trippo
            </h3>
          </div>
          {dismissButton}
        </div>

        <p className="mb-4 text-sm leading-relaxed text-gray-600">
          {isAndroid
            ? "Add Trippo to your home screen for quick access, offline use, and chat alerts when the app is closed."
            : "Install Trippo as an app on your computer. It runs in its own window, launches faster, and can show chat alerts when closed."}
        </p>

        <div className="flex gap-3">
          <Button
            onClick={() => void handleInstallClick()}
            className={cn("flex-1", PRIMARY_BTN)}
            size="sm"
          >
            <Download size={16} className="mr-2" />
            {isAndroid ? "Install" : "Install App"}
          </Button>
          <Button onClick={handleDismiss} variant="ghost" className={cn("flex-1", SECONDARY_BTN)} size="sm">
            Not now
          </Button>
        </div>
      </>,
    );
  }

  if (isWindows || (!isIOS && !isAndroid)) {
    return shell(
      <>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-400 p-2.5 shadow-sm">
              <Download className="text-white" size={20} />
            </div>
            <h3 id="install-app-title" className="text-lg font-bold text-gray-900">
              Install Trippo
            </h3>
          </div>
          {dismissButton}
        </div>

        <p className="mb-3 text-sm leading-relaxed text-gray-600">
          Install Trippo as an app on your computer:
        </p>

        <ol className="mb-5 list-inside list-decimal space-y-2 pl-1 text-sm text-gray-700">
          <li>
            Click the <strong className="text-gray-900">Install</strong> icon in the address bar, or
          </li>
          <li>
            Open the browser menu → <strong className="text-gray-900">Install Trippo</strong>
          </li>
          <li>The app will open in its own window</li>
        </ol>

        <Button onClick={handleDismiss} className={cn("w-full", PRIMARY_BTN)} size="sm">
          Got it!
        </Button>
      </>,
    );
  }

  if (isIOS) {
    return shell(
      <>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-400 p-2.5 shadow-sm">
              <Smartphone className="text-white" size={20} />
            </div>
            <h3 id="install-app-title" className="text-lg font-bold text-gray-900">
              Add to Home Screen
            </h3>
          </div>
          {dismissButton}
        </div>

        <p className="mb-3 text-sm leading-relaxed text-gray-600">
          Install Trippo on your iPhone for quick access and chat alerts when the app is closed:
        </p>

        <ol className="mb-5 list-inside list-decimal space-y-2 pl-1 text-sm text-gray-700">
          <li>
            Tap the <strong className="text-gray-900">Share</strong> button at the bottom
          </li>
          <li>
            Scroll down and tap <strong className="text-gray-900">Add to Home Screen</strong>
          </li>
          <li>
            Tap <strong className="text-gray-900">Add</strong>, open Trippo from the icon, then enable notifications
          </li>
        </ol>

        <Button onClick={handleDismiss} className={cn("w-full", PRIMARY_BTN)} size="sm">
          Got it!
        </Button>
      </>,
    );
  }

  if (isAndroid) {
    return shell(
      <>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-400 p-2.5 shadow-sm">
              <Smartphone className="text-white" size={20} />
            </div>
            <h3 id="install-app-title" className="text-lg font-bold text-gray-900">
              Add to Home Screen
            </h3>
          </div>
          {dismissButton}
        </div>

        <p className="mb-3 text-sm leading-relaxed text-gray-600">
          Install Trippo on your Android device for chat alerts when the app is closed:
        </p>

        <ol className="mb-5 list-inside list-decimal space-y-2 pl-1 text-sm text-gray-700">
          <li>
            Tap the <strong className="text-gray-900">Menu</strong> button (three dots)
          </li>
          <li>
            Select <strong className="text-gray-900">Add to Home screen</strong> or{" "}
            <strong className="text-gray-900">Install app</strong>
          </li>
          <li>
            Open Trippo from the icon, then enable notifications in Settings
          </li>
        </ol>

        <Button onClick={handleDismiss} className={cn("w-full", PRIMARY_BTN)} size="sm">
          Got it!
        </Button>
      </>,
    );
  }

  return null;
}
