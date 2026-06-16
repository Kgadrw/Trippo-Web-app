/**
 * Full-viewport fixed background — solid white on mobile and desktop app shell.
 */
export function MobileFixedBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 bg-white lg:hidden"
      aria-hidden
    />
  );
}
