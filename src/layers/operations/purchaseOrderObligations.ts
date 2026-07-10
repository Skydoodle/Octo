import type { Invoice } from '../finance/types'
import { siparisToplam, type Siparis, type SiparisParaBirimi } from './types'

export type PurchaseOrderLinkIssueReason =
  | 'missing-invoice'
  | 'conflicting-order-link'
  | 'not-purchase-invoice'
  | 'inactive-invoice'
  | 'currency-mismatch'
  | 'invalid-amount'
  | 'legacy-flag-without-link'

export interface PurchaseOrderLinkIssue {
  invoiceId: string
  reason: PurchaseOrderLinkIssueReason
}

export interface PurchaseOrderReconciliation {
  orderId: string
  currency: SiparisParaBirimi
  orderTotal: number
  rawInvoiceCoverage: number
  invoiceCoverage: number
  remainingAmount: number
  linkedInvoices: Invoice[]
  linkIssues: PurchaseOrderLinkIssue[]
  calculationBlocked: boolean
  fullyCovered: boolean
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))]
}

function recordedInvoiceIds(order: Siparis): string[] {
  return uniqueStrings([...(order.faturaIds ?? []), order.faturaId])
}

export function purchaseOrderCurrency(order: Siparis): SiparisParaBirimi {
  return order.paraBirimi === 'USD' || order.paraBirimi === 'EUR' ? order.paraBirimi : 'TRY'
}

export function reconcilePurchaseOrder(
  order: Siparis,
  invoices: Invoice[],
  allOrders: Siparis[] = [order],
): PurchaseOrderReconciliation {
  const currency = purchaseOrderCurrency(order)
  const recordedIds = recordedInvoiceIds(order)
  const invoiceLinkedIds = invoices
    .filter(invoice => invoice.sourceOrderId === order.id)
    .map(invoice => invoice.id)
  const candidateIds = uniqueStrings([...recordedIds, ...invoiceLinkedIds])
  const linkedInvoices: Invoice[] = []
  const linkIssues: PurchaseOrderLinkIssue[] = []

  if (order.faturalandi && candidateIds.length === 0) {
    linkIssues.push({ invoiceId: 'legacy:faturalandi', reason: 'legacy-flag-without-link' })
  }

  for (const invoiceId of candidateIds) {
    const invoice = invoices.find(item => item.id === invoiceId)
    if (!invoice) {
      linkIssues.push({ invoiceId, reason: 'missing-invoice' })
      continue
    }
    if (invoice.sourceOrderId && invoice.sourceOrderId !== order.id) {
      linkIssues.push({ invoiceId, reason: 'conflicting-order-link' })
      continue
    }
    const legacyOrderLinks = invoice.sourceOrderId
      ? []
      : allOrders.filter(candidate => recordedInvoiceIds(candidate).includes(invoiceId))
    if (legacyOrderLinks.length > 1) {
      linkIssues.push({ invoiceId, reason: 'conflicting-order-link' })
      continue
    }
    if (invoice.type !== 'purchase') {
      linkIssues.push({ invoiceId, reason: 'not-purchase-invoice' })
      continue
    }
    if (invoice.status === 'cancelled' || invoice.status === 'draft') {
      linkIssues.push({ invoiceId, reason: 'inactive-invoice' })
      continue
    }
    if (invoice.currency !== currency) {
      linkIssues.push({ invoiceId, reason: 'currency-mismatch' })
      continue
    }
    if (!Number.isFinite(invoice.total) || invoice.total <= 0) {
      linkIssues.push({ invoiceId, reason: 'invalid-amount' })
      continue
    }
    linkedInvoices.push(invoice)
  }

  const orderTotal = siparisToplam(order).genelToplam
  const rawInvoiceCoverage = linkedInvoices.reduce((sum, invoice) => sum + invoice.total, 0)
  const invoiceCoverage = Math.min(orderTotal, rawInvoiceCoverage)
  const calculationBlocked = linkIssues.some(issue =>
    issue.reason === 'conflicting-order-link' ||
    issue.reason === 'not-purchase-invoice' ||
    issue.reason === 'currency-mismatch',
  )
  const remainingAmount = order.odemeDurumu === 'odendi'
    ? 0
    : Math.max(0, orderTotal - invoiceCoverage)

  return {
    orderId: order.id,
    currency,
    orderTotal,
    rawInvoiceCoverage,
    invoiceCoverage,
    remainingAmount,
    linkedInvoices,
    linkIssues,
    calculationBlocked,
    fullyCovered: !calculationBlocked && remainingAmount === 0,
  }
}
