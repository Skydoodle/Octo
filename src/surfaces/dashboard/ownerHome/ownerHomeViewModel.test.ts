import { describe, expect, it } from 'vitest'
import type { DataCoverageSnapshot } from '../../../coverage/dataCoverage'
import type { ReasoningCase, ReasoningSignal } from '../../../reasoning/types'
import {
  buildAttentionQueue,
  buildConfidenceExplanation,
  deriveBusinessStatus,
  rankOwnerInsights,
  buildOwnerInsightViewModel,
} from './ownerHomeViewModel'

const now = new Date(2026, 6, 10, 12)

function signal(overrides: Partial<ReasoningSignal> = {}): ReasoningSignal {
  return {
    id: 'signal-1',
    domain: 'finance',
    kind: 'cash_outflow',
    label: 'Ödeme',
    eventDate: '2026-07-20',
    amount: 100,
    currency: 'TRY',
    confidence: 'high',
    evidence: [],
    ...overrides,
  }
}

function reasoningCase(overrides: Partial<ReasoningCase> = {}): ReasoningCase {
  return {
    id: 'case-1',
    ruleId: 'rule-1',
    severity: 'warning',
    confidence: 'high',
    title: 'Kayıtlı risk',
    summary: 'Kayıtlı açıklama',
    domains: ['finance'],
    signals: [signal()],
    sources: [],
    calculation: '100 - 50 = 50',
    freshness: 'az önce',
    missingData: [],
    rule: 'Kural',
    recommendation: 'Kaydı doğrulayın.',
    owner: 'Finans',
    ...overrides,
  }
}

function coverage(statuses: Array<'ready' | 'partial' | 'missing'>): DataCoverageSnapshot {
  const domains = ['finance', 'tax', 'hr', 'operations'] as const
  return {
    generatedAt: now.toISOString(),
    domains: domains.map((domain, index) => ({
      domain,
      label: domain,
      status: statuses[index] ?? 'ready',
      explanation: 'Açıklama',
      missingActions: statuses[index] === 'ready' ? [] : ['Bilgiyi ekleyin.'],
      freshness: 'az önce',
      availableCapabilities: [],
      blockedCapabilities: [],
    })),
  }
}

describe('owner insight ranking', () => {
  it('ranks severity before confidence and keeps low-confidence critical risks visible', () => {
    const criticalLow = buildOwnerInsightViewModel(reasoningCase({ id: 'critical', severity: 'critical', confidence: 'low' }), now)
    const warningHigh = buildOwnerInsightViewModel(reasoningCase({ id: 'warning', severity: 'warning', confidence: 'high' }), now)

    expect(rankOwnerInsights([warningHigh, criticalLow]).map(item => item.id)).toEqual(['critical', 'warning'])
  })

  it('uses date, actionability, domain count, and confidence as deterministic tie-breakers', () => {
    const cases = [
      reasoningCase({ id: 'late', horizonStart: '2026-07-25' }),
      reasoningCase({ id: 'early', horizonStart: '2026-07-12' }),
      reasoningCase({ id: 'early-no-action', horizonStart: '2026-07-12', recommendation: '' }),
    ]
    expect(buildAttentionQueue(cases, now).map(item => item.id)).toEqual(['early', 'early-no-action', 'late'])
  })

  it('limits the Bugün queue to three grouped reasoning cases', () => {
    const cases = Array.from({ length: 5 }, (_, index) => reasoningCase({ id: `case-${index}` }))
    expect(buildAttentionQueue(cases, now)).toHaveLength(3)
  })
})

describe('business status', () => {
  it('derives a critical status from a critical case even when coverage is partial', () => {
    const status = deriveBusinessStatus(
      [reasoningCase({ severity: 'critical' })],
      coverage(['partial', 'ready', 'ready', 'ready']),
      [signal()],
      now,
    )
    expect(status.tone).toBe('critical')
  })

  it('does not claim stability when the business cannot be evaluated', () => {
    const status = deriveBusinessStatus([], coverage(['missing', 'missing', 'missing', 'missing']), [], now)
    expect(status.tone).toBe('insufficient')
    expect(status.message).toContain('henüz işletmenin tamamını değerlendiremiyor')
  })

  it('shows the next obligation in a stable, fully covered state', () => {
    const status = deriveBusinessStatus([], coverage(['ready', 'ready', 'ready', 'ready']), [signal()], now)
    expect(status.tone).toBe('stable')
    expect(status.message).toContain('10 gün sonra')
  })
})

describe('confidence explanation', () => {
  it('keeps confidence separate and provides a repair action for missing data', () => {
    const confidence = buildConfidenceExplanation(reasoningCase({
      confidence: 'low',
      missingData: ['Güncel banka bakiyesi gerekli.'],
    }))
    expect(confidence.explanation).toContain('Güncel banka bakiyesi')
    expect(confidence.repairAction).toContain('tamamlayın')
  })
})
