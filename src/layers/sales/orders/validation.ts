import type {
  ConvertQuoteToOrderInput,
  RecordFulfillmentInput,
  SalesOrderStatus,
  SalesOrderTransitionInput,
} from "./types";

const optional = (value: string | null | undefined) => value?.trim() || null;
const statuses: SalesOrderStatus[] = [
  "draft",
  "confirmed",
  "in_preparation",
  "partially_fulfilled",
  "completed",
  "cancelled",
];

export function normalizeOrderConversion(input: ConvertQuoteToOrderInput) {
  if (!input.quoteId.trim())
    return { value: null, error: "Kabul edilmiş teklif seçilmelidir." };
  if (
    input.orderDate &&
    input.expectedDeliveryDate &&
    input.expectedDeliveryDate < input.orderDate
  )
    return {
      value: null,
      error: "Beklenen teslimat tarihi sipariş tarihinden önce olamaz.",
    };
  return {
    value: {
      ...input,
      quoteId: input.quoteId.trim(),
      expectedDeliveryDate: input.expectedDeliveryDate || null,
      internalNote: optional(input.internalNote),
    },
    error: null,
  };
}

export function normalizeOrderTransition(input: SalesOrderTransitionInput) {
  const reason = optional(input.reason);
  if (!input.salesOrderId || !statuses.includes(input.destinationStatus))
    return { value: null, error: "Satış siparişi durum geçişi geçersiz." };
  if (input.destinationStatus === "cancelled" && !reason)
    return { value: null, error: "İptal nedeni gereklidir." };
  return { value: { ...input, reason }, error: null };
}

export function normalizeFulfillment(input: RecordFulfillmentInput) {
  if (!input.salesOrderId)
    return { value: null, error: "Satış siparişi seçilmelidir." };
  if (!input.items.length)
    return { value: null, error: "En az bir karşılama kalemi gereklidir." };
  const seen = new Set<string>();
  for (const item of input.items) {
    if (!item.salesOrderItemId || seen.has(item.salesOrderItemId))
      return { value: null, error: "Karşılama kalemleri benzersiz olmalıdır." };
    if (!Number.isFinite(item.fulfilledQuantity) || item.fulfilledQuantity <= 0)
      return { value: null, error: "Karşılanan miktar sıfırdan büyük olmalıdır." };
    seen.add(item.salesOrderItemId);
  }
  return {
    value: {
      ...input,
      deliveryReference: optional(input.deliveryReference),
      note: optional(input.note),
    },
    error: null,
  };
}
