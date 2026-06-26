import type { Transaction, CashProjectionDay } from '../types'

export function calculateCashProjection(
  currentBalance: number,
  transactions: Transaction[],
  knownOutflows: { date: string; amount: number; description: string }[] = []
): CashProjectionDay[] {
  const projection: CashProjectionDay[] = []
  let runningBalance = currentBalance

  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

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
import { getTaxState } from '../../tax/taxStore'
import { beyannameLabels } from '../../tax/types'
import { isDemoMode } from '../../../shared/config'
import { buBordroDonemi } from '../../hr/hrStore'
import { acikAlisSiparisYukumlulukleri } from '../../operations/opStore'

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
export function getKnownObligations(): Obligation[] {
  const tax = getTaxState()
  const real = tax.beyannameler
    .filter(b => b.status !== 'odendi' && b.status !== 'gonderildi')
    .map(b => ({
      date: b.sonTarih,
      amount: b.hesaplananVergi,
      description: beyannameLabels[b.type],
    }))

  // İK payroll: the monthly net-salary outflow is a real, recurring cash
  // obligation. This is what collides with KDV/SGK deadlines in the orchestrator
  // — the flagship cross-arm signal, now driven by real personnel data.
  const payroll = getPayrollObligations()

  // Operasyon: open purchase orders are future cash outflows.
  const purchaseOrders = getPurchaseObligations()

  const combined = [...real, ...payroll, ...purchaseOrders]
  if (combined.length > 0) return combined
  // No real data: show demo obligations only in demo mode, otherwise nothing.
  return isDemoMode() ? demoObligations : []
}

// Derive cash obligations from open purchase orders (Operasyon → Finans).
function getPurchaseObligations(): Obligation[] {
  try {
    return acikAlisSiparisYukumlulukleri().map(y => ({
      date: y.date, amount: y.amount, description: y.description,
    }))
  } catch {
    return []
  }
}
function getPayrollObligations(): Obligation[] {
  try {
    const donem = buBordroDonemi()
    if (donem.bordrolar.length === 0) return []
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth() // 0-indexed
    const maasDate = new Date(y, m + 1, 0).toISOString().slice(0, 10) // last day of month
    const sgkDate = new Date(y, m + 1, 23).toISOString().slice(0, 10) // 23rd next month
    const obligations: Obligation[] = []
    if (donem.maasOdemesi > 0) obligations.push({ date: maasDate, amount: donem.maasOdemesi, description: 'Maaş ödemesi (İK)' })
    if (donem.sgkPrimToplam > 0) obligations.push({ date: sgkDate, amount: donem.sgkPrimToplam, description: 'SGK primi (İK)' })
    return obligations
  } catch {
    return []
  }
}