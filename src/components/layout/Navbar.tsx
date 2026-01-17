import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/LoginModal";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<"login" | "create">("login");

  return (
    <nav className="bg-white sticky top-0 z-50">
      <div className="container mx-auto px-6 lg:px-12 xl:px-20">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-900 lowercase">trippo</span>
          </Link>

          {/* Right Side - Sign In Button */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-full px-6"
              onClick={() => {
                setLoginModalTab("login");
                setLoginModalOpen(true);
              }}
            >
              Sign in
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-700 hover:text-blue-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col gap-4 px-2">
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-full"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setLoginModalTab("login");
                  setLoginModalOpen(true);
                }}
              >
                Sign in
              </Button>
            </div>
          </div>
        )}
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
