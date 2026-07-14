export type SalesOrderStatus =
  | "draft"
  | "confirmed"
  | "in_preparation"
  | "partially_fulfilled"
  | "completed"
  | "cancelled";
export type SalesOrderCurrency = "TRY" | "EUR" | "USD" | "GBP";

export interface SalesOrder {
  id: string;
  companyId: string;
  orderNumber: string;
  sourceQuoteId: string;
  sourceQuoteVersionId: string;
  partyId: string;
  contactId: string | null;
  opportunityId: string | null;
  ownerUserId: string;
  status: SalesOrderStatus;
  currency: SalesOrderCurrency;
  orderDate: string;
  expectedDeliveryDate: string | null;
  confirmedAt: string | null;
  preparationStartedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  otherTaxTotal: number;
  grandTotal: number;
  totalCost: number | null;
  grossMargin: number | null;
  grossMarginPct: number | null;
  archivedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderItem {
  id: string;
  companyId: string;
  salesOrderId: string;
  sourceQuoteItemId: string;
  position: number;
  itemCode: string | null;
  description: string;
  orderedQuantity: number;
  unit: string;
  unitPrice: number;
  discountType: "percentage" | "fixed" | null;
  discountValue: number;
  vatRate: number;
  otherTaxRate: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTax: number;
  lineOtherTax: number;
  lineTotal: number;
  unitCost: number | null;
  lineCost: number | null;
  lineMargin: number | null;
  lineMarginPct: number | null;
  createdAt: string;
}

export interface SalesOrderFulfillment {
  id: string;
  companyId: string;
  salesOrderId: string;
  fulfillmentNumber: number;
  fulfilledAt: string;
  deliveryReference: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SalesOrderFulfillmentItem {
  id: string;
  companyId: string;
  fulfillmentId: string;
  salesOrderItemId: string;
  fulfilledQuantity: number;
  createdAt: string;
}

export interface SalesOrderStatusHistory {
  id: string;
  companyId: string;
  salesOrderId: string;
  fromStatus: SalesOrderStatus | null;
  toStatus: SalesOrderStatus;
  changedBy: string;
  changedAt: string;
  reason: string | null;
}

export interface ConvertQuoteToOrderInput {
  quoteId: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  internalNote?: string | null;
}
export interface ConvertQuoteToOrderResult {
  salesOrderId: string;
  salesOrderNumber: string;
  message: "Satış siparişi başarıyla oluşturuldu.";
}
export interface SalesOrderTransitionInput {
  salesOrderId: string;
  destinationStatus: SalesOrderStatus;
  reason?: string | null;
}
export interface FulfillmentItemInput {
  salesOrderItemId: string;
  fulfilledQuantity: number;
}
export interface RecordFulfillmentInput {
  salesOrderId: string;
  fulfilledAt?: string;
  deliveryReference?: string | null;
  note?: string | null;
  items: FulfillmentItemInput[];
}
export interface RecordFulfillmentResult {
  fulfillmentId: string;
  fulfillmentNumber: number;
  resultingStatus: SalesOrderStatus;
}
export interface SalesOrderListFilters {
  includeArchived?: boolean;
  status?: SalesOrderStatus;
  partyId?: string;
  opportunityId?: string;
  ownerUserId?: string;
  sourceQuoteId?: string;
}
export type SalesOrderRepositoryErrorCode =
  | "validation"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "database";
export interface SalesOrderRepositoryError {
  code: SalesOrderRepositoryErrorCode;
  message: string;
  cause: unknown;
}
export type SalesOrderRepositoryResult<T> =
  | { data: T; error: null }
  | { data: null; error: SalesOrderRepositoryError };
