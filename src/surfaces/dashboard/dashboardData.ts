// Octo — Dashboard derivations
// Audit and horizon are built from live stores. The horizon now includes Tax,
// Finance, HR and Operations so it mirrors the reasoning engine's field of view.

import { getFinanceState } from '../../layers/finance/financeStore'
import { getTaxState } from '../../layers/tax/taxStore'
import { getOpState, tumStokTahminleri } from '../../layers/operations/opStore'
import { mizanTotals, getLedgerState } from '../../layers/finance/muhasebe/ledgerStore'
import { getFreshness } from '../../shared/store/persist'
import { statusLabels } from '../../layers/tax/types'
import { calendarDaysBetween, dateOnlyFromLocalDate, isDateOnly } from '../../shared/dateOnly'
import { buildReasoningSignals } from '../../reasoning/signalAdapters'

export interface AuditRow {
  area: string
  status: 'ok' | 'warn'
  note: string
}

export function buildAuditSummary(): AuditRow[] {
  const fin = getFinanceState()
  const tax = getTaxState()
  const op = getOpState()
  const rows: AuditRow[] = []

  if (fin.accounts.length > 0) {
    rows.push({ area: 'Banka Mutabakatı', status: 'warn', note: 'Otomatik mutabakat bağlı değil' })
  }

  const ledger = getLedgerState()
  if (ledger.entries.length > 0) {
    const mt = mizanTotals()
    rows.push({
      area: 'Mizan Dengesi',
      status: mt.dengeli ? 'ok' : 'warn',
      note: mt.dengeli ? 'Borç = Alacak' : 'Denge bozuk',
    })
  }

  const kdv = tax.beyannameler.filter(b => b.type === 'kdv')
  if (kdv.length > 0) {
    const latest = [...kdv].sort((a, b) => b.donem.localeCompare(a.donem))[0]
    rows.push({
      area: 'KDV Beyanname',
      status: latest.status === 'odendi' || latest.status === 'gonderildi' ? 'ok' : 'warn',
      note: statusLabels[latest.status],
    })
  }

  const muhtasar = tax.beyannameler.filter(b => b.type === 'muhtasar')
  if (muhtasar.length > 0) {
    const overdue = muhtasar.some(b => b.status === 'gecikti')
    rows.push({
      area: 'Muhtasar',
      status: overdue ? 'warn' : 'ok',
      note: overdue ? 'Gecikmiş beyan var' : 'Zamanında',
    })
  }

  for (const c of tax.compliance) {
    rows.push({
      area: c.alan,
      status: c.durum === 'tamam' ? 'ok' : 'warn',
      note: c.not,
    })
  }

  if (op.urunler.length > 0) {
    const withoutMovement = op.urunler.filter(u => u.aktif && u.tip !== 'hizmet')
      .filter(u => !op.hareketler.some(h => h.urunId === u.id)).length
    rows.push({
      area: 'Stok İzlenebilirliği',
      status: withoutMovement === 0 ? 'ok' : 'warn',
      note: withoutMovement === 0 ? 'Tüm aktif stoklarda hareket var' : `${withoutMovement} üründe hareket yok`,
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

export function buildHorizon(now = new Date()): HorizonItem[] {
  const op = getOpState()
  const today = dateOnlyFromLocalDate(now)
  const items: HorizonItem[] = []
  const daysUntil = (iso: string) => calendarDaysBetween(today, iso)
  const push = (iso: string, event: string, tone: HorizonItem['tone']) => {
    const d = daysUntil(iso)
    if (d === null || d < 0 || d > 30) return
    items.push({ day: dayLabel(d), event, tone, sortKey: d })
  }

  for (const signal of buildReasoningSignals(now)) {
    if (
      (signal.kind !== 'cash_inflow' && signal.kind !== 'cash_outflow') ||
      !signal.eventDate ||
      typeof signal.amount !== 'number' ||
      !Number.isFinite(signal.amount) ||
      signal.amount <= 0
    ) continue
    push(signal.eventDate, signal.label, signal.kind === 'cash_inflow' ? 'positive' : 'mute')
  }

  for (const order of op.siparisler) {
    if (order.tur !== 'satis' || (order.durum !== 'onaylandi' && order.durum !== 'kismi')) continue
    const eventDate = order.teslimTarihi
    if (!isDateOnly(eventDate)) continue
    push(
      eventDate,
      `${order.no} satış siparişi teslimi`,
      'positive',
    )
  }

  for (const production of op.uretimler) {
    if (production.durum !== 'planlandi' && production.durum !== 'devam') continue
    push(production.hedefTarih, `${production.no} üretim hedefi`, 'warn')
  }

  for (const forecast of tumStokTahminleri(now)) {
    if (forecast.aciliyet !== 'simdi' && forecast.aciliyet !== 'gecikti' && forecast.aciliyet !== 'yakinda') continue
    const product = op.urunler.find(u => u.id === forecast.urunId)
    const reorderDate = forecast.yenidenSiparisTarihi
    if (!product || !reorderDate) continue
    push(reorderDate, `${product.ad} yeniden sipariş zamanı`, forecast.aciliyet === 'yakinda' ? 'warn' : 'crimson')
  }

  return items.sort((a, b) => a.sortKey - b.sortKey).slice(0, 10)
}

export function dataFreshness() {
  return {
    tax: getFreshness('tax'),
    finance: getFreshness('finance'),
      hr: getFreshness('hr'),
      operations: getFreshness('operations'),
      settings: getFreshness('company-obligation-settings'),
  }
}
