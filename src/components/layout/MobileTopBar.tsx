import { useEffect, useRef } from "react";
import { HeaderPlanBanner } from "./HeaderPlanBanner";
import { MobileHeader } from "./MobileHeader";
import { MobilePageSearchBar } from "./PageSearchBar";

type MobileTopBarProps = {
  onMenuOpen: () => void;
  onHeightChange?: (height: number) => void;
  onNotificationClick?: () => void;
};

export function MobileTopBar({
  onMenuOpen,
  onHeightChange,
  onNotificationClick,
}: MobileTopBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onHeightChange) return;

    const report = () => onHeightChange(el.offsetHeight);
    report();

    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div
      ref={rootRef}
      className="fixed top-0 left-0 right-0 z-50 flex flex-col border-b border-white/30 bg-white/45 backdrop-blur-md supports-[backdrop-filter]:bg-white/35 lg:hidden"
    >
      <HeaderPlanBanner />
      <MobileHeader onMenuOpen={onMenuOpen} onNotificationClick={onNotificationClick} />
      <MobilePageSearchBar />
    </div>
  );
}
