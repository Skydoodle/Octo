import type { BusinessParty } from '../crm/types'
import type { SalesActivity, SalesLead, SalesOpportunity, SalesPipelineStage } from '../execution/types'
import { activityLabels, leadDisplayName } from '../execution/salesExecutionViewModel'
import type { CustomerHealthAssessment, CustomerHealthStatus } from '../health/types'
import { healthLabels } from '../health/customerHealthViewModel'
import type { SalesOrder } from '../orders/types'
import { isDeliveryOverdue, isSalesOrderOpen, salesOrderStatusLabels } from '../orders/salesOrderViewModel'
import type { SalesQuote } from '../quotes/types'
import { daysUntilQuoteExpiry, quoteStatusLabels } from '../quotes/quoteViewModel'

export type WorkbenchAttentionKind = 'overdue_activity' | 'critical_health' | 'risky_health' | 'quote_expiry' | 'opportunity_next_action' | 'accepted_quote' | 'order_fulfillment' | 'quote_response'
export interface WorkbenchAttention { id: string; kind: WorkbenchAttentionKind; priority: number; title: string; reason: string; date: string | null; href: string; action: string }
export interface WorkbenchTimelineItem { id: string; occurredAt: string; label: string; context: string; href: string }
export interface WorkbenchFlow { activeLeads: number; openOpportunities: number; awaitingResponseQuotes: number; acceptedAwaitingOrder: number; activeOrders: number; health: Record<CustomerHealthStatus, number> }
export interface WorkbenchInput { parties: BusinessParty[]; leads: SalesLead[]; opportunities: SalesOpportunity[]; stages: SalesPipelineStage[]; activities: SalesActivity[]; quotes: SalesQuote[]; orders: SalesOrder[]; health: CustomerHealthAssessment[]; now?: Date }

const timestamp = (value: string | null | undefined) => value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER
const partyMap = (parties: BusinessParty[]) => new Map(parties.map(party => [party.id, party.displayName]))
const stageMap = (stages: SalesPipelineStage[]) => new Map(stages.map(stage => [stage.id, stage]))
const orderQuoteIds = (orders: SalesOrder[]) => new Set(orders.map(order => order.sourceQuoteId))
const openOpportunity = (opportunity: SalesOpportunity, stages: Map<string, SalesPipelineStage>) => !opportunity.archivedAt && !stages.get(opportunity.stageId)?.isClosed

export function buildWorkbenchAttention(input: WorkbenchInput): WorkbenchAttention[] {
  const now = input.now ?? new Date(); const names = partyMap(input.parties); const stages = stageMap(input.stages); const convertedQuotes = orderQuoteIds(input.orders); const rows: WorkbenchAttention[] = []
  for (const activity of input.activities) if (!activity.archivedAt && !activity.completedAt && activity.dueAt && new Date(activity.dueAt) < now) rows.push({ id: `activity:${activity.id}`, kind: 'overdue_activity', priority: 1, title: activity.title || activityLabels[activity.activityType], reason: `Planlanan tarih geçti: ${activityLabels[activity.activityType].toLocaleLowerCase('tr-TR')} tamamlanmadı.`, date: activity.dueAt, href: '/dashboard/satis/aktiviteler', action: 'Aktiviteyi aç' })
  for (const assessment of input.health) if (assessment.isCurrent && (assessment.healthStatus === 'critical' || assessment.healthStatus === 'risky')) rows.push({ id: `health:${assessment.id}`, kind: assessment.healthStatus === 'critical' ? 'critical_health' : 'risky_health', priority: assessment.healthStatus === 'critical' ? 2 : 4, title: names.get(assessment.partyId) ?? 'Firma', reason: `Güncel Müşteri Sağlığı: ${healthLabels[assessment.healthStatus]}. ${assessment.summary}`, date: assessment.evaluatedAt, href: `/dashboard/satis/musteri-sagligi/${assessment.partyId}`, action: 'Değerlendirmeyi aç' })
  for (const quote of input.quotes) {
    if (quote.archivedAt) continue
    const days = daysUntilQuoteExpiry(quote.validUntil, now)
    if (['sent','viewed'].includes(quote.status) && days !== null && days >= 0 && days <= 7) rows.push({ id: `quote-expiry:${quote.id}`, kind: 'quote_expiry', priority: 3, title: quote.quoteNumber, reason: `Müşteri yanıtı bekleniyor; teklifin geçerliliği ${days === 0 ? 'bugün' : `${days} gün içinde`} sona eriyor.`, date: quote.validUntil, href: `/dashboard/satis/teklifler/${quote.id}`, action: 'Teklifi aç' })
    else if (['sent','viewed'].includes(quote.status)) rows.push({ id: `quote-response:${quote.id}`, kind: 'quote_response', priority: 7, title: quote.quoteNumber, reason: `Teklif ${quoteStatusLabels[quote.status].toLocaleLowerCase('tr-TR')} ve müşteri yanıtı bekleniyor.`, date: quote.updatedAt, href: `/dashboard/satis/teklifler/${quote.id}`, action: 'Teklifi aç' })
    if (quote.status === 'accepted' && !convertedQuotes.has(quote.id)) rows.push({ id: `accepted-quote:${quote.id}`, kind: 'accepted_quote', priority: 5, title: quote.quoteNumber, reason: 'Kabul edilmiş teklif henüz Satış Siparişine dönüştürülmedi.', date: quote.acceptedAt ?? quote.updatedAt, href: `/dashboard/satis/teklifler/${quote.id}`, action: 'Teklifi aç' })
  }
  for (const opportunity of input.opportunities) if (openOpportunity(opportunity, stages)) {
    const overdue = opportunity.nextActionAt && new Date(opportunity.nextActionAt) < now
    if (overdue || !opportunity.nextAction || !opportunity.nextActionAt) rows.push({ id: `opportunity:${opportunity.id}`, kind: 'opportunity_next_action', priority: overdue ? 1 : 4, title: opportunity.title, reason: overdue ? 'Fırsatın sonraki eylem tarihi geçti.' : 'Açık fırsat için sonraki eylem veya tarihi tanımlanmadı.', date: opportunity.nextActionAt ?? opportunity.updatedAt, href: `/dashboard/satis/firsatlar/${opportunity.id}`, action: 'Fırsatı aç' })
  }
  for (const order of input.orders) if (!order.archivedAt && isSalesOrderOpen(order.status) && ['confirmed','in_preparation','partially_fulfilled'].includes(order.status)) rows.push({ id: `order:${order.id}`, kind: 'order_fulfillment', priority: isDeliveryOverdue(order, now) ? 1 : 6, title: order.orderNumber, reason: isDeliveryOverdue(order, now) ? 'Beklenen teslim tarihi geçti ve sipariş tamamlanmadı.' : `${salesOrderStatusLabels[order.status]} sipariş karşılama takibi gerektiriyor.`, date: order.expectedDeliveryDate ?? order.updatedAt, href: `/dashboard/satis/satis-siparisleri/${order.id}`, action: 'Siparişi aç' })
  return rows.sort((a, b) => a.priority - b.priority || timestamp(a.date) - timestamp(b.date) || a.id.localeCompare(b.id))
}

export function buildWorkbenchFlow(input: WorkbenchInput): WorkbenchFlow {
  const stages = stageMap(input.stages), converted = orderQuoteIds(input.orders); const health = { healthy: 0, watch: 0, risky: 0, critical: 0, insufficient_data: 0 } satisfies Record<CustomerHealthStatus, number>
  input.health.filter(row => row.isCurrent).forEach(row => health[row.healthStatus]++)
  return { activeLeads: input.leads.filter(row => !row.archivedAt && !['converted','disqualified'].includes(row.status)).length, openOpportunities: input.opportunities.filter(row => openOpportunity(row, stages)).length, awaitingResponseQuotes: input.quotes.filter(row => !row.archivedAt && ['sent','viewed'].includes(row.status)).length, acceptedAwaitingOrder: input.quotes.filter(row => !row.archivedAt && row.status === 'accepted' && !converted.has(row.id)).length, activeOrders: input.orders.filter(row => !row.archivedAt && isSalesOrderOpen(row.status)).length, health }
}

export function buildWorkbenchTimeline(input: WorkbenchInput): WorkbenchTimelineItem[] {
  const names = partyMap(input.parties); const rows: WorkbenchTimelineItem[] = []
  input.activities.filter(row => !row.archivedAt && row.visibility !== 'private').forEach(row => rows.push({ id: `activity:${row.id}`, occurredAt: row.activityAt, label: activityLabels[row.activityType], context: 'Şirket görünür satış aktivitesi', href: '/dashboard/satis/aktiviteler' }))
  input.quotes.filter(row => !row.archivedAt).forEach(row => rows.push({ id: `quote:${row.id}`, occurredAt: row.updatedAt, label: `${row.quoteNumber} · ${quoteStatusLabels[row.status]}`, context: names.get(row.partyId) ?? 'Firma', href: `/dashboard/satis/teklifler/${row.id}` }))
  input.orders.filter(row => !row.archivedAt).forEach(row => rows.push({ id: `order:${row.id}`, occurredAt: row.updatedAt, label: `${row.orderNumber} · ${salesOrderStatusLabels[row.status]}`, context: names.get(row.partyId) ?? 'Firma', href: `/dashboard/satis/satis-siparisleri/${row.id}` }))
  input.health.filter(row => row.isCurrent).forEach(row => rows.push({ id: `health:${row.id}`, occurredAt: row.evaluatedAt, label: `Müşteri Sağlığı · ${healthLabels[row.healthStatus]}`, context: names.get(row.partyId) ?? 'Firma', href: `/dashboard/satis/musteri-sagligi/${row.partyId}` }))
  input.leads.filter(row => !row.archivedAt).forEach(row => rows.push({ id: `lead:${row.id}`, occurredAt: row.updatedAt, label: `Potansiyel müşteri · ${leadDisplayName(row)}`, context: row.status === 'converted' ? 'Dönüştürüldü' : 'Güncellendi', href: `/dashboard/satis/potansiyel-musteriler/${row.id}` }))
  return rows.sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt) || a.id.localeCompare(b.id)).slice(0, 10)
}

export const pendingQuoteApprovals = (quotes: SalesQuote[]) => quotes.filter(row => !row.archivedAt && row.status === 'pending_approval').sort((a, b) => timestamp(a.updatedAt) - timestamp(b.updatedAt) || a.id.localeCompare(b.id))
