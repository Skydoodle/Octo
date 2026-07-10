import type { FinanceState } from '../../../layers/finance/financeStore'
import type { ReasoningSignal } from '../../../reasoning/types'
import type { CompanyObligationSettings } from '../../../settings/companyObligationSettings'
import {
  addDateOnlyDays,
  calendarDaysBetween,
  dateOnlyFromLocalDate,
  isDateOnly,
} from '../../../shared/dateOnly'

export type ThirtyDayEventCertainty = 'confirmed' | 'expected'
export type ThirtyDayExclusionReason = 'foreign_currency' | 'missing_date' | 'invalid_amount'

export interface ThirtyDayCashEvent {
  id: string
  date: string
  originalDate?: string
  label: string
  direction: 'inflow' | 'outflow'
  amount: number
  currency: CompanyObligationSettings['baseCurrency']
  certainty: ThirtyDayEventCertainty
  sourceType: 'Kayıt' | 'Türetilmiş' | 'Tahmin'
  domain: ReasoningSignal['domain']
  balance: number | null
}

export interface ThirtyDayExcludedItem {
  id: string
  label: string
  reason: ThirtyDayExclusionReason
  detail: string
}

export interface ThirtyDayCashSummary {
  startDate: string
  endDate: string
  currency: CompanyObligationSettings['baseCurrency']
  currentCash: number | null
  expectedInflows: number
  knownOutflows: number
  lowestProjectedBalance: number | null
  lowestProjectedDate: string | null
  events: ThirtyDayCashEvent[]
  excluded: ThirtyDayExcludedItem[]
  state: 'ready' | 'partial' | 'no_data'
}

export interface ThirtyDayTimelineEvent {
  id: string
  date: string
  label: string
  domain: ReasoningSignal['domain']
  effect: 'inflow' | 'outflow' | 'operational'
  amount?: number
  currency?: ReasoningSignal['currency']
  certainty: ThirtyDayEventCertainty
  sourceType: ThirtyDayCashEvent['sourceType']
}

function sourceType(signal: ReasoningSignal): ThirtyDayCashEvent['sourceType'] {
  if (signal.obligation?.source === 'forecast') return 'Tahmin'
  if (signal.obligation?.source === 'derived') return 'Türetilmiş'
  return 'Kayıt'
}

function certainty(signal: ReasoningSignal): ThirtyDayEventCertainty {
  if (signal.kind === 'cash_inflow') return 'expected'
  return signal.obligation?.source === 'recorded' && signal.confidence !== 'low'
    ? 'confirmed'
    : 'expected'
}

function validAmount(signal: ReasoningSignal): number | null {
  return typeof signal.amount === 'number' && Number.isFinite(signal.amount) && signal.amount > 0
    ? signal.amount
    : null
}

function currentCash(finance: FinanceState, currency: CompanyObligationSettings['baseCurrency']): number | null {
  const accounts = finance.accounts.filter(account => account.currency === currency && Number.isFinite(account.balance))
  if (accounts.length === 0) return null
  const total = accounts.reduce((sum, account) => sum + account.balance, 0)
  return Number.isFinite(total) ? total : null
}

function eventSort(a: Omit<ThirtyDayCashEvent, 'balance'>, b: Omit<ThirtyDayCashEvent, 'balance'>): number {
  return a.date.localeCompare(b.date) ||
    (a.direction === b.direction ? 0 : a.direction === 'outflow' ? -1 : 1) ||
    a.id.localeCompare(b.id)
}

export function buildThirtyDayCashSummary(
  now: Date,
  signals: ReasoningSignal[],
  finance: FinanceState,
  settings: CompanyObligationSettings,
): ThirtyDayCashSummary {
  const startDate = dateOnlyFromLocalDate(now)
  const endDate = addDateOnlyDays(startDate, 30) as string
  const baseCurrency = settings.baseCurrency
  const excluded: ThirtyDayExcludedItem[] = []
  const candidates: Array<Omit<ThirtyDayCashEvent, 'balance'>> = []

  for (const signal of signals) {
    if (signal.kind !== 'cash_inflow' && signal.kind !== 'cash_outflow') continue
    if (!isDateOnly(signal.eventDate)) {
      excluded.push({
        id: signal.id,
        label: signal.label,
        reason: 'missing_date',
        detail: 'Teyit edilmiş olay veya ödeme tarihi bulunmuyor.',
      })
      continue
    }

    const days = calendarDaysBetween(startDate, signal.eventDate)
    if (days === null || days > 30) continue
    if (days < 0 && signal.kind === 'cash_inflow') continue
    const amount = validAmount(signal)
    if (amount === null) {
      excluded.push({
        id: signal.id,
        label: signal.label,
        reason: 'invalid_amount',
        detail: 'Geçerli, pozitif bir yapılandırılmış tutar bulunmuyor.',
      })
      continue
    }
    if (signal.currency !== baseCurrency) {
      excluded.push({
        id: signal.id,
        label: signal.label,
        reason: 'foreign_currency',
        detail: `${signal.currency ?? 'Para birimi bilinmeyen'} kayıt için tarihli kur kaynağı yok.`,
      })
      continue
    }

    const effectiveDate = days < 0 ? startDate : signal.eventDate
    candidates.push({
      id: signal.id,
      date: effectiveDate,
      originalDate: effectiveDate === signal.eventDate ? undefined : signal.eventDate,
      label: signal.label,
      direction: signal.kind === 'cash_inflow' ? 'inflow' : 'outflow',
      amount,
      currency: baseCurrency,
      certainty: certainty(signal),
      sourceType: sourceType(signal),
      domain: signal.domain,
    })
  }

  const cash = currentCash(finance, baseCurrency)
  let running = cash
  let lowest = cash
  let lowestDate = cash === null ? null : startDate
  const events: ThirtyDayCashEvent[] = candidates.sort(eventSort).map(event => {
    if (running !== null) {
      running += event.direction === 'inflow' ? event.amount : -event.amount
      if (lowest === null || running < lowest) {
        lowest = running
        lowestDate = event.date
      }
    }
    return { ...event, balance: running }
  })

  const expectedInflows = events
    .filter(event => event.direction === 'inflow')
    .reduce((sum, event) => sum + event.amount, 0)
  const knownOutflows = events
    .filter(event => event.direction === 'outflow')
    .reduce((sum, event) => sum + event.amount, 0)
  const hasRelevantData = cash !== null || events.length > 0

  return {
    startDate,
    endDate,
    currency: baseCurrency,
    currentCash: cash,
    expectedInflows,
    knownOutflows,
    lowestProjectedBalance: lowest,
    lowestProjectedDate: lowestDate,
    events,
    excluded,
    state: !hasRelevantData ? 'no_data' : cash === null || excluded.length > 0 ? 'partial' : 'ready',
  }
}

export function buildThirtyDayTimeline(
  now: Date,
  signals: ReasoningSignal[],
): ThirtyDayTimelineEvent[] {
  const startDate = dateOnlyFromLocalDate(now)
  return signals
    .filter(signal => signal.kind !== 'cash_position' && isDateOnly(signal.eventDate))
    .filter(signal => {
      const days = calendarDaysBetween(startDate, signal.eventDate as string)
      return days !== null && days >= 0 && days <= 30
    })
    .map(signal => ({
      id: signal.id,
      date: signal.eventDate as string,
      label: signal.label,
      domain: signal.domain,
      effect: signal.kind === 'cash_inflow'
        ? 'inflow' as const
        : signal.kind === 'cash_outflow'
          ? 'outflow' as const
          : 'operational' as const,
      amount: validAmount(signal) ?? undefined,
      currency: signal.currency,
      certainty: certainty(signal),
      sourceType: sourceType(signal),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}
