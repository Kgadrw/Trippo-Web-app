import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LoginModal } from "@/components/LoginModal";

const Home = () => {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<"login" | "create">("create");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative min-h-[calc(100vh-4rem)] flex items-center px-6 lg:px-12 xl:px-20 py-16 lg:py-24">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="text-left">
            <h1 className="text-5xl lg:text-6xl font-serif font-normal text-gray-900 mb-6 leading-tight">
              Run your business smarter with Trippo
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 mb-8 leading-relaxed">
              Trippo helps local traders control their inventories, track stock levels, manage products, and monitor sales performance.
            </p>
            <Button
              className="bg-blue-500 text-white hover:bg-blue-600 px-8 py-6 text-lg font-medium rounded-full"
              onClick={() => {
                setLoginModalTab("create");
                setLoginModalOpen(true);
              }}
            >
              Get Started
            </Button>
          </div>
          
          {/* Right Side - Hero Image */}
          <div className="flex justify-center lg:justify-end">
            <img 
              src="/hero.jpeg" 
              alt="Trippo Dashboard" 
              className="w-full max-w-2xl h-auto rounded-lg shadow-xl object-cover"
            />
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        defaultTab={loginModalTab}
      />
    </div>
  );
};

export default Home;
