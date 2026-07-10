// Octo — Reasoning-aware orchestrator
// Deterministic engine first; LLM narration second. The model receives verified
// cases and is explicitly forbidden from inventing calculations or obligations.

import { buildReasoningSnapshot } from '../reasoning/engine'
import type { ReasoningCase, ReasoningDomain, ReasoningSeverity } from '../reasoning/types'

export type Aciliyet = 'kritik' | 'dikkat' | 'stabil' | 'notr'

export interface BriefingKol {
  kol: string
  aciliyet: Aciliyet
  metin: string
}

export interface Briefing {
  ozet: string
  kollar: BriefingKol[]
}

const domainLabels: Record<ReasoningDomain, string> = {
  finance: 'Finans',
  tax: 'Vergi',
  hr: 'İK',
  operations: 'Operasyon',
  sales: 'Satış',
  legal: 'Hukuk',
  audit: 'Denetim',
}

function urgency(severity: ReasoningSeverity): Aciliyet {
  if (severity === 'critical') return 'kritik'
  if (severity === 'warning') return 'dikkat'
  return 'stabil'
}

function caseLabel(item: ReasoningCase): string {
  return item.domains.map(domain => domainLabels[domain]).join(' + ')
}

export function buildDeterministicBriefing(now = new Date()): Briefing {
  const snapshot = buildReasoningSnapshot(now)
  if (snapshot.signals.length === 0) return { ozet: '', kollar: [] }
  if (snapshot.cases.length === 0) {
    return {
      ozet: 'Kayıtlı verilerde mevcut deterministik kuralların kapsadığı bir vaka tespit edilmedi.',
      kollar: [],
    }
  }

  const top = snapshot.cases.slice(0, 4)
  return {
    ozet: top[0].summary,
    kollar: top.map(item => ({
      kol: caseLabel(item),
      aciliyet: urgency(item.severity),
      metin: `${item.summary} Öneri: ${item.recommendation}`,
    })),
  }
}

export function buildContext(now = new Date()): string {
  const snapshot = buildReasoningSnapshot(now)
  return JSON.stringify({
    generatedAt: snapshot.generatedAt,
    instruction: 'Only narrate the verified cases below. Never add a number, deadline, rule or recommendation not present in a case.',
    verifiedCases: snapshot.cases.map(item => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      confidence: item.confidence,
      domains: item.domains,
      summary: item.summary,
      calculation: item.calculation,
      freshness: item.freshness,
      missingData: item.missingData,
      rule: item.rule,
      recommendation: item.recommendation,
      owner: item.owner,
      horizonStart: item.horizonStart,
      horizonEnd: item.horizonEnd,
      sources: item.sources,
    })),
  }, null, 2)
}

// Client-side model calls are intentionally disabled: a VITE_* key is public,
// and free-form model text cannot be proven to contain only verified claims.
// A future backend narrator may consume buildContext(), but the browser always
// renders deterministic case text and recommendations.
export async function generateBriefing(now = new Date()): Promise<Briefing> {
  return buildDeterministicBriefing(now)
}
