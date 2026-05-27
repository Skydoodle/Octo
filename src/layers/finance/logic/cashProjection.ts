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

// Known upcoming obligations — these come from other layers in the real system
export const knownObligations = [
  { date: '2026-05-26', amount: 228300, description: 'KDV Beyannamesi' },
  { date: '2026-05-30', amount: 142800, description: 'SGK Prim Ödemesi' },
  { date: '2026-05-25', amount: 5040, description: 'Ofis malzemeleri ödemesi' },
  { date: '2026-05-31', amount: 10200, description: 'Bulut hizmetleri' },
  { date: '2026-06-10', amount: 54000, description: 'Haziran kirası' },
  { date: '2026-06-15', amount: 14400, description: 'Hukuk bürosu' },
  { date: '2026-06-26', amount: 228300, description: 'KDV Beyannamesi' },
  { date: '2026-06-30', amount: 142800, description: 'SGK Prim Ödemesi' },
]