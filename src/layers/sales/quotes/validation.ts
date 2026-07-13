import type {
  QuoteCreateInput,
  QuoteItemInput,
  QuoteRevisionInput,
  QuoteTransitionInput,
  SalesQuoteStatus,
} from "./types";

const optional = (value: string | null | undefined) => value?.trim() || null;
const statuses: SalesQuoteStatus[] = [
  "draft",
  "pending_approval",
  "sent",
  "viewed",
  "revision_requested",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
];

export function normalizeQuoteItem(input: QuoteItemInput): {
  value: QuoteItemInput | null;
  error: string | null;
} {
  const value = {
    ...input,
    itemCode: optional(input.itemCode),
    description: input.description.trim(),
    unit: input.unit.trim(),
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? 0,
    vatRate: input.vatRate ?? 20,
    otherTaxRate: input.otherTaxRate ?? 0,
    unitCost: input.unitCost ?? null,
  };
  if (!value.description)
    return { value: null, error: "Kalem açıklaması gereklidir." };
  if (!value.unit) return { value: null, error: "Kalem birimi gereklidir." };
  if (!Number.isInteger(value.position) || value.position <= 0)
    return {
      value: null,
      error: "Kalem sırası pozitif bir tam sayı olmalıdır.",
    };
  if (!Number.isFinite(value.quantity) || value.quantity <= 0)
    return { value: null, error: "Miktar sıfırdan büyük olmalıdır." };
  if (!Number.isFinite(value.unitPrice) || value.unitPrice < 0)
    return { value: null, error: "Birim fiyat negatif olamaz." };
  if (
    value.discountValue < 0 ||
    value.vatRate < 0 ||
    value.otherTaxRate < 0 ||
    (value.unitCost != null && value.unitCost < 0)
  )
    return {
      value: null,
      error: "İndirim, vergi ve maliyet değerleri geçersiz.",
    };
  if (value.discountType === "percentage" && value.discountValue > 100)
    return { value: null, error: "Yüzde indirim 100 değerini aşamaz." };
  if (!value.discountType && value.discountValue !== 0)
    return {
      value: null,
      error: "İndirim değeri için indirim türü seçilmelidir.",
    };
  return { value, error: null };
}

export function normalizeQuoteItems(items: QuoteItemInput[]) {
  if (!items.length)
    return { value: null, error: "En az bir teklif kalemi gereklidir." };
  const normalized: QuoteItemInput[] = [];
  const positions = new Set<number>();
  for (const item of items) {
    const result = normalizeQuoteItem(item);
    if (!result.value) return { value: null, error: result.error };
    if (positions.has(result.value.position))
      return { value: null, error: "Kalem sıraları benzersiz olmalıdır." };
    positions.add(result.value.position);
    normalized.push(result.value);
  }
  return { value: normalized, error: null };
}

export function normalizeQuoteCreate(input: QuoteCreateInput): {
  value: QuoteCreateInput | null;
  error: string | null;
} {
  if (!input.partyId) return { value: null, error: "Firma seçilmelidir." };
  if (input.validUntil && input.issueDate && input.validUntil < input.issueDate)
    return {
      value: null,
      error: "Geçerlilik tarihi düzenleme tarihinden önce olamaz.",
    };
  const items = normalizeQuoteItems(input.items);
  if (!items.value) return { value: null, error: items.error };
  return {
    value: {
      ...input,
      contactId: input.contactId || null,
      opportunityId: input.opportunityId || null,
      ownerUserId: input.ownerUserId || null,
      validUntil: input.validUntil || null,
      paymentTerms: optional(input.paymentTerms),
      deliveryTerms: optional(input.deliveryTerms),
      customerNotes: optional(input.customerNotes),
      internalNotes: optional(input.internalNotes),
      approvalReason: optional(input.approvalReason),
      items: items.value,
    },
    error: null,
  };
}

export function normalizeQuoteRevision(input: QuoteRevisionInput): {
  value: QuoteRevisionInput | null;
  error: string | null;
} {
  if (!input.quoteId)
    return { value: null, error: "Teklif kimliği gereklidir." };
  const items = normalizeQuoteItems(input.items);
  if (!items.value) return { value: null, error: items.error };
  return {
    value: {
      ...input,
      revisionNote: optional(input.revisionNote),
      paymentTerms: optional(input.paymentTerms),
      deliveryTerms: optional(input.deliveryTerms),
      customerNotes: optional(input.customerNotes),
      internalNotes: optional(input.internalNotes),
      items: items.value,
    },
    error: null,
  };
}

export function normalizeQuoteTransition(input: QuoteTransitionInput): {
  value: QuoteTransitionInput | null;
  error: string | null;
} {
  const value = {
    ...input,
    reason: optional(input.reason),
    evidence: optional(input.evidence),
  };
  if (!input.quoteId || !statuses.includes(input.destinationStatus))
    return { value: null, error: "Teklif durum geçişi geçersiz." };
  if (
    input.destinationStatus === "accepted" &&
    !value.reason &&
    !value.evidence
  )
    return { value: null, error: "Kabul kanıtı veya nedeni gereklidir." };
  if (
    (input.destinationStatus === "rejected" ||
      input.destinationStatus === "cancelled") &&
    !value.reason
  )
    return { value: null, error: "Bu durum geçişi için neden gereklidir." };
  return { value, error: null };
}
