export type FinanceCurrency = "TRY" | "EUR" | "USD" | "GBP";
export type FinanceAccountType = "bank" | "cash";
export type FinanceInvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
export type FinancePaymentMethod = "bank_transfer" | "cash" | "card" | "cheque" | "other";

export interface FinanceAccount { id:string; companyId:string; name:string; accountType:FinanceAccountType; currency:FinanceCurrency; iban:string|null; openingBalance:number; archivedAt:string|null; createdBy:string; updatedBy:string; createdAt:string; updatedAt:string }
export interface FinanceInvoice { id:string; companyId:string; invoiceNumber:string; invoiceType:"sales"|"purchase"; sourceSalesOrderId:string|null; partyId:string; contactId:string|null; opportunityId:string|null; ownerUserId:string; status:FinanceInvoiceStatus; currency:FinanceCurrency; issueDate:string; dueDate:string|null; paymentTerms:string|null; customerNotes:string|null; internalNotes:string|null; partyDisplayName:string; partyTaxId:string|null; partyTaxOffice:string|null; partyAddress:string|null; contactDisplayName:string|null; contactEmail:string|null; contactPhone:string|null; subtotal:number; discountTotal:number; taxTotal:number; otherTaxTotal:number; grandTotal:number; paidAmount:number; outstandingAmount:number; issuedAt:string|null; paidAt:string|null; cancelledAt:string|null; cancellationReason:string|null; archivedAt:string|null; createdBy:string; updatedBy:string; createdAt:string; updatedAt:string }
export interface FinanceInvoiceItem { id:string; companyId:string; invoiceId:string; sourceSalesOrderItemId:string|null; position:number; itemCode:string|null; description:string; quantity:number; unit:string; unitPrice:number; discountType:"percentage"|"fixed"|null; discountValue:number; vatRate:number; otherTaxRate:number; lineSubtotal:number; lineDiscount:number; lineTax:number; lineOtherTax:number; lineTotal:number; createdAt:string }
export interface FinanceInvoiceStatusHistory { id:string; companyId:string; invoiceId:string; fromStatus:FinanceInvoiceStatus|null; toStatus:FinanceInvoiceStatus; changedBy:string; changedAt:string; reason:string|null }
export interface FinancePayment { id:string; companyId:string; paymentNumber:string; direction:"inflow"|"outflow"; partyId:string; accountId:string; paymentDate:string; currency:FinanceCurrency; amount:number; paymentMethod:FinancePaymentMethod; externalReference:string|null; note:string|null; postedAt:string; createdBy:string; createdAt:string }
export interface FinancePaymentAllocation { id:string; companyId:string; paymentId:string; invoiceId:string; allocatedAmount:number; createdAt:string }

export interface CreateSalesInvoiceFromOrderInput { salesOrderId:string; issueDate?:string; dueDate:string; customerNote?:string|null; internalNote?:string|null }
export interface CreateSalesInvoiceFromOrderResult { invoiceId:string; invoiceNumber:string }
export interface FinanceInvoiceTransitionInput { invoiceId:string; destinationStatus:"issued"|"cancelled"; reason?:string|null }
export interface CollectionAllocationInput { invoiceId:string; allocatedAmount:number }
export interface RecordCustomerCollectionInput { partyId:string; accountId:string; paymentDate:string; paymentMethod:FinancePaymentMethod; externalReference?:string|null; note?:string|null; allocations:CollectionAllocationInput[] }
export interface CollectionInvoiceResult { invoiceId:string; status:FinanceInvoiceStatus }
export interface RecordCustomerCollectionResult { paymentId:string; paymentNumber:string; amount:number; affectedInvoices:CollectionInvoiceResult[]; message:"Tahsilat başarıyla kaydedildi." }
export interface FinanceAccountCreateInput { name:string; accountType:FinanceAccountType; currency:FinanceCurrency; iban?:string|null; openingBalance?:number }
export interface FinanceAccountFilters { includeArchived?:boolean; accountType?:FinanceAccountType; currency?:FinanceCurrency }
export interface FinanceInvoiceFilters { includeArchived?:boolean; status?:FinanceInvoiceStatus; partyId?:string; sourceSalesOrderId?:string; ownerUserId?:string; currency?:FinanceCurrency }
export interface FinancePaymentFilters { partyId?:string; accountId?:string; fromDate?:string; toDate?:string }
export interface ReceivableScheduleEntry { invoiceId:string; invoiceNumber:string; partyId:string; partyDisplayName:string; dueDate:string|null; currency:FinanceCurrency; outstandingAmount:number; overdue:boolean; daysOverdue:number; agingBucket:ReceivableAgingBucket }
export interface PartyReceivableCurrencySummary { totalOpenReceivable:number; overdueReceivable:number; openInvoiceCount:number }
export interface PartyReceivableSummary { partyId:string; byCurrency:Partial<Record<FinanceCurrency,PartyReceivableCurrencySummary>>; openInvoiceCount:number; lastInvoiceDate:string|null; lastCollectionDate:string|null; paymentHistoryCount:number; schedule:ReceivableScheduleEntry[] }
export type ReceivableAgingBucket = "current"|"1_30"|"31_60"|"61_90"|"90_plus";
export type FinanceRepositoryErrorCode = "validation"|"forbidden"|"not_found"|"conflict"|"database";
export interface FinanceRepositoryError { code:FinanceRepositoryErrorCode; message:string; cause:unknown }
export type FinanceRepositoryResult<T> = {data:T;error:null}|{data:null;error:FinanceRepositoryError};
