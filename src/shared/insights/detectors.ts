// Octo — Insight Detectors
// Deterministic engines that read LIVE store state and produce fully
// traceable Insight objects. No LLM involvement: every number here is
// computed from actual records and can be audited.

import type { Insight, InsightSource } from './types'
import { getFinanceState } from '../../layers/finance/financeStore'
import { getTaxState } from '../../layers/tax/taxStore'
import { getFreshness } from '../store/persist'
import { beyannameLabels } from '../../layers/tax/types'

const fmt = (n: number) => Math.round(n).toLocaleString('tr-TR') + ' TL'

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ---------------------------------------------------------------
// Detector 1 (flagship): cross-layer cash collision
// Tax obligations clustering in the same week vs. available cash.
// ---------------------------------------------------------------
export function detectCashCollision(): Insight | null {
  const fin = getFinanceState()
  const tax = getTaxState()

  // Unpaid obligations due within 14 days
  const upcoming = tax.beyannameler
    .filter(b => b.status !== 'odendi' && b.status !== 'gonderildi')
    .map(b => ({ ...b, days: daysUntil(b.sonTarih) }))
    .filter(b => b.days >= 0 && b.days <= 21)

  if (upcoming.length < 2) return null

  const totalOut = upcoming.reduce((s, b) => s + b.hesaplananVergi, 0)
  const netCash = fin.accounts.reduce((s, a) => s + a.balance, 0)
  const after = netCash - totalOut
  const ratio = totalOut / netCash

  const kaynaklar: InsightSource[] = [
    ...upcoming.map(b => ({
      layer: 'vergi' as const,
      recordType: 'beyanname',
      recordId: b.id,
      label: `${beyannameLabels[b.type]} ${b.donem} (son: ${b.sonTarih})`,
      value: fmt(b.hesaplananVergi),
    })),
    ...fin.accounts.map(a => ({
      layer: 'finans' as const,
      recordType: 'account',
      recordId: a.id,
      label: a.name,
      value: fmt(a.balance),
    })),
  ]

  const calcParts = upcoming.map(b => fmt(b.hesaplananVergi)).join(' + ')

  const eksik: string[] = []
  const overdueRec = fin.invoices.filter(i => i.type === 'sales' && i.status === 'overdue')
  if (overdueRec.length > 0) {
    eksik.push(`${overdueRec.length} gecikmiş alacağın tahsilat tarihi belirsiz; tahsil edilirse tablo iyileşir.`)
  }
  eksik.push('Banka hareketleri manuel; otomatik mutabakat henüz bağlı değil.')

  return {
    id: 'cash-collision-' + upcoming.map(b => b.id).join('-'),
    severity: ratio > 0.35 ? 'kritik' : 'dikkat',
    baslik: 'Aynı haftada çakışan yasal ödemeler',
    ozet: `${upcoming.length} yükümlülük 14 gün içinde üst üste biniyor; toplam ${fmt(totalOut)} çıkış net nakdi ${fmt(after)} seviyesine düşürür.`,
    kaynaklar,
    hesaplama: `${calcParts} = ${fmt(totalOut)} toplam çıkış. Net nakit ${fmt(netCash)} − ${fmt(totalOut)} = ${fmt(after)}. Çıkış / nakit oranı %${Math.round(ratio * 100)}.`,
    veriGuncelligi: `Vergi verisi: ${getFreshness('tax')}; Finans verisi: ${getFreshness('finance')}.`,
    eksikVeri: eksik,
    guven: 'yuksek',
    kural: 'KDV beyannamesi izleyen ayın 28\u2019ine, Muhtasar ve SGK primi 26\u2019sına kadar ödenir; aynı haftaya denk gelen yükümlülükler nakit planlaması gerektirir.',
    oneri: `Ödeme sırasını şimdiden planla; gecikmiş alacakların tahsilatını bu haftaya çek. Gerekirse KDV ödemesini son güne, SGK\u2019yı erken güne dağıt.`,
    sorumlu: 'Patron + Mali Müşavir',
  }
}

// ---------------------------------------------------------------
// Detector 2: overdue receivables concentration
// ---------------------------------------------------------------
export function detectOverdueReceivables(): Insight | null {
  const fin = getFinanceState()
  const overdue = fin.invoices.filter(i => i.type === 'sales' && i.status === 'overdue')
  if (overdue.length === 0) return null

  const total = overdue.reduce((s, i) => s + i.total, 0)
  const receivables = fin.invoices
    .filter(i => i.type === 'sales' && (i.status === 'sent' || i.status === 'overdue'))
    .reduce((s, i) => s + i.total, 0)
  const share = receivables > 0 ? total / receivables : 0

  return {
    id: 'overdue-receivables-' + overdue.length,
    severity: share > 0.4 ? 'kritik' : 'dikkat',
    baslik: 'Gecikmiş alacak yoğunlaşması',
    ozet: `${overdue.length} fatura vadesini aştı; toplam ${fmt(total)}, açık alacakların %${Math.round(share * 100)}\u2019i.`,
    kaynaklar: overdue.map(i => ({
      layer: 'finans' as const,
      recordType: 'invoice',
      recordId: i.id,
      label: `${i.contactName} (vade: ${i.dueDate})`,
      value: fmt(i.total),
    })),
    hesaplama: `${overdue.map(i => fmt(i.total)).join(' + ')} = ${fmt(total)} gecikmiş. Açık alacak ${fmt(receivables)}; pay %${Math.round(share * 100)}.`,
    veriGuncelligi: `Finans verisi: ${getFreshness('finance')}.`,
    eksikVeri: ['Müşterilerle yapılan tahsilat görüşmelerinin sonucu sistemde yok.'],
    guven: 'yuksek',
    kural: 'Vadesi geçen alacaklar nakit akışını doğrudan bozar; 30 günü aşan gecikmelerde tahsilat riski belirgin şekilde artar.',
    oneri: 'En büyük tutardan başlayarak tahsilat araması yap; gerekirse vade farkı veya taksit teklif et.',
    sorumlu: 'Patron / Satış',
  }
}

// ---------------------------------------------------------------
// Detector 3: compliance gaps from the Tax layer
// ---------------------------------------------------------------
export function detectComplianceGaps(): Insight | null {
  const tax = getTaxState()
  const issues = tax.compliance.filter(c => c.durum !== 'tamam')
  if (issues.length === 0) return null

  const weight = issues.reduce((s, c) => s + c.agirlik, 0)

  return {
    id: 'compliance-gaps-' + issues.length,
    severity: issues.some(c => c.durum === 'eksik') ? 'dikkat' : 'stabil',
    baslik: 'Uyumluluk açıkları',
    ozet: `${issues.length} alan tam uyumlu değil; toplam ağırlık %${weight}.`,
    kaynaklar: issues.map(c => ({
      layer: 'vergi' as const,
      recordType: 'compliance',
      recordId: c.alan,
      label: c.alan,
      value: c.not,
    })),
    hesaplama: `Uyumsuz alanların ağırlık toplamı: ${issues.map(c => '%' + c.agirlik).join(' + ')} = %${weight}.`,
    veriGuncelligi: `Vergi verisi: ${getFreshness('tax')}.`,
    eksikVeri: ['e-Fatura eşleşmeyen kayıtların detayı entegratör bağlanınca netleşecek.'],
    guven: 'orta',
    kural: 'Eksik beyan ve uyumsuz e-belgeler vergi incelemesinde usulsüzlük cezası doğurabilir.',
    oneri: 'Taslak bekleyen beyannameleri tamamla; e-Fatura uyumsuzluklarını müşavirinle bu hafta kapat.',
    sorumlu: 'Mali Müşavir',
  }
}

// ---------------------------------------------------------------
// Run all detectors, severity-ordered
// ---------------------------------------------------------------
const order = { kritik: 0, dikkat: 1, stabil: 2 }

export function runAllDetectors(): Insight[] {
  return [detectCashCollision(), detectOverdueReceivables(), detectComplianceGaps()]
    .filter((i): i is Insight => i !== null)
    .sort((a, b) => order[a.severity] - order[b.severity])
}
