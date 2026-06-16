import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const DESKTOP_LG_BREAKPOINT = 1024;

export function useIsDesktopLg() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth >= DESKTOP_LG_BREAKPOINT,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_LG_BREAKPOINT}px)`);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
