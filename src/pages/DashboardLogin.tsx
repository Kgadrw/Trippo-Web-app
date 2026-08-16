import { useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  isLocalBookfySubdomainHost,
  redirectAfterDashboardLogin,
} from "@/hooks/useSubdomain";
import {
  applyLogoutQueryParamIfPresent,
  disableGoogleAutoSelect,
  isFreshLogout,
  isLogoutAutoLoginSuppressed,
} from "@/lib/session";

function isDashboardAuthenticated() {
  if (isFreshLogout() || isLogoutAutoLoginSuppressed()) return false;
  const userId = localStorage.getItem("profit-pilot-user-id");
  const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";
  const isAdmin = localStorage.getItem("profit-pilot-is-admin") === "true";
  return Boolean(userId && authenticated && !isAdmin);
}

export default function DashboardLogin() {
  // Clear session before any auto-redirect effect can fire.
  if (typeof window !== "undefined") {
    applyLogoutQueryParamIfPresent();
  }

  const location = useLocation();
  const [searchParams] = useSearchParams();

  const defaultTab = searchParams.get("tab") === "create" ? "create" : "login";

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from && from !== "/login") return from;
    const queryRedirect = searchParams.get("redirect");
    if (queryRedirect && queryRedirect.startsWith("/") && !queryRedirect.startsWith("//")) {
      return queryRedirect;
    }
    return "/";
  }, [location.state, searchParams]);

  useEffect(() => {
    if (isLogoutAutoLoginSuppressed()) {
      disableGoogleAutoSelect();
      const timer = window.setTimeout(disableGoogleAutoSelect, 1500);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isLocalBookfySubdomainHost()) {
      const port = window.location.port ? `:${window.location.port}` : "";
      window.location.replace(
        `${window.location.protocol}//localhost${port}${window.location.pathname}${window.location.search}`,
      );
      return;
    }

    // Never bounce a just-logged-out user back into the dashboard.
    if (isFreshLogout() || isLogoutAutoLoginSuppressed()) return;

    if (isDashboardAuthenticated()) {
      redirectAfterDashboardLogin(redirectTo);
    }
  }, [redirectTo]);

  const handleLoginSuccess = () => {
    redirectAfterDashboardLogin(redirectTo);
  };

  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/4.jpg"
          alt=""
          className="h-full w-full scale-105 object-cover object-center animate-[login-bg-drift_28s_ease-in-out_infinite_alternate]"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.endsWith("/4.jpg")) {
              img.src = "/card4.jpg";
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-900/45 to-slate-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.35)_70%,rgba(15,23,42,0.55)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-dvh w-full items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[30rem] animate-[login-card-rise_520ms_cubic-bezier(0.22,1,0.36,1)_both]">
          <div className="rounded-2xl border border-white/50 bg-white/95 p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-8">
            <LoginForm
              defaultTab={defaultTab}
              showTitle={false}
              pillStyle
              onSuccess={handleLoginSuccess}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes login-card-rise {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes login-bg-drift {
          from { transform: scale(1.05) translate3d(0, 0, 0); }
          to { transform: scale(1.1) translate3d(-1.5%, -1%, 0); }
        }
      `}</style>
    </div>
  );
}
