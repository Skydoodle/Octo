import { describe, expect, it } from 'vitest'
import type { FinanceState } from '../../../layers/finance/financeStore'
import type { ReasoningSignal } from '../../../reasoning/types'
import type { CompanyObligationSettings } from '../../../settings/companyObligationSettings'
import { buildThirtyDayCashSummary } from './thirtyDayViewModel'

const now = new Date(2026, 6, 10, 12)
const settings: CompanyObligationSettings = { version: 1, baseCurrency: 'TRY' }

function finance(balance?: number): FinanceState {
  return {
    accounts: balance === undefined ? [] : [{ id: 'cash', name: 'Kasa', iban: '', currency: 'TRY', balance }],
    invoices: [],
    transactions: [],
  }
}

function cashSignal(overrides: Partial<ReasoningSignal> = {}): ReasoningSignal {
  return {
    id: 'event-1',
    domain: 'finance',
    kind: 'cash_outflow',
    label: 'Tedarikçi ödemesi',
    eventDate: '2026-07-15',
    amount: 30,
    currency: 'TRY',
    confidence: 'high',
    evidence: [],
    obligation: { key: 'event-1', category: 'invoice_payable', source: 'recorded' },
    ...overrides,
  }
}

describe('30-day cash summary', () => {
  it('calculates a normal positive horizon from structured cash events', () => {
    const result = buildThirtyDayCashSummary(now, [
      cashSignal(),
      cashSignal({ id: 'in', kind: 'cash_inflow', amount: 50, eventDate: '2026-07-12' }),
    ], finance(100), settings)

    expect(result.currentCash).toBe(100)
    expect(result.expectedInflows).toBe(50)
    expect(result.knownOutflows).toBe(30)
    expect(result.lowestProjectedBalance).toBe(100)
    expect(result.state).toBe('ready')
  })

  it('finds the future negative point and its exact date', () => {
    const result = buildThirtyDayCashSummary(now, [cashSignal({ amount: 150 })], finance(100), settings)
    expect(result.lowestProjectedBalance).toBe(-50)
    expect(result.lowestProjectedDate).toBe('2026-07-15')
  })

  it('orders same-day outflows before inflows conservatively', () => {
    const result = buildThirtyDayCashSummary(now, [
      cashSignal({ id: 'in', kind: 'cash_inflow', amount: 100 }),
      cashSignal({ id: 'out', amount: 150 }),
    ], finance(100), settings)
    expect(result.events.map(event => event.id)).toEqual(['out', 'in'])
    expect(result.lowestProjectedBalance).toBe(-50)
  })

  it('excludes missing dates without inventing one', () => {
    const result = buildThirtyDayCashSummary(now, [cashSignal({ eventDate: undefined })], finance(100), settings)
    expect(result.events).toHaveLength(0)
    expect(result.excluded[0]?.reason).toBe('missing_date')
    expect(result.state).toBe('partial')
  })

  it('excludes foreign currency without conversion', () => {
    const result = buildThirtyDayCashSummary(now, [cashSignal({ currency: 'USD' })], finance(100), settings)
    expect(result.events).toHaveLength(0)
    expect(result.excluded[0]?.reason).toBe('foreign_currency')
  })

  it('returns an honest no-data state', () => {
    const result = buildThirtyDayCashSummary(now, [], finance(), settings)
    expect(result.state).toBe('no_data')
    expect(result.currentCash).toBeNull()
    expect(result.lowestProjectedBalance).toBeNull()
  })
})
