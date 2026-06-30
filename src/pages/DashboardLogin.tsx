import { useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  isLocalBookfySubdomainHost,
  redirectAfterDashboardLogin,
} from "@/hooks/useSubdomain";

function isDashboardAuthenticated() {
  const userId = localStorage.getItem("profit-pilot-user-id");
  const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";
  const isAdmin = localStorage.getItem("profit-pilot-is-admin") === "true";
  return Boolean(userId && authenticated && !isAdmin);
}

export default function DashboardLogin() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const defaultTab = searchParams.get("tab") === "create" ? "create" : "login";

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from && from !== "/login") return from;
    return "/";
  }, [location.state]);

  useEffect(() => {
    if (isLocalBookfySubdomainHost()) {
      const port = window.location.port ? `:${window.location.port}` : "";
      window.location.replace(
        `${window.location.protocol}//localhost${port}${window.location.pathname}${window.location.search}`,
      );
      return;
    }

    if (isDashboardAuthenticated()) {
      redirectAfterDashboardLogin(redirectTo);
    }
  }, [redirectTo]);

  const handleLoginSuccess = () => {
    redirectAfterDashboardLogin(redirectTo);
  };

  return (
    <div className="relative min-h-dvh w-full overflow-hidden font-sans">
      {/* Full-screen background image */}
      <div className="absolute inset-0">
        <img
          src="/4.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.endsWith("/4.jpg")) {
              img.src = "/card4.jpg";
            }
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Centered login card */}
      <div className="relative z-10 flex min-h-dvh w-full items-start justify-center px-3 pb-8 pt-0 sm:px-6">
        <div className="w-full max-w-[26rem] max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain border border-gray-200/80 bg-white p-4 shadow-[0_-2px_16px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.12)] sm:max-w-md sm:p-5">
          <div className="mb-3 flex items-center justify-center">
            <img src="/logo.png" alt="Trippo" className="h-8 w-8 object-contain" />
          </div>

          <LoginForm
            defaultTab={defaultTab}
            showTitle={false}
            pillStyle
            compact
            onSuccess={handleLoginSuccess}
          />
        </div>
      </div>
    </div>
  );
}
