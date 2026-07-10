import type { Transaction, CashProjectionDay } from '../types'
import { addDateOnlyDays, dateOnlyFromLocalDate } from '../../../shared/dateOnly'

export function calculateCashProjection(
  currentBalance: number,
  transactions: Transaction[],
  knownOutflows: { date: string; amount: number; description: string }[] = [],
  now = new Date(),
): CashProjectionDay[] {
  const projection: CashProjectionDay[] = []
  let runningBalance = currentBalance

  for (let i = 0; i < 30; i++) {
    const dateStr = addDateOnlyDays(dateOnlyFromLocalDate(now), i)
    if (!dateStr) continue

    // known inflows from existing transactions pattern
    const avgDailyInflow = transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0) / 30

    // known outflows for this specific date
    const scheduledOutflows = knownOutflows
      .filter(o => o.date === dateStr)
      .reduce((sum, o) => sum + o.amount, 0)

    const inflow = Math.round(avgDailyInflow)
    const outflow = scheduledOutflows

    runningBalance = runningBalance + inflow - outflow

    projection.push({
      date: dateStr,
      inflow,
      outflow,
      balance: runningBalance,
    })
  }

  return projection
}

// Upcoming obligations. In the real system these are derived from the Tax
// layer's beyannameler (unpaid, future deadlines). The hardcoded demo set is
// only used when DEMO_MODE is on, so production reflects real data only.
import { isDemoMode } from '../../../shared/config'
import { buildReasoningSignals } from '../../../reasoning/signalAdapters'
import { getCompanyObligationSettings } from '../../../settings/companyObligationSettings'

export interface Obligation {
  date: string
  amount: number
  description: string
}

const demoObligations: Obligation[] = [
  { date: '2026-05-26', amount: 228300, description: 'KDV Beyannamesi' },
  { date: '2026-05-30', amount: 142800, description: 'SGK Prim Ödemesi' },
  { date: '2026-05-25', amount: 5040, description: 'Ofis malzemeleri ödemesi' },
  { date: '2026-05-31', amount: 10200, description: 'Bulut hizmetleri' },
  { date: '2026-06-10', amount: 54000, description: 'Haziran kirası' },
  { date: '2026-06-15', amount: 14400, description: 'Hukuk bürosu' },
  { date: '2026-06-26', amount: 228300, description: 'KDV Beyannamesi' },
  { date: '2026-06-30', amount: 142800, description: 'SGK Prim Ödemesi' },
]

// Live obligations from real tax records (unpaid beyannameler with their deadlines).
export function getKnownObligations(now = new Date()): Obligation[] {
  const baseCurrency = getCompanyObligationSettings().baseCurrency
  const obligations = buildReasoningSignals(now)
    .filter(signal => signal.kind === 'cash_outflow' && signal.currency === baseCurrency && signal.eventDate)
    .filter(signal => typeof signal.amount === 'number' && Number.isFinite(signal.amount) && signal.amount > 0)
    .map(signal => ({
      date: signal.eventDate as string,
      amount: signal.amount as number,
      description: signal.label,
    }))
  if (obligations.length > 0) return obligations
  // No real data: show demo obligations only in demo mode, otherwise nothing.
  return isDemoMode() ? demoObligations : []
}
