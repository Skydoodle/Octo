import { describe, expect, it } from "vitest";
import {
  calculateQuoteLine,
  calculateQuoteVersion,
  roundQuote,
} from "./quoteCalculations";
import {
  daysUntilQuoteExpiry,
  isQuoteExpired,
  isQuoteOpen,
  isQuoteTerminal,
  quoteStatusLabels,
  selectCurrentQuoteVersion,
} from "./quoteViewModel";
import type { QuoteItemInput, SalesQuoteVersion } from "./types";

const item = (overrides: Partial<QuoteItemInput> = {}): QuoteItemInput => ({
  position: 1,
  description: "Danışmanlık",
  quantity: 2,
  unit: "saat",
  unitPrice: 100,
  discountType: null,
  discountValue: 0,
  vatRate: 20,
  otherTaxRate: 0,
  unitCost: null,
  ...overrides,
});

describe("quotation deterministic calculations", () => {
  it("rounds monetary values consistently to half away from zero", () => {
    expect(roundQuote(1.005)).toBe(1.01);
    expect(roundQuote(-1.005)).toBe(-1.01);
    expect(roundQuote(12.34567, 4)).toBe(12.3457);
  });
  it("calculates percentage discounts and VAT", () => {
    expect(
      calculateQuoteLine(
        item({ discountType: "percentage", discountValue: 10 }),
      ),
    ).toMatchObject({
      lineSubtotal: 200,
      lineDiscount: 20,
      taxableAmount: 180,
      lineTax: 36,
      lineTotal: 216,
    });
  });
  it("calculates fixed discounts and other tax", () => {
    expect(
      calculateQuoteLine(
        item({
          discountType: "fixed",
          discountValue: 25,
          vatRate: 0,
          otherTaxRate: 5,
        }),
      ),
    ).toMatchObject({
      lineDiscount: 25,
      taxableAmount: 175,
      lineOtherTax: 8.75,
      lineTotal: 183.75,
    });
  });
  it("rejects discounts exceeding the taxable subtotal", () => {
    expect(() =>
      calculateQuoteLine(item({ discountType: "fixed", discountValue: 201 })),
    ).toThrow("aşamaz");
  });
  it("calculates unit cost and positive margin", () => {
    expect(calculateQuoteLine(item({ unitCost: 60 }))).toMatchObject({
      lineCost: 120,
      lineMargin: 80,
      lineMarginPct: 40,
    });
  });
  it("supports negative margins without making totals negative", () => {
    expect(calculateQuoteLine(item({ unitCost: 140 }))).toMatchObject({
      lineCost: 280,
      lineMargin: -80,
      lineMarginPct: -40,
      lineTotal: 240,
    });
  });
  it("derives version totals only from line calculations", () => {
    expect(
      calculateQuoteVersion([
        item({ unitCost: 60 }),
        item({
          position: 2,
          quantity: 1,
          unitPrice: 50,
          unitCost: 80,
          vatRate: 10,
        }),
      ]),
    ).toEqual({
      subtotal: 250,
      discountTotal: 0,
      taxTotal: 45,
      otherTaxTotal: 0,
      grandTotal: 295,
      totalCost: 200,
      grossMargin: 50,
      grossMarginPct: 20,
    });
  });
  it("does not report a misleading partial quote margin when any cost is absent", () => {
    expect(
      calculateQuoteVersion([item({ unitCost: 60 }), item({ position: 2 })]),
    ).toMatchObject({
      totalCost: null,
      grossMargin: null,
      grossMarginPct: null,
    });
  });
});

describe("quotation view model", () => {
  it("calculates expiration and days remaining", () => {
    expect(
      isQuoteExpired(
        { validUntil: "2026-07-12", status: "sent" },
        new Date("2026-07-13"),
      ),
    ).toBe(true);
    expect(
      daysUntilQuoteExpiry("2026-07-15", new Date("2026-07-13T12:00:00")),
    ).toBe(3);
  });
  it("identifies open and terminal states with Turkish labels", () => {
    expect(isQuoteTerminal("accepted")).toBe(true);
    expect(isQuoteOpen("revision_requested")).toBe(true);
    expect(quoteStatusLabels.pending_approval).toBe("Onay bekliyor");
  });
  it("selects only the explicitly current immutable version", () => {
    const versions = [
      { id: "v1", isCurrent: false },
      { id: "v2", isCurrent: true },
    ] as SalesQuoteVersion[];
    expect(selectCurrentQuoteVersion(versions)?.id).toBe("v2");
  });
});
