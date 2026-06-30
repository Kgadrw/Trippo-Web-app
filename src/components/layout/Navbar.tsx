import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getDashboardLoginUrl } from "@/hooks/useSubdomain";
import { useTranslation } from "@/hooks/useTranslation";

export function Navbar() {
  const { t } = useTranslation();
  const loginUrl = getDashboardLoginUrl("/login");

  return (
    <nav className="bg-white sticky top-0 z-50">
      <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Trippo Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-xl font-normal text-gray-700 lowercase">trippo</span>
          </Link>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              asChild
              className="bg-gray-500 text-white hover:bg-gray-600 rounded-full px-4 py-2 text-sm"
            >
              <a href={loginUrl}>{t("signIn")}</a>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
