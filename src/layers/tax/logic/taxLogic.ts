// Octo — Vergi Layer — Business Logic

import type { Beyanname, TaxObligation, ComplianceItem, TaxMetrics } from '../types'
import { beyannameLabels } from '../types'

const today = () => new Date()

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.floor((d.getTime() - today().getTime()) / 86400000)
}

// Upcoming obligations in next N days, sorted by urgency
export function getUpcomingObligations(beyannameler: Beyanname[], withinDays = 30): TaxObligation[] {
  return beyannameler
    .filter(b => b.status !== 'odendi' && b.status !== 'gonderildi')
    .map(b => ({
      type: b.type,
      label: beyannameLabels[b.type],
      amount: b.hesaplananVergi,
      sonTarih: b.sonTarih,
      daysUntil: daysUntil(b.sonTarih),
      status: b.status,
    }))
    .filter(o => o.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

// Total tax owed this period (unpaid)
export function getTotalTaxOwed(beyannameler: Beyanname[]): number {
  return beyannameler
    .filter(b => b.status !== 'odendi')
    .reduce((sum, b) => sum + b.hesaplananVergi, 0)
}

// Count overdue
export function getOverdueCount(beyannameler: Beyanname[]): number {
  return beyannameler.filter(b =>
    b.status !== 'odendi' && b.status !== 'gonderildi' && daysUntil(b.sonTarih) < 0
  ).length
}

// Composite compliance score (weighted)
export function calculateComplianceScore(items: ComplianceItem[]): number {
  const totalWeight = items.reduce((s, i) => s + i.agirlik, 0)
  const earned = items.reduce((s, i) => {
    const factor = i.durum === 'tamam' ? 1 : i.durum === 'risk' ? 0.5 : 0
    return s + i.agirlik * factor
  }, 0)
  return Math.round((earned / totalWeight) * 100)
}

export function getTaxMetrics(beyannameler: Beyanname[], compliance: ComplianceItem[]): TaxMetrics {
  return {
    toplamVergiYuku: getTotalTaxOwed(beyannameler),
    yaklasanBeyanname: getUpcomingObligations(beyannameler, 30).length,
    gecikmis: getOverdueCount(beyannameler),
    uyumlulukSkoru: calculateComplianceScore(compliance),
  }
}

// Detect cross-period clustering — multiple deadlines in same week
export function detectDeadlineClusters(beyannameler: Beyanname[]): { hafta: string; toplam: number; sayi: number }[] {
  const upcoming = getUpcomingObligations(beyannameler, 30)
  const clusters: Record<string, { toplam: number; sayi: number }> = {}
  upcoming.forEach(o => {
    const week = Math.floor(o.daysUntil / 7)
    const key = `${week}`
    if (!clusters[key]) clusters[key] = { toplam: 0, sayi: 0 }
    clusters[key].toplam += o.amount
    clusters[key].sayi += 1
  })
  return Object.entries(clusters)
    .filter(([, v]) => v.sayi >= 2)
    .map(([week, v]) => ({ hafta: `${Number(week) * 7}-${Number(week) * 7 + 7} gün`, ...v }))
}
