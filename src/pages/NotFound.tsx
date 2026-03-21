import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { MobileFixedBackground } from "@/components/layout/MobileFixedBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-transparent lg:bg-muted">
      <MobileFixedBackground />
      <div className="relative z-10 text-center px-4">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
