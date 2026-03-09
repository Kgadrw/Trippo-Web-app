import { describe, it, expect, vi, beforeEach } from "vitest";

describe("sw.js message event listener", () => {
  let messageHandler: (event: MessageEvent) => void;

  beforeEach(() => {
    // Reset listeners
    const listeners: Record<string, Function[]> = {};

    // Mock the service worker global scope
    (globalThis as any).self = {
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn((type: string, handler: Function) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(handler);
      }),
      clients: { claim: vi.fn() },
      registration: {
        getNotifications: vi.fn().mockResolvedValue([]),
        showNotification: vi.fn().mockResolvedValue(undefined),
      },
      navigator: {},
      location: { origin: "http://localhost" },
    };

    // Stub global caches so the "activate" handler doesn't throw
    (globalThis as any).caches = {
      keys: vi.fn().mockResolvedValue([]),
      open: vi.fn().mockResolvedValue({ put: vi.fn() }),
      match: vi.fn(),
      delete: vi.fn(),
    };

    // Stub fetch & navigator used by sw.js at load time
    (globalThis as any).fetch = vi.fn();
    (globalThis as any).navigator = { onLine: true };

    // Load the service worker script – this registers all addEventListener calls
    // We need a clean module each test run
    vi.resetModules();

    // Use a dynamic import workaround: read & eval the script because sw.js is
    // a plain JS file (not an ES module) that relies on the `self` global.
    const fs = require("fs");
    const path = require("path");
    const swCode = fs.readFileSync(
      path.resolve(__dirname, "../../public/sw.js"),
      "utf-8"
    );

    // Execute sw.js in the current context so it binds to our mocked `self`
    // Wrap in a function to avoid polluting the test scope
    const run = new Function("self", "caches", "fetch", "navigator", "console", swCode);
    run(
      (globalThis as any).self,
      (globalThis as any).caches,
      (globalThis as any).fetch,
      (globalThis as any).navigator,
      console
    );

    // Grab the "message" handler that was registered
    const calls = ((globalThis as any).self.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const messageCalls = calls.filter(([type]: [string]) => type === "message");
    expect(messageCalls.length).toBeGreaterThan(0);
    messageHandler = messageCalls[0][1];
  });

  it("calls self.skipWaiting() when receiving a SKIP_WAITING message", async () => {
    const event = { data: { type: "SKIP_WAITING" } } as unknown as MessageEvent;

    await messageHandler(event);

    expect((globalThis as any).self.skipWaiting).toHaveBeenCalledOnce();
  });

  it("does not call self.skipWaiting() for other message types", async () => {
    const event = { data: { type: "KEEP_ALIVE" }, ports: [] } as unknown as MessageEvent;

    await messageHandler(event);

    expect((globalThis as any).self.skipWaiting).not.toHaveBeenCalled();
  });

  it("returns early (no errors) when event.data is falsy", async () => {
    const event = { data: null } as unknown as MessageEvent;

    // Should not throw
    await messageHandler(event);

    expect((globalThis as any).self.skipWaiting).not.toHaveBeenCalled();
  });
});
