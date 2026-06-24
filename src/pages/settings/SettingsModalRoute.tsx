import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  pathnameToSettingsPanel,
  useSettingsModal,
} from "@/components/settings/settingsModalState";
import { useSubdomain } from "@/hooks/useSubdomain";
import { getDashboardPath } from "@/lib/appRoutes";

/** Opens the settings modal and returns to the dashboard (no full settings pages). */
export default function SettingsModalRoute() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const subdomain = useSubdomain();
  const { openSettings, openPanel } = useSettingsModal();

  useEffect(() => {
    const panel = pathnameToSettingsPanel(pathname);
    if (panel) openPanel(panel);
    else openSettings();

    navigate(getDashboardPath(subdomain), { replace: true });
  }, [pathname, navigate, subdomain, openPanel, openSettings]);

  return null;
}
