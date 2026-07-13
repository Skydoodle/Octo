export type QuoteCurrency = "TRY" | "EUR" | "USD" | "GBP";
export type SalesQuoteStatus =
  | "draft"
  | "pending_approval"
  | "sent"
  | "viewed"
  | "revision_requested"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";
export type QuoteDiscountType = "percentage" | "fixed";

export interface SalesQuote {
  id: string;
  companyId: string;
  quoteNumber: string;
  partyId: string;
  contactId: string | null;
  opportunityId: string | null;
  ownerUserId: string;
  status: SalesQuoteStatus;
  currency: QuoteCurrency;
  issueDate: string;
  validUntil: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  expectedDeliveryDate: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  currentVersionId: string | null;
  approvalRequired: boolean;
  approvalReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  cancelledAt: string | null;
  acceptanceEvidence: string | null;
  archivedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesQuoteVersion {
  id: string;
  companyId: string;
  quoteId: string;
  versionNumber: number;
  revisionNote: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  otherTaxTotal: number;
  grandTotal: number;
  totalCost: number | null;
  grossMargin: number | null;
  grossMarginPct: number | null;
  isCurrent: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SalesQuoteItem {
  id: string;
  companyId: string;
  quoteVersionId: string;
  position: number;
  itemCode: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType: QuoteDiscountType | null;
  discountValue: number;
  vatRate: number;
  otherTaxRate: number;
  unitCost: number | null;
  lineSubtotal: number;
  lineDiscount: number;
  lineTax: number;
  lineOtherTax: number;
  lineTotal: number;
  lineCost: number | null;
  lineMargin: number | null;
  lineMarginPct: number | null;
  createdAt: string;
}

export interface SalesQuoteStatusHistory {
  id: string;
  companyId: string;
  quoteId: string;
  fromStatus: SalesQuoteStatus | null;
  toStatus: SalesQuoteStatus;
  changedBy: string;
  changedAt: string;
  reason: string | null;
  evidence: string | null;
}

export interface QuoteItemInput {
  position: number;
  itemCode?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType?: QuoteDiscountType | null;
  discountValue?: number;
  vatRate?: number;
  otherTaxRate?: number;
  unitCost?: number | null;
}

export interface QuoteCreateInput {
  partyId: string;
  contactId?: string | null;
  opportunityId?: string | null;
  ownerUserId?: string | null;
  currency?: QuoteCurrency;
  issueDate?: string;
  validUntil?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  expectedDeliveryDate?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
  approvalRequired?: boolean;
  approvalReason?: string | null;
  items: QuoteItemInput[];
}

export interface QuoteRevisionInput {
  quoteId: string;
  revisionNote?: string | null;
  items: QuoteItemInput[];
  validUntil?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  expectedDeliveryDate?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
}

export interface QuoteTransitionInput {
  quoteId: string;
  destinationStatus: SalesQuoteStatus;
  reason?: string | null;
  evidence?: string | null;
}
export interface QuoteCreateResult {
  quoteId: string;
  quoteNumber: string;
  versionId: string;
}
export interface QuoteRevisionResult {
  versionId: string;
  versionNumber: number;
}
export interface QuoteListFilters {
  includeArchived?: boolean;
  status?: SalesQuoteStatus;
  partyId?: string;
  opportunityId?: string;
  ownerUserId?: string;
}
export type QuoteRepositoryErrorCode =
  "validation" | "forbidden" | "not_found" | "conflict" | "database";
export interface QuoteRepositoryError {
  code: QuoteRepositoryErrorCode;
  message: string;
  cause: unknown;
}
export type QuoteRepositoryResult<T> =
  { data: T; error: null } | { data: null; error: QuoteRepositoryError };
