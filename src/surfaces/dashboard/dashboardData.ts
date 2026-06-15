// Octo — Dashboard derivations
// Builds the dashboard's audit summary and 30-day horizon from LIVE store
// state. When stores are empty these return empty arrays, and the dashboard
// shows EmptyState instead of fabricated rows.

import { getFinanceState } from '../../layers/finance/financeStore'
import { getTaxState } from '../../layers/tax/taxStore'
import { mizanTotals, getLedgerState } from '../../layers/finance/muhasebe/ledgerStore'
import { getFreshness } from '../../shared/store/persist'
import { beyannameLabels, statusLabels } from '../../layers/tax/types'

export interface AuditRow {
  area: string
  status: 'ok' | 'warn'
  note: string
}

// Denetim Özeti — derived from real finance + tax records.
// Each row only appears when there's underlying data to justify it.
export function buildAuditSummary(): AuditRow[] {
  const fin = getFinanceState()
  const tax = getTaxState()
  const rows: AuditRow[] = []

  // Bank reconciliation — only meaningful if there are accounts.
  if (fin.accounts.length > 0) {
    rows.push({
      area: 'Banka Mutabakatı',
      status: 'warn',
      note: 'Otomatik mutabakat bağlı değil',
    })
  }

  // Trial-balance health — a real audit signal from the general ledger.
  const ledger = getLedgerState()
  if (ledger.entries.length > 0) {
    const mt = mizanTotals()
    rows.push({
      area: 'Mizan Dengesi',
      status: mt.dengeli ? 'ok' : 'warn',
      note: mt.dengeli ? 'Borç = Alacak' : 'Denge bozuk',
    })
  }

  // KDV beyanname readiness — from real beyanname records.
  const kdv = tax.beyannameler.filter(b => b.type === 'kdv')
  if (kdv.length > 0) {
    const latest = kdv[0]
    rows.push({
      area: 'KDV Beyanname',
      status: latest.status === 'odendi' || latest.status === 'gonderildi' ? 'ok' : 'warn',
      note: statusLabels[latest.status],
    })
  }

  // Muhtasar timeliness — from real records.
  const muhtasar = tax.beyannameler.filter(b => b.type === 'muhtasar')
  if (muhtasar.length > 0) {
    const overdue = muhtasar.some(b => b.status === 'gecikti')
    rows.push({
      area: 'Muhtasar',
      status: overdue ? 'warn' : 'ok',
      note: overdue ? 'Gecikmiş beyan var' : 'Zamanında',
    })
  }

  // Compliance items from the tax store map straight to audit rows.
  for (const c of tax.compliance) {
    rows.push({
      area: c.alan,
      status: c.durum === 'tamam' ? 'ok' : 'warn',
      note: c.not,
    })
  }

  return rows
}

export interface HorizonItem {
  day: string
  event: string
  tone: 'crimson' | 'warn' | 'positive' | 'mute'
  sortKey: number
}

function dayLabel(days: number): string {
  if (days === 0) return 'Bugün'
  if (days < 0) return `${Math.abs(days)} gün gecikti`
  return `+${days} gün`
}

// 30 Günlük Ufuk — upcoming tax deadlines + invoice due dates, from real data.
export function buildHorizon(): HorizonItem[] {
  const fin = getFinanceState()
  const tax = getTaxState()
  const now = Date.now()
  const items: HorizonItem[] = []

  const daysUntil = (iso: string) => Math.floor((new Date(iso).getTime() - now) / 86400000)

  // Upcoming beyanname deadlines (next 30 days, not yet filed/paid).
  for (const b of tax.beyannameler) {
    if (b.status === 'odendi' || b.status === 'gonderildi') continue
    const d = daysUntil(b.sonTarih)
    if (d < 0 || d > 30) continue
    items.push({
      day: dayLabel(d),
      event: `${beyannameLabels[b.type]} son günü`,
      tone: d <= 7 ? 'crimson' : 'warn',
      sortKey: d,
    })
  }

  // Upcoming invoice due dates (receivables coming in, payables going out).
  for (const inv of fin.invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled') continue
    const d = daysUntil(inv.dueDate)
    if (d < 0 || d > 30) continue
    items.push({
      day: dayLabel(d),
      event:
        inv.type === 'sales'
          ? `${inv.contactName} tahsilat vadesi`
          : `${inv.contactName} ödeme vadesi`,
      tone: inv.type === 'sales' ? 'positive' : 'mute',
      sortKey: d,
    })
  }

  return items.sort((a, b) => a.sortKey - b.sortKey).slice(0, 8)
}

export function dataFreshness() {
  return { tax: getFreshness('tax'), finance: getFreshness('finance') }
}
