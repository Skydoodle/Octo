import type { DataCoverageSnapshot } from '../../../coverage/dataCoverage'
import type {
  ReasoningCase,
  ReasoningConfidence,
  ReasoningDomain,
  ReasoningSeverity,
  ReasoningSignal,
} from '../../../reasoning/types'
import {
  calendarDaysBetween,
  dateOnlyFromLocalDate,
  dateOnlyToEpochMs,
  isDateOnly,
} from '../../../shared/dateOnly'

export const domainLabels: Record<ReasoningDomain, string> = {
  finance: 'Finans',
  tax: 'Vergi',
  hr: 'İnsan & Bordro',
  operations: 'Operasyon',
  sales: 'Satış',
  legal: 'Hukuk',
  audit: 'Denetim',
}

export const severityLabels: Record<ReasoningSeverity, string> = {
  critical: 'Kritik',
  warning: 'Dikkat',
  info: 'Bilgi',
}

export const confidenceLabels: Record<ReasoningConfidence, string> = {
  high: 'Yüksek güven',
  medium: 'Orta güven',
  low: 'Düşük güven',
}

export interface OwnerInsightViewModel extends ReasoningCase {
  eventDate?: string
  timeLabel?: string
  actionability: boolean
  confidenceExplanation: string
  confidenceRepairAction?: string
}

export interface BusinessStatusViewModel {
  tone: 'critical' | 'warning' | 'stable' | 'insufficient'
  message: string
  attentionCount: number
}

function validDates(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => isDateOnly(value)).sort()
}

export function relevantDate(reasoningCase: ReasoningCase): string | undefined {
  return validDates([
    reasoningCase.horizonStart,
    ...reasoningCase.signals.map(signal => signal.eventDate),
    reasoningCase.horizonEnd,
  ])[0]
}

export function buildConfidenceExplanation(reasoningCase: ReasoningCase): {
  explanation: string
  repairAction?: string
} {
  const uncertainSignals = reasoningCase.signals.filter(signal => signal.confidence !== 'high')
  const firstMissing = reasoningCase.missingData[0]

  if (reasoningCase.confidence === 'high') {
    return {
      explanation: 'İlgili tutar ve tarihler doğrudan yapılandırılmış kaynak kayıtlara dayanıyor.',
      repairAction: firstMissing
        ? `Sonucu daha da güçlendirmek için doğrulayın: ${firstMissing}`
        : undefined,
    }
  }

  if (reasoningCase.confidence === 'medium') {
    return {
      explanation: uncertainSignals.length > 0
        ? `${uncertainSignals.length} sinyal türetilmiş veya ek doğrulama gerektiriyor.`
        : 'Sonuç yapılandırılmış kayıtlara dayanıyor ancak bazı girdiler ek doğrulama gerektiriyor.',
      repairAction: firstMissing
        ? `Güveni artırmak için doğrulayın: ${firstMissing}`
        : 'Kaynak kayıtlardaki tarih ve tutarları doğrulayın.',
    }
  }

  return {
    explanation: firstMissing
      ? `Sonucu değiştirebilecek eksik bilgi var: ${firstMissing}`
      : 'Bir veya daha fazla temel sinyal düşük güvenle değerlendirildi.',
    repairAction: firstMissing
      ? `Güveni artırmak için tamamlayın: ${firstMissing}`
      : 'Kaynak kayıtlardaki eksik tarih, tutar veya bağlantıları tamamlayın.',
  }
}

function timeLabel(eventDate: string | undefined, now: Date): string | undefined {
  if (!eventDate) return undefined
  const days = calendarDaysBetween(dateOnlyFromLocalDate(now), eventDate)
  if (days === null) return undefined
  if (days < 0) return `${Math.abs(days)} gün gecikti`
  if (days === 0) return 'Bugün'
  return `${days} gün kaldı`
}

export function buildOwnerInsightViewModel(
  reasoningCase: ReasoningCase,
  now = new Date(),
): OwnerInsightViewModel {
  const eventDate = relevantDate(reasoningCase)
  const confidence = buildConfidenceExplanation(reasoningCase)
  return {
    ...reasoningCase,
    eventDate,
    timeLabel: timeLabel(eventDate, now),
    actionability: reasoningCase.recommendation.trim().length > 0,
    confidenceExplanation: confidence.explanation,
    confidenceRepairAction: confidence.repairAction,
  }
}

const severityRank: Record<ReasoningSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const confidenceRank: Record<ReasoningConfidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function dateRank(item: OwnerInsightViewModel): number {
  return item.eventDate ? (dateOnlyToEpochMs(item.eventDate) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY
}

export function rankOwnerInsights(items: OwnerInsightViewModel[]): OwnerInsightViewModel[] {
  return [...items].sort((a, b) =>
    severityRank[a.severity] - severityRank[b.severity] ||
    dateRank(a) - dateRank(b) ||
    Number(b.actionability) - Number(a.actionability) ||
    b.domains.length - a.domains.length ||
    confidenceRank[a.confidence] - confidenceRank[b.confidence] ||
    a.id.localeCompare(b.id),
  )
}

export function buildAttentionQueue(
  cases: ReasoningCase[],
  now = new Date(),
  limit = 3,
): OwnerInsightViewModel[] {
  return rankOwnerInsights(cases.map(item => buildOwnerInsightViewModel(item, now))).slice(0, limit)
}

function nextEventDays(signals: ReasoningSignal[], now: Date): number | null {
  const today = dateOnlyFromLocalDate(now)
  const days = signals
    .filter(signal => signal.kind !== 'cash_position' && isDateOnly(signal.eventDate))
    .map(signal => calendarDaysBetween(today, signal.eventDate as string))
    .filter((value): value is number => value !== null && value >= 0)
    .sort((a, b) => a - b)
  return days[0] ?? null
}

export function deriveBusinessStatus(
  cases: ReasoningCase[],
  coverage: DataCoverageSnapshot,
  signals: ReasoningSignal[],
  now = new Date(),
): BusinessStatusViewModel {
  const criticalCount = cases.filter(item => item.severity === 'critical').length
  const warningCount = cases.filter(item => item.severity === 'warning').length
  const missingDomains = coverage.domains.filter(domain => domain.status === 'missing')
  const financeMissing = missingDomains.some(domain => domain.domain === 'finance')

  if (criticalCount > 0) {
    const hasCriticalLiquidityWindow = cases.some(item =>
      item.severity === 'critical' && item.ruleId === 'liquidity-window-collision',
    )
    return {
      tone: 'critical',
      message: hasCriticalLiquidityWindow
        ? 'Önümüzdeki 30 gün içinde nakit açısından müdahale gerektiren bir dönem var.'
        : 'İşletmenizde müdahale gerektiren önemli bir konu var.',
      attentionCount: criticalCount + warningCount,
    }
  }

  if (financeMissing || missingDomains.length >= 2 || signals.length === 0) {
    const missingActionCount = coverage.domains.reduce((sum, domain) => sum + domain.missingActions.length, 0)
    return {
      tone: 'insufficient',
      message: `Octo henüz işletmenin tamamını değerlendiremiyor. ${missingActionCount || missingDomains.length} bilgi tamamlandığında görünüm güçlenecek.`,
      attentionCount: warningCount,
    }
  }

  if (warningCount > 0) {
    return {
      tone: 'warning',
      message: `İşletmeniz genel olarak dengede. Bugün gözden geçirmeniz gereken ${warningCount} konu var.`,
      attentionCount: warningCount,
    }
  }

  const nextDays = nextEventDays(signals, now)
  if (missingDomains.length > 0) {
    return {
      tone: 'stable',
      message: `Kayıtlı verilerde bugün acil bir konu yok. ${missingDomains.map(domain => domain.label).join(', ')} henüz değerlendirilemiyor.`,
      attentionCount: 0,
    }
  }

  return {
    tone: 'stable',
    message: nextDays === null
      ? 'Bugün acil bir konu yok. Yeni yükümlülükler eklendiğinde burada önceliklendirilecek.'
      : nextDays === 0
        ? 'Bugün acil bir konu yok. Bugün tarihli kayıtlı bir yükümlülük bulunuyor.'
        : `Bugün acil bir konu yok. Önünüzdeki ilk önemli yükümlülük ${nextDays} gün sonra.`,
    attentionCount: 0,
  }
}
