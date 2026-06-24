import { useEffect, useRef } from "react";

export function SplashScreen() {
  const removedRef = useRef(false);

  useEffect(() => {
    const removeSplash = () => {
      if (removedRef.current) return;
      removedRef.current = true;

      const htmlSplash = document.getElementById("splash-screen");
      const root = document.getElementById("root");

      if (root) {
        requestAnimationFrame(() => {
          root.classList.add("loaded");
        });
      }

      if (htmlSplash) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            htmlSplash.style.transition = "opacity 0.2s ease-out";
            htmlSplash.style.opacity = "0";
            setTimeout(() => {
              htmlSplash.remove();
              requestAnimationFrame(() => {
                document.body.classList.add("loaded");
                window.scrollTo(0, 0);
              });
            }, 200);
          });
        });
      } else {
        requestAnimationFrame(() => {
          document.body.classList.add("loaded");
          window.scrollTo(0, 0);
        });
      }
    };

    const timer = setTimeout(removeSplash, 100);
    const failsafe = setTimeout(removeSplash, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(failsafe);
    };
  }, []);

  return null;
}
