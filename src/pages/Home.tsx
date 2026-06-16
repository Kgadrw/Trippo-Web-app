import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LoginModal } from "@/components/LoginModal";
import { User } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { getSubdomainUrl } from "@/hooks/useSubdomain";
import { contentApi } from "@/lib/api";
import { usePlatformContact } from "@/hooks/usePlatformContact";
import { PlatformContactFooter } from "@/components/support/PlatformContactCard";
import {
  FEATURE_COLOR_CLASSES,
  type ResolvedHomepageContent,
} from "@/lib/homepageContent";

function buildFallbackHomepageContent(t: (key: string) => string): ResolvedHomepageContent {
  return {
    testimonialBackgroundUrl: "/testmonial.webp",
    features: [
      {
        id: "fallback-1",
        badge: t("productManagement"),
        description: t("addEditManageInventory"),
        color: "blue",
      },
      {
        id: "fallback-2",
        badge: t("salesTracking"),
        description: t("recordSalesTransactions"),
        color: "green",
      },
      {
        id: "fallback-3",
        badge: t("reportsAnalytics"),
        description: t("viewDetailedReports"),
        color: "purple",
      },
      {
        id: "fallback-4",
        badge: t("offlineSupport"),
        description: t("workOfflineAutoSync"),
        color: "orange",
      },
    ],
    testimonials: [
      {
        id: "fallback-t1",
        quote: t("trippoTransformedInventory"),
        attribution: t("homeTestimonial1Attribution"),
      },
      {
        id: "fallback-t2",
        quote: t("mostUsefulInventoryTool"),
        attribution: t("homeTestimonial2Attribution"),
      },
      {
        id: "fallback-t3",
        quote: t("bestInventoryManagementFlexibility"),
        attribution: t("homeTestimonial3Attribution"),
      },
    ],
    partners: [
      {
        id: "fallback-p1",
        name: "Lindocare",
        logoUrl: "/lindo.png",
        websiteUrl: "",
      },
    ],
    pricingPlans: [
      {
        id: "fallback-basic",
        name: t("basicPlan"),
        price: "$0",
        priceSuffix: t("perMonth"),
        features: [
          t("productInventoryManagement"),
          t("salesTrackingRecording"),
          t("basicReportsAnalytics"),
          t("offlineSupportSync"),
          t("upTo100Products"),
        ],
        ctaLabel: t("getStarted"),
        isPlaceholder: false,
      },
      {
        id: "fallback-pro",
        name: t("proPlan"),
        price: "",
        priceSuffix: t("perMonth"),
        features: [],
        ctaLabel: t("subscribe"),
        isPlaceholder: true,
      },
      {
        id: "fallback-enterprise",
        name: t("enterprisePlan"),
        price: "",
        priceSuffix: t("perMonth"),
        features: [],
        ctaLabel: t("subscribe"),
        isPlaceholder: true,
      },
      {
        id: "fallback-custom",
        name: t("customPlan"),
        price: "",
        priceSuffix: t("perMonth"),
        features: [],
        ctaLabel: t("subscribe"),
        isPlaceholder: true,
      },
    ],
  };
}

const Home = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<"login" | "create">("create");
  const [homepageContent, setHomepageContent] = useState<ResolvedHomepageContent | null>(null);

  const fallbackContent = useMemo(() => buildFallbackHomepageContent(t), [t]);
  const content = homepageContent ?? fallbackContent;
  const { contact } = usePlatformContact();

  const loadHomepageContent = useCallback(async () => {
    try {
      const res = await contentApi.getHomepage(language);
      if (res.data) {
        setHomepageContent(res.data as ResolvedHomepageContent);
      }
    } catch {
      setHomepageContent(null);
    }
  }, [language]);

  useEffect(() => {
    void loadHomepageContent();
  }, [loadHomepageContent]);

  useEffect(() => {
    const handleLanguageChange = () => {
      void loadHomepageContent();
    };
    window.addEventListener("language-changed", handleLanguageChange);
    return () => window.removeEventListener("language-changed", handleLanguageChange);
  }, [loadHomepageContent]);

  // Only allow Home page on main domain; send returning users straight to the app
  useEffect(() => {
    const hostname = window.location.hostname;
    const isMainDomain = hostname === 'trippo.rw' || 
                         hostname === 'localhost' || 
                         hostname === '127.0.0.1' ||
                         (hostname.includes('localhost') && !hostname.startsWith('admin.') && !hostname.startsWith('dashboard.'));
    
    // If somehow on subdomain, redirect to main domain
    if (!isMainDomain && (hostname.startsWith('admin.') || hostname.startsWith('dashboard.'))) {
      window.location.replace(`${getSubdomainUrl(null)}?logout=1`);
      return;
    }

    if (!isMainDomain) return;

    const userId = localStorage.getItem("profit-pilot-user-id");
    const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";
    if (!userId || !authenticated) return;

    const isAdmin = localStorage.getItem("profit-pilot-is-admin") === "true";
    if (isAdmin) {
      window.location.replace(getSubdomainUrl("admin"));
      return;
    }
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  // Reset login modal state when user logs out (listen for auth changes)
  useEffect(() => {
    const handleAuthChange = () => {
      const userId = localStorage.getItem("profit-pilot-user-id");
      const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";
      
      // If user is logged out, ensure modal can be opened
      if (!userId || !authenticated) {
        setLoginModalOpen(false);
        setLoginModalTab("login");
      }
    };

    // Prevent back button navigation to protected routes
    const handlePopState = () => {
      const userId = localStorage.getItem("profit-pilot-user-id");
      const authenticated = localStorage.getItem("profit-pilot-authenticated") === "true";
      const currentPath = window.location.pathname;
      const protectedRoutes = ['/dashboard', '/products', '/sales', '/reports', '/settings', '/admin-dashboard'];
      const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));

      if (isProtectedRoute && (!userId || !authenticated)) {
        // User tried to access protected route via back button without auth
        window.history.replaceState(null, "", "/");
        window.location.href = "/";
      }
    };

    window.addEventListener("pin-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pin-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const openSignup = () => {
    setLoginModalTab("create");
    setLoginModalOpen(true);
  };

  return (
    <div className="homepage min-h-screen bg-white lg:bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <main className="relative min-h-[calc(100vh-4rem)] flex items-center py-16 lg:py-24">
        <div className="w-full flex flex-col gap-12">
          {/* Text Content */}
          <header className="text-left max-w-2xl lg:max-w-none lg:w-full px-6 lg:px-12 xl:px-20">
            <h1 className="text-2xl lg:text-3xl font-serif text-gray-900 mb-8 leading-tight">
              {t("runBusinessSmarter")}
            </h1>
            <Button
              className="bg-gray-500 text-white hover:bg-gray-600 px-5 py-2.5 text-sm font-medium rounded-full"
              onClick={openSignup}
            >
              {t("getStarted")}
            </Button>
          </header>
          
          {/* Hero Images — full bleed to viewport edges */}
          <div className="w-full flex gap-0 overflow-hidden">
            {["/card1.jpg", "/card2.png", "/card3.jpg", "/card4.jpg", "/card5.jpg"].map((src) => (
              <div key={src} className="w-1/5 relative group h-32 md:h-80">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            ))}
          </div>

          {/* Feature Cards */}
          <section className="w-full px-6 lg:px-12 xl:px-20" aria-label="Features">
            <h2 className="text-2xl lg:text-3xl font-serif text-gray-900 mb-6">{t("features")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {content.features.map((feature) => (
                <div key={feature.id} className="border border-gray-200 bg-gray-100 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        FEATURE_COLOR_CLASSES[feature.color] || FEATURE_COLOR_CLASSES.blue
                      }`}
                    >
                      {feature.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials */}
          <section
            className="w-full relative bg-cover bg-center bg-no-repeat lg:min-h-0"
            style={{ backgroundImage: `url(${content.testimonialBackgroundUrl || "/testmonial.webp"})` }}
            aria-label="Testimonials"
          >
            <div className="absolute inset-0 bg-white/70" />
            <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
              <div className="text-center mb-6">
                <h2 className="text-base lg:text-lg font-serif text-white inline-block px-4 py-1.5 bg-gray-600 rounded-full">
                  {t("whatOurUsersSay")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {content.testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="bg-gray-50 p-6">
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
                        <User size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{testimonial.attribution}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Partners Section */}
          <section className="w-full lg:px-10 xl:px-16 2xl:px-20" aria-label="Partners">
            <div className="text-left mb-6">
              <h2 className="text-2xl lg:text-3xl font-serif text-gray-900">
                {t("ourPartners")}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-4">
              {content.partners.map((partner) => {
                const logo = (
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="h-16 w-auto object-contain"
                  />
                );

                return (
                  <div key={partner.id} className="p-8">
                    {partner.websiteUrl ? (
                      <a
                        href={partner.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        {logo}
                      </a>
                    ) : (
                      logo
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pricing Cards */}
          <section className="w-full lg:px-10 xl:px-16 2xl:px-20" aria-label="Pricing">
            <h2 className="text-2xl lg:text-3xl font-serif text-gray-900 mb-6 text-center">{t("pricing")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {content.pricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border border-gray-200 bg-gray-100 p-4 flex flex-col ${
                    plan.isPlaceholder ? "opacity-30" : ""
                  }`}
                >
                  {!plan.isPlaceholder ? (
                    <>
                      <div className="flex items-start gap-3 mb-3">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          {plan.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        {plan.price ? (
                          <>
                            <span className="font-semibold text-lg">{plan.price}</span>
                            {plan.priceSuffix ? (
                              <span className="text-xs text-gray-500 ml-1">{plan.priceSuffix}</span>
                            ) : null}
                          </>
                        ) : null}
                      </p>
                      {plan.features.length > 0 ? (
                        <ul className="text-sm text-gray-700 space-y-2 leading-relaxed mb-4 flex-grow">
                          {plan.features.map((feature, index) => (
                            <li key={`${plan.id}-f-${index}`}>• {feature}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex-grow" />
                      )}
                      <Button
                        className="bg-gray-500 text-white hover:bg-gray-600 rounded-full px-4 py-2 text-sm w-full"
                        onClick={openSignup}
                      >
                        {plan.ctaLabel || t("getStarted")}
                      </Button>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        defaultTab={loginModalTab}
      />
      
      <PlatformContactFooter contact={contact} />
    </div>
  );
};

export default Home;
