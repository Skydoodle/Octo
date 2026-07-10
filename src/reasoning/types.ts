// Octo — Cross-domain reasoning contracts
// Existing domain stores remain the source of truth. These contracts form the
// canonical layer between operational records and deterministic reasoning.

export type ReasoningDomain =
  | 'finance'
  | 'tax'
  | 'hr'
  | 'operations'
  | 'sales'
  | 'legal'
  | 'audit'

export type SignalKind =
  | 'cash_position'
  | 'cash_inflow'
  | 'cash_outflow'
  | 'stock_risk'
  | 'demand_commitment'
  | 'production_shortage'
  | 'compliance_risk'

export type ReasoningConfidence = 'high' | 'medium' | 'low'
export type ReasoningSeverity = 'critical' | 'warning' | 'info'
export type ReasoningCurrency = 'TRY' | 'USD' | 'EUR'
export type ObligationCategory =
  | 'invoice_receivable'
  | 'invoice_payable'
  | 'tax'
  | 'salary'
  | 'sgk'
  | 'purchase_order'
  | 'production_procurement'

export interface ObligationIdentity {
  key: string
  category: ObligationCategory
  period?: string
  source: 'recorded' | 'derived' | 'forecast'
}

export interface EvidenceRef {
  domain: ReasoningDomain
  recordType: string
  recordId: string
  label: string
  value?: string
}

export interface ReasoningSignal {
  id: string
  domain: ReasoningDomain
  kind: SignalKind
  label: string
  eventDate?: string
  amount?: number
  currency?: ReasoningCurrency
  quantity?: number
  entityId?: string
  confidence: ReasoningConfidence
  evidence: EvidenceRef[]
  obligation?: ObligationIdentity
  metadata?: Record<string, string | number | boolean | null>
}

export interface ReasoningCase {
  id: string
  ruleId: string
  severity: ReasoningSeverity
  confidence: ReasoningConfidence
  title: string
  summary: string
  domains: ReasoningDomain[]
  horizonStart?: string
  horizonEnd?: string
  signals: ReasoningSignal[]
  sources: EvidenceRef[]
  calculation: string
  freshness: string
  missingData: string[]
  rule: string
  recommendation: string
  owner: string
}

export interface ReasoningSnapshot {
  generatedAt: string
  signals: ReasoningSignal[]
  cases: ReasoningCase[]
}
