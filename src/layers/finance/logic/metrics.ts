// Octo — Finance Metrics
// Computes everything the Overview previously hardcoded, straight from the live
// store (transactions / invoices / accounts). Where the current schema genuinely
// can't support a figure (e.g. balance-sheet ratios needing inventory or
// short-term liabilities), we return null and the UI shows "—" rather than
// inventing a number. Honest gaps over fake precision.

import type { Transaction, Invoice, BankAccount } from '../types'

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export interface MonthlyPoint {
  month: string
  gelir: number
  gider: number
  kar: number
}

// Group real transactions into the last `count` calendar months (oldest→newest).
export function monthlyTrend(transactions: Transaction[], count = 6): MonthlyPoint[] {
  const now = new Date()
  const points: MonthlyPoint[] = []

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()

    const inMonth = transactions.filter(tx => {
      const t = new Date(tx.date)
      return t.getFullYear() === y && t.getMonth() === m
    })

    const gelir = inMonth.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)
    const gider = inMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)

    points.push({ month: TR_MONTHS[m], gelir, gider, kar: gelir - gider })
  }

  return points
}

export interface ExpenseCategory {
  label: string
  amount: number
  pct: number
}

// Expense breakdown for the current month, grouped by the transaction's category.
export function expenseByCategory(transactions: Transaction[]): ExpenseCategory[] {
  const now = new Date()
  const thisMonth = transactions.filter(tx => {
    const t = new Date(tx.date)
    return tx.type === 'expense' && t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear()
  })

  const totals = new Map<string, number>()
  for (const tx of thisMonth) {
    const cat = tx.category || 'Diğer'
    totals.set(cat, (totals.get(cat) ?? 0) + Math.abs(tx.amount))
  }

  const grand = [...totals.values()].reduce((s, v) => s + v, 0)
  return [...totals.entries()]
    .map(([label, amount]) => ({ label, amount, pct: grand > 0 ? Math.round((amount / grand) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

export interface RatioRow {
  label: string
  value: string          // formatted, or '—' when not computable
  target: string
  status: 'good' | 'warn' | 'bad' | 'unknown'
}

// Financial ratios. We only emit a real value where the data exists today.
// Current liabilities are approximated by open payables (AP). Inventory isn't
// modelled, so the quick (asit-test) ratio can't be distinguished from the
// current ratio yet — we mark it unknown instead of faking it.
export function financialRatios(
  accounts: BankAccount[],
  invoices: Invoice[],
): RatioRow[] {
  const cashTRY = accounts.filter(a => a.currency === 'TRY').reduce((s, a) => s + a.balance, 0)
  const cashUSDinTRY = accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0) * 38.5
  const cash = cashTRY + cashUSDinTRY

  const receivables = invoices
    .filter(i => i.type === 'sales' && i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + i.total, 0)

  const payables = invoices
    .filter(i => i.type === 'purchase' && i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + i.total, 0)

  const currentAssets = cash + receivables
  const currentLiabilities = payables

  const rows: RatioRow[] = []

  // Current ratio — computable from what we have (cash + AR vs AP).
  if (currentLiabilities > 0) {
    const r = currentAssets / currentLiabilities
    rows.push({
      label: 'Cari Oran',
      value: r.toFixed(1) + ':1',
      target: '2.0 veya üzeri',
      status: r >= 2 ? 'good' : r >= 1 ? 'warn' : 'bad',
    })
  } else {
    rows.push({ label: 'Cari Oran', value: '—', target: '2.0 veya üzeri', status: 'unknown' })
  }

  // Quick ratio — needs inventory separation we don't model yet.
  rows.push({
    label: 'Asit-Test Oranı',
    value: '—',
    target: 'Stok verisi gerekli',
    status: 'unknown',
  })

  // Debt/equity — needs equity & long-term debt; not in schema yet.
  rows.push({
    label: 'Borç/Özkaynak',
    value: '—',
    target: 'Bilanço verisi gerekli',
    status: 'unknown',
  })

  return rows
}

// Month-over-month percentage change for a metric series. Returns null when
// there isn't a prior month with a non-zero base to compare against.
export function momDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

// Build a small sparkline series from a real monthly metric (last N months).
export function sparkFromTrend(trend: MonthlyPoint[], key: 'gelir' | 'gider' | 'kar'): { v: number }[] {
  return trend.map(p => ({ v: p[key] }))
}
