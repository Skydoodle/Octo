// Octo — Legacy Insight adapter
// Dashboard UI continues to consume Insight objects, while the actual reasoning
// now runs through the canonical cross-domain engine.

import type { Insight, InsightSource } from './types'
import { runReasoningEngine } from '../../reasoning/engine'
import type { ReasoningCase, ReasoningDomain } from '../../reasoning/types'

const layerMap: Record<ReasoningDomain, InsightSource['layer']> = {
  finance: 'finans',
  tax: 'vergi',
  hr: 'ik',
  operations: 'operasyon',
  sales: 'operasyon',
  legal: 'hukuk',
  audit: 'vergi',
}

function toInsight(reasoningCase: ReasoningCase): Insight {
  return {
    id: reasoningCase.id,
    severity:
      reasoningCase.severity === 'critical'
        ? 'kritik'
        : reasoningCase.severity === 'warning'
          ? 'dikkat'
          : 'stabil',
    baslik: reasoningCase.title,
    ozet: reasoningCase.summary,
    kaynaklar: reasoningCase.sources.map(source => ({
      layer: layerMap[source.domain],
      recordType: source.recordType,
      recordId: source.recordId,
      label: source.label,
      value: source.value,
    })),
    hesaplama: reasoningCase.calculation,
    veriGuncelligi: reasoningCase.freshness,
    eksikVeri: reasoningCase.missingData,
    guven:
      reasoningCase.confidence === 'high'
        ? 'yuksek'
        : reasoningCase.confidence === 'medium'
          ? 'orta'
          : 'dusuk',
    kural: reasoningCase.rule,
    oneri: reasoningCase.recommendation,
    sorumlu: reasoningCase.owner,
  }
}

function byRule(ruleId: string): Insight | null {
  const found = runReasoningEngine().find(item => item.ruleId === ruleId)
  return found ? toInsight(found) : null
}

// Kept for compatibility with any current imports.
export function detectCashCollision(): Insight | null {
  return byRule('liquidity-window-collision')
}

export function detectOverdueReceivables(): Insight | null {
  return byRule('overdue-receivables-concentration')
}

export function detectComplianceGaps(): Insight | null {
  return byRule('compliance-gap')
}

export function runAllDetectors(): Insight[] {
  return runReasoningEngine().map(toInsight)
}
