import type { BusinessParty } from '../../crm/types'
import type { CustomerHealthAssessment, CustomerHealthCurrencyContext, CustomerHealthEvidence, CustomerHealthFactor, CustomerHealthFactorCode, CustomerHealthStatus } from '../types'
import { healthOrder } from '../customerHealthViewModel'

export const persistentMethodology = 'Bu değerlendirme yapılandırılmış ticari kayıtlara ve açıklanabilir kurallara dayanır. Müşteri kaybı olasılığı veya gelir kaybı tahmini değildir.'

export const factorLabels: Record<CustomerHealthFactorCode, string> = {
  overdue_receivable: 'Vadesi geçmiş alacak', late_payment_pattern: 'Tekrarlayan geç ödeme', order_inactivity: 'Sipariş hareketsizliği', order_value_decline: 'Sipariş değerinde düşüş', quote_outcome_deterioration: 'Teklif sonuçlarında bozulma', relationship_inactivity: 'İlişki hareketsizliği', recent_completed_order: 'Yakın tarihli tamamlanan sipariş', recent_customer_activity: 'Yakın tarihli müşteri aktivitesi', reliable_payment_pattern: 'Düzenli ödeme geçmişi', recent_accepted_quote: 'Yakın tarihli kabul edilmiş teklif',
}
export const sourceLabels = { sales_activity: 'Satış aktivitesi', sales_quote: 'Teklif', sales_order: 'Satış siparişi', finance_invoice: 'Fatura', finance_payment: 'Tahsilat' } as const
export const domainLabels = { sales: 'Satış', finance: 'Finans', relationship: 'İlişki' } as const

export interface CustomerHealthRow { party: BusinessParty; assessment: CustomerHealthAssessment | null; factors: CustomerHealthFactor[]; contexts: CustomerHealthCurrencyContext[] }
export interface HealthFilters { search?: string; status?: CustomerHealthStatus | 'unassessed' | ''; sufficiency?: string; confidence?: string; today?: 'today' | 'not_today' | ''; factor?: CustomerHealthFactorCode | ''; currency?: string }

export function eligibleCustomerParties(parties: BusinessParty[]) { return parties.filter(party => !party.archivedAt && party.relationshipStatus === 'active' && party.roles.includes('customer')) }
export function mergeCustomerHealth(parties: BusinessParty[], assessments: CustomerHealthAssessment[], factors: CustomerHealthFactor[] = [], contexts: CustomerHealthCurrencyContext[] = []): CustomerHealthRow[] {
  const current = new Map(assessments.filter(row => row.isCurrent).map(row => [row.partyId, row]))
  return eligibleCustomerParties(parties).map(party => { const assessment = current.get(party.id) ?? null; return { party, assessment, factors: assessment ? factors.filter(f => f.assessmentId === assessment.id) : [], contexts: assessment ? contexts.filter(c => c.assessmentId === assessment.id) : [] } })
}
export function healthPriority(row: CustomerHealthRow) { return row.assessment ? healthOrder[row.assessment.healthStatus] : 3.5 }
export function filterHealthRows(rows: CustomerHealthRow[], filters: HealthFilters, today = new Date().toISOString().slice(0, 10)) {
  const query = filters.search?.trim().toLocaleLowerCase('tr-TR')
  return rows.filter(row => {
    if (query && !row.party.displayName.toLocaleLowerCase('tr-TR').includes(query)) return false
    if (filters.status === 'unassessed' && row.assessment) return false
    if (filters.status && filters.status !== 'unassessed' && row.assessment?.healthStatus !== filters.status) return false
    if (filters.sufficiency && row.assessment?.dataSufficiency !== filters.sufficiency) return false
    if (filters.confidence && row.assessment?.confidence !== filters.confidence) return false
    if (filters.today === 'today' && row.assessment?.evaluatedOn !== today) return false
    if (filters.today === 'not_today' && row.assessment?.evaluatedOn === today) return false
    if (filters.factor && !row.factors.some(f => f.factorCode === filters.factor && f.direction === 'negative')) return false
    if (filters.currency && !row.contexts.some(c => c.currency === filters.currency)) return false
    return true
  })
}
export function sortHealthRows(rows: CustomerHealthRow[], sort: 'health' | 'name' | 'oldest' | 'newest' = 'health') { return [...rows].sort((a, b) => sort === 'name' ? a.party.displayName.localeCompare(b.party.displayName, 'tr') : sort === 'oldest' ? (a.assessment?.evaluatedOn ?? '9999').localeCompare(b.assessment?.evaluatedOn ?? '9999') : sort === 'newest' ? (b.assessment?.evaluatedOn ?? '').localeCompare(a.assessment?.evaluatedOn ?? '') : healthPriority(a) - healthPriority(b) || a.party.displayName.localeCompare(b.party.displayName, 'tr')) }
export const negativeFactors = (factors: CustomerHealthFactor[]) => factors.filter(f => f.direction === 'negative').sort((a, b) => (a.severity === 'critical' ? 0 : a.severity === 'warning' ? 1 : 2) - (b.severity === 'critical' ? 0 : b.severity === 'warning' ? 1 : 2) || (b.observedAt ?? '').localeCompare(a.observedAt ?? '') || a.id.localeCompare(b.id))
export const positiveFactors = (factors: CustomerHealthFactor[]) => factors.filter(f => f.direction === 'positive')
export const groupEvidence = (evidence: CustomerHealthEvidence[]) => evidence.reduce<Record<string, CustomerHealthEvidence[]>>((groups, row) => { (groups[row.factorId] ??= []).push(row); groups[row.factorId].sort((a, b) => (b.observedAt ?? b.createdAt).localeCompare(a.observedAt ?? a.createdAt)); return groups }, {})
export const batchPartyIds = (ids: string[], size = 200) => Array.from({ length: Math.ceil(ids.length / size) }, (_, index) => ids.slice(index * size, (index + 1) * size))
export const sourceRoute = (evidence: CustomerHealthEvidence) => evidence.sourceType === 'sales_quote' ? `/dashboard/satis/teklifler/${evidence.sourceId}` : evidence.sourceType === 'sales_order' ? `/dashboard/satis/satis-siparisleri/${evidence.sourceId}` : evidence.sourceType === 'finance_invoice' ? `/dashboard/finans/faturalar/${evidence.sourceId}` : evidence.sourceType === 'finance_payment' ? `/dashboard/finans/tahsilatlar/${evidence.sourceId}` : null
export const isEvaluatedToday = (assessment: CustomerHealthAssessment, today = new Date().toISOString().slice(0, 10)) => assessment.evaluatedOn === today
