// Octo — KDV Derivation Engine
// The real calculation: Hesaplanan KDV (sales) - İndirilecek KDV (purchases)
// - Devreden KDV (carry-forward) = Ödenecek KDV. If input exceeds output,
// the surplus carries to next period and payable is zero.
//
// Deterministic, auditable: every number traces to actual invoice records.

import { getFinanceState } from '../../finance/financeStore'
import type { Invoice } from '../../finance/types'

export interface KdvSourceLine {
  id: string
  contactName: string
  issueDate: string
  matrah: number       // net (KDV haric)
  kdv: number          // vatAmount
  oran: number         // vatRate
}

export interface KdvResult {
  donem: string
  // output side (sales)
  hesaplananKDV: number
  satisMatrah: number
  satisKaynaklar: KdvSourceLine[]
  // input side (purchases)
  indirilecekKDV: number
  alisMatrah: number
  alisKaynaklar: KdvSourceLine[]
  // carry-forward in
  devredenKDV: number
  // results
  odenecekKDV: number
  devredenSonraki: number
}

// Match an invoice's issueDate ("2026-05-14") to a period ("2026-05")
function inPeriod(inv: Invoice, donem: string): boolean {
  return typeof inv.issueDate === 'string' && inv.issueDate.startsWith(donem)
}

function toLine(inv: Invoice): KdvSourceLine {
  return {
    id: inv.id,
    contactName: inv.contactName,
    issueDate: inv.issueDate,
    matrah: inv.amount,
    kdv: inv.vatAmount,
    oran: inv.vatRate,
  }
}

// Derive KDV for a period. donem format: "2026-05". devreden = carry-forward from prior period.
export function deriveKdv(donem: string, devredenKDV = 0): KdvResult {
  const { invoices } = getFinanceState()

  const sales = invoices.filter(i => i.type === 'sales' && i.status !== 'cancelled' && inPeriod(i, donem))
  const purchases = invoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled' && inPeriod(i, donem))

  const hesaplananKDV = sales.reduce((s, i) => s + i.vatAmount, 0)
  const satisMatrah = sales.reduce((s, i) => s + i.amount, 0)
  const indirilecekKDV = purchases.reduce((s, i) => s + i.vatAmount, 0)
  const alisMatrah = purchases.reduce((s, i) => s + i.amount, 0)

  const netPosition = hesaplananKDV - indirilecekKDV - devredenKDV
  const odenecekKDV = Math.max(0, netPosition)
  const devredenSonraki = Math.max(0, -netPosition)

  return {
    donem,
    hesaplananKDV,
    satisMatrah,
    satisKaynaklar: sales.map(toLine),
    indirilecekKDV,
    alisMatrah,
    alisKaynaklar: purchases.map(toLine),
    devredenKDV,
    odenecekKDV,
    devredenSonraki,
  }
}
