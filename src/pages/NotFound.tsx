import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { MobileFixedBackground } from "@/components/layout/MobileFixedBackground";
import { useTranslation } from "@/hooks/useTranslation";
import { getDashboardPath } from "@/lib/appRoutes";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const isAuthenticated =
    typeof window !== "undefined" &&
    localStorage.getItem("profit-pilot-authenticated") === "true" &&
    !!localStorage.getItem("profit-pilot-user-id");
  const homeTarget = isAuthenticated ? getDashboardPath() : "/";
  const isExternalHome = homeTarget.startsWith("http");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-transparent lg:bg-muted">
      <MobileFixedBackground />
      <div className="relative z-10 text-center px-4">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("pageNotFoundMessage")}</p>
        {isExternalHome ? (
          <a href={homeTarget} className="text-primary underline hover:text-primary/90">
            {t("returnToHome")}
          </a>
        ) : (
          <Link to={homeTarget} className="text-primary underline hover:text-primary/90">
            {t("returnToHome")}
          </Link>
        )}
      </div>
    </div>
  );
};

export default NotFound;
