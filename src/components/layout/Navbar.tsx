import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LoginModal } from "@/components/LoginModal";
import { useTranslation } from "@/hooks/useTranslation";

export function Navbar() {
  const { t } = useTranslation();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<"login" | "create">("login");

  return (
    <nav className="bg-white sticky top-0 z-50">
      <div className="container mx-auto px-6 lg:px-12 xl:px-20">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Trippo Logo" 
              className="h-8 w-8 object-contain"
            />
            <span className="text-xl font-normal text-gray-700 lowercase">trippo</span>
          </Link>

          {/* Right Side - Sign In Button */}
          <div className="flex items-center gap-3 ml-auto">
            <Button
              className="bg-gray-500 text-white hover:bg-gray-600 rounded-full px-4 py-2 text-sm"
              onClick={() => {
                setLoginModalTab("login");
                setLoginModalOpen(true);
              }}
            >
              {t("signIn")}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        defaultTab={loginModalTab}
      />
    </nav>
  );
}
