import type { EvidenceQuality, PreparedQuoteLine } from "./types";

export interface ComparableQuoteLine {
  quoteId: string;
  quoteNumber: string;
  partyId: string;
  itemCode: string | null;
  description: string;
  currency: string;
  quantity: number;
  unitPrice: number;
  status: string;
  issueDate: string;
  discountType?: "percentage" | "fixed" | null;
  discountValue?: number;
  opportunityCategory?: string | null;
}
export interface ComparableRequest {
  partyId: string;
  itemCode: string | null;
  description: string;
  currency: string;
  quantity: number;
  opportunityCategory?: string | null;
}

const dateValue = (value: string) => {
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
};
const sameProduct = (q: ComparableQuoteLine, r: ComparableRequest) =>
  r.itemCode
    ? q.itemCode === r.itemCode
    : q.description.trim().toLocaleLowerCase("tr-TR") ===
      r.description.trim().toLocaleLowerCase("tr-TR");
const quantityBand = (q: ComparableQuoteLine, r: ComparableRequest) =>
  q.quantity >= r.quantity * 0.75 && q.quantity <= r.quantity * 1.25;

export function rankComparableQuotes(
  rows: ComparableQuoteLine[],
  request: ComparableRequest,
) {
  return rows
    .filter(
      (row) =>
        row.partyId === request.partyId && row.currency === request.currency,
    )
    .sort(
      (a, b) =>
        Number(sameProduct(b, request)) - Number(sameProduct(a, request)) ||
        Number(quantityBand(b, request)) - Number(quantityBand(a, request)) ||
        dateValue(b.issueDate) - dateValue(a.issueDate) ||
        Number(b.status === "accepted") - Number(a.status === "accepted") ||
        Number(
          (b.opportunityCategory ?? null) ===
            (request.opportunityCategory ?? null),
        ) -
          Number(
            (a.opportunityCategory ?? null) ===
              (request.opportunityCategory ?? null),
          ) ||
        a.quoteId.localeCompare(b.quoteId),
    );
}

export function selectDefensiblePrice(
  explicitPrice: number | null | undefined,
  comparables: ComparableQuoteLine[],
  request: ComparableRequest,
) {
  if (
    explicitPrice != null &&
    Number.isFinite(explicitPrice) &&
    explicitPrice > 0
  )
    return {
      unitPrice: explicitPrice,
      source: {
        type: "user_input",
        label: "Kullanıcı tarafından açıkça girildi",
      },
    };
  const source = rankComparableQuotes(comparables, request).find((row) =>
    sameProduct(row, request),
  );
  return source
    ? {
        unitPrice: source.unitPrice,
        source: {
          type:
            source.status === "accepted"
              ? "accepted_comparable"
              : "relevant_history",
          quoteId: source.quoteId,
          quoteNumber: source.quoteNumber,
          date: source.issueDate,
          currency: source.currency,
          quantity: source.quantity,
          outcome: source.status,
          discountType: source.discountType ?? null,
          discountValue: source.discountValue ?? 0,
        },
      }
    : { unitPrice: null, source: null };
}

export function evidenceQuality(input: {
  lines: PreparedQuoteLine[];
  acceptedComparableCount: number;
  hasOpportunity: boolean;
  hasContact: boolean;
  blockingMissingCount: number;
}): EvidenceQuality {
  if (
    input.blockingMissingCount > 0 ||
    input.lines.some((line) => line.unit_price == null)
  )
    return "insufficient";
  if (
    input.acceptedComparableCount >= 2 &&
    input.hasOpportunity &&
    input.hasContact
  )
    return "high";
  if (input.acceptedComparableCount > 0 && input.hasOpportunity)
    return "medium";
  return "low";
}

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, canonical(v)]),
        )
      : value;
export function deterministicSourceFingerprint(value: unknown) {
  const text = JSON.stringify(canonical(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
