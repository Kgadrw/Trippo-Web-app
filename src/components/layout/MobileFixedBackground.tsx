/**
 * Full-viewport fixed background for mobile (< lg). Desktop is unchanged (hidden).
 * Uses /mobile.jpg from public; white overlay softens the pattern for readability.
 */
import { useTheme } from "@/hooks/useTheme";

export function MobileFixedBackground() {
  const { resolvedTheme } = useTheme();
  // In dark mode, hide background images for better readability.
  if (resolvedTheme === "dark") return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 lg:hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/mobile.jpg)" }}
      />
      <div className="absolute inset-0 bg-white/95" />
    </div>
  );
}
