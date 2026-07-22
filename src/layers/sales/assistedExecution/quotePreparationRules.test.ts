import { describe, expect, it } from "vitest";
import {
  deterministicSourceFingerprint,
  evidenceQuality,
  rankComparableQuotes,
  selectDefensiblePrice,
  type ComparableQuoteLine,
} from "./quotePreparationRules";

const base: ComparableQuoteLine = {
  quoteId: "q1",
  quoteNumber: "TKL-1",
  partyId: "party",
  itemCode: "SKU",
  description: "Hizmet",
  currency: "TRY",
  quantity: 10,
  unitPrice: 100,
  status: "sent",
  issueDate: "2026-01-01",
};
describe("quote preparation rules", () => {
  it("keeps fingerprints deterministic across object key order", () =>
    expect(deterministicSourceFingerprint({ b: 2, a: { d: 4, c: 3 } })).toBe(
      deterministicSourceFingerprint({ a: { c: 3, d: 4 }, b: 2 }),
    ));
  it("enforces same party and currency before ranking", () => {
    const rows = [
      base,
      { ...base, quoteId: "other-party", partyId: "other", status: "accepted" },
      { ...base, quoteId: "eur", currency: "EUR", status: "accepted" },
    ];
    expect(
      rankComparableQuotes(rows, {
        partyId: "party",
        itemCode: "SKU",
        description: "Hizmet",
        currency: "TRY",
        quantity: 10,
      }).map((x) => x.quoteId),
    ).toEqual(["q1"]);
  });
  it("prefers same product, quantity band, accepted outcome, then recency with stable ties", () => {
    const rows = [
      { ...base, quoteId: "old", status: "accepted", issueDate: "2025-01-01" },
      {
        ...base,
        quoteId: "recent",
        status: "accepted",
        issueDate: "2026-02-01",
      },
      { ...base, quoteId: "wrong", itemCode: "OTHER", issueDate: "2026-03-01" },
    ];
    expect(
      rankComparableQuotes(rows, {
        partyId: "party",
        itemCode: "SKU",
        description: "Hizmet",
        currency: "TRY",
        quantity: 10,
      }).map((x) => x.quoteId),
    ).toEqual(["recent", "old", "wrong"]);
  });
  it("attributes explicit and accepted prices with historical discount context and never invents zero", () => {
    const request = {
      partyId: "party",
      itemCode: "SKU",
      description: "Hizmet",
      currency: "TRY",
      quantity: 10,
    };
    expect(selectDefensiblePrice(125, [], request)).toMatchObject({
      unitPrice: 125,
      source: { type: "user_input" },
    });
    expect(
      selectDefensiblePrice(
        null,
        [
          {
            ...base,
            status: "accepted",
            discountType: "percentage",
            discountValue: 5,
          },
        ],
        request,
      ),
    ).toMatchObject({
      unitPrice: 100,
      source: {
        type: "accepted_comparable",
        discountType: "percentage",
        discountValue: 5,
      },
    });
    expect(selectDefensiblePrice(0, [], request)).toEqual({
      unitPrice: null,
      source: null,
    });
  });
  it("describes record quality rather than outcome probability", () => {
    const line = {
      position: 1,
      item_code: null,
      description: "X",
      quantity: 1,
      unit: "adet",
      unit_price: 1,
      price_source: {},
      discount_type: null,
      discount_value: 0,
      vat_rate: 20,
      other_tax_rate: 0,
      unit_cost: null,
    } as const;
    expect(
      evidenceQuality({
        lines: [line],
        acceptedComparableCount: 2,
        hasOpportunity: true,
        hasContact: true,
        blockingMissingCount: 0,
      }),
    ).toBe("high");
    expect(
      evidenceQuality({
        lines: [{ ...line, unit_price: null }],
        acceptedComparableCount: 5,
        hasOpportunity: true,
        hasContact: true,
        blockingMissingCount: 1,
      }),
    ).toBe("insufficient");
  });
});
