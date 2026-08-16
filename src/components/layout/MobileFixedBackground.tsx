/**
 * Full-viewport fixed background — follows theme on mobile app shell.
 */
export function MobileFixedBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 bg-background lg:hidden"
      aria-hidden
    />
  );
}
