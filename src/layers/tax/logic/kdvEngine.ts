// Octo — KDV Derivation Engine (tevkifat + istisna aware)
// 1 No'lu beyanname: Hesaplanan KDV (sales) - İndirilecek KDV (purchases)
//   - Devreden = Ödenecek KDV.
// 2 No'lu beyanname: sorumlu sıfatıyla tevkif edilen KDV (when the business
//   is the withholding buyer on a tevkifatlı purchase).
//
// Tevkifatlı sales contribute only the seller-retained KDV to Hesaplanan.
// İstisna sales contribute 0 KDV; their matrah is tracked separately.
// Deterministic, auditable: every number traces to actual invoice records.

import { getFinanceState } from '../../finance/financeStore'
import type { Invoice } from '../../finance/types'
import { hesaplaTevkifat, type TevkifatOrani } from './tevkifat'

export interface KdvSourceLine {
  id: string
  contactName: string
  issueDate: string
  matrah: number
  kdv: number
  oran: number
  durum: 'normal' | 'tevkifat' | 'istisna'
  tevkifEdilen?: number
}

export interface KdvResult {
  donem: string
  hesaplananKDV: number
  satisMatrah: number
  istisnaMatrah: number
  satisKaynaklar: KdvSourceLine[]
  indirilecekKDV: number
  alisMatrah: number
  alisKaynaklar: KdvSourceLine[]
  sorumluKDV: number
  sorumluKaynaklar: KdvSourceLine[]
  devredenKDV: number
  odenecekKDV: number
  devredenSonraki: number
  toplamOdenecek: number
}

function inPeriod(inv: Invoice, donem: string): boolean {
  return typeof inv.issueDate === 'string' && inv.issueDate.startsWith(donem)
}

export function deriveKdv(donem: string, devredenKDV = 0): KdvResult {
  const { invoices } = getFinanceState()

  const sales = invoices.filter(i => i.type === 'sales' && i.status !== 'cancelled' && inPeriod(i, donem))
  const purchases = invoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled' && inPeriod(i, donem))

  let hesaplananKDV = 0
  let satisMatrah = 0
  let istisnaMatrah = 0
  const satisKaynaklar: KdvSourceLine[] = []

  for (const i of sales) {
    const durum = i.kdvDurumu ?? 'normal'
    satisMatrah += i.amount

    if (durum === 'istisna') {
      istisnaMatrah += i.amount
      satisKaynaklar.push({ id: i.id, contactName: i.contactName, issueDate: i.issueDate, matrah: i.amount, kdv: 0, oran: i.vatRate, durum: 'istisna' })
      continue
    }

    if (durum === 'tevkifat' && i.tevkifatOrani) {
      const t = hesaplaTevkifat(i.amount, i.vatRate, i.tevkifatOrani as TevkifatOrani)
      hesaplananKDV += t.saticidaKalanKDV
      satisKaynaklar.push({ id: i.id, contactName: i.contactName, issueDate: i.issueDate, matrah: i.amount, kdv: t.saticidaKalanKDV, oran: i.vatRate, durum: 'tevkifat', tevkifEdilen: t.tevkifEdilenKDV })
      continue
    }

    hesaplananKDV += i.vatAmount
    satisKaynaklar.push({ id: i.id, contactName: i.contactName, issueDate: i.issueDate, matrah: i.amount, kdv: i.vatAmount, oran: i.vatRate, durum: 'normal' })
  }

  let indirilecekKDV = 0
  let alisMatrah = 0
  let sorumluKDV = 0
  const alisKaynaklar: KdvSourceLine[] = []
  const sorumluKaynaklar: KdvSourceLine[] = []

  for (const i of purchases) {
    const durum = i.kdvDurumu ?? 'normal'
    alisMatrah += i.amount

    if (durum === 'istisna') {
      alisKaynaklar.push({ id: i.id, contactName: i.contactName, issueDate: i.issueDate, matrah: i.amount, kdv: 0, oran: i.vatRate, durum: 'istisna' })
      continue
    }

    if (durum === 'tevkifat' && i.tevkifatOrani) {
      const t = hesaplaTevkifat(i.amount, i.vatRate, i.tevkifatOrani as TevkifatOrani)
      indirilecekKDV += t.hesaplananKDV
      sorumluKDV += t.tevkifEdilenKDV
      alisKaynaklar.push({ id: i.id, contactName: i.contactName, issueDate: i.issueDate, matrah: i.amount, kdv: t.hesaplananKDV, oran: i.vatRate, durum: 'tevkifat', tevkifEdilen: t.tevkifEdilenKDV })
      sorumluKaynaklar.push({ id: i.id, contactName: i.contactName, issueDate: i.issueDate, matrah: i.amount, kdv: t.tevkifEdilenKDV, oran: i.vatRate, durum: 'tevkifat' })
      continue
    }

    indirilecekKDV += i.vatAmount
    alisKaynaklar.push({ id: i.id, contactName: i.contactName, issueDate: i.issueDate, matrah: i.amount, kdv: i.vatAmount, oran: i.vatRate, durum: 'normal' })
  }

  const netPosition = hesaplananKDV - indirilecekKDV - devredenKDV
  const odenecekKDV = Math.max(0, netPosition)
  const devredenSonraki = Math.max(0, -netPosition)

  return {
    donem, hesaplananKDV, satisMatrah, istisnaMatrah, satisKaynaklar,
    indirilecekKDV, alisMatrah, alisKaynaklar,
    sorumluKDV, sorumluKaynaklar, devredenKDV,
    odenecekKDV, devredenSonraki, toplamOdenecek: odenecekKDV + sorumluKDV,
  }
}
