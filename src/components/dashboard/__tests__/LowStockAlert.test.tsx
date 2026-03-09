import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ---------- mocks ----------

// Mock useTranslation – the main focus of this test suite
const mockT = vi.fn((key: string) => {
  // Return a recognisable value so we can assert it was called
  const map: Record<string, string> = { language: "en" };
  return map[key] ?? key;
});

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: mockT, language: "en" }),
}));

// Mock useApi to provide controlled product data
const mockUseApi = vi.fn();
vi.mock("@/hooks/useApi", () => ({
  useApi: (...args: any[]) => mockUseApi(...args),
}));

// Mock useToast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock sound utilities
vi.mock("@/lib/sound", () => ({
  playUpdateBeep: vi.fn(),
  playWarningBeep: vi.fn(),
  playDeleteBeep: vi.fn(),
  playErrorBeep: vi.fn(),
  initAudio: vi.fn(),
}));

// Mock formatStockDisplay
vi.mock("@/lib/stockFormatter", () => ({
  formatStockDisplay: vi.fn((_product: any, _lang: string) => "3 items"),
}));

// ---------- helpers ----------

function setupUseApi(products: any[] = []) {
  mockUseApi.mockReturnValue({
    items: products,
    update: vi.fn(),
    remove: vi.fn(),
    refresh: vi.fn(),
  });
}

// ---------- tests ----------

describe("LowStockAlert – useTranslation hook usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls useTranslation and uses the t function", async () => {
    setupUseApi([
      { _id: "1", name: "Widget", stock: 2, minStock: 5 },
    ]);

    // Dynamic import after mocks are set up
    const { LowStockAlert } = await import("../LowStockAlert");
    render(<LowStockAlert />);

    // The component should have called t("language") for formatStockDisplay
    expect(mockT).toHaveBeenCalledWith("language");
  });

  it("passes the language from t() to formatStockDisplay", async () => {
    const { formatStockDisplay } = await import("@/lib/stockFormatter");

    setupUseApi([
      { _id: "2", name: "Gadget", stock: 3, minStock: 10 },
    ]);

    const { LowStockAlert } = await import("../LowStockAlert");
    render(<LowStockAlert />);

    // formatStockDisplay should have been called with the "en" language value
    expect(formatStockDisplay).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Gadget" }),
      "en"
    );
  });

  it("renders 'No low stock items' when product list is empty", async () => {
    setupUseApi([]);

    const { LowStockAlert } = await import("../LowStockAlert");
    render(<LowStockAlert />);

    expect(screen.getByText("No low stock items")).toBeInTheDocument();
  });

  it("renders low-stock product names", async () => {
    setupUseApi([
      { _id: "1", name: "Low Item", stock: 1, minStock: 5 },
    ]);

    const { LowStockAlert } = await import("../LowStockAlert");
    render(<LowStockAlert />);

    expect(screen.getByText("Low Item")).toBeInTheDocument();
  });

  it("renders 'Out of Stock' badge for zero-stock products", async () => {
    setupUseApi([
      { _id: "1", name: "Empty Product", stock: 0, minStock: 5 },
    ]);

    const { LowStockAlert } = await import("../LowStockAlert");
    render(<LowStockAlert />);

    // The component renders "(Out of Stock)" inline and "Out of Stock" in the badge
    const outOfStockElements = screen.getAllByText("Out of Stock");
    expect(outOfStockElements.length).toBeGreaterThan(0);
  });
});
