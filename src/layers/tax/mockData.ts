// Octo — Vergi Layer — Mock Data
// Turkish tax calendar with realistic deadline rules.

import type { Beyanname, ComplianceItem } from './types'

// Deadlines reflect Turkish tax calendar conventions:
// KDV: 28th of following month
// Muhtasar: 26th of following month
// Geçici Vergi: 17th of second month after quarter
// SGK: 26th of following month
// Damga: with muhtasar
// Kurumlar: end of April (annual)

export const mockBeyannameler: Beyanname[] = [
  {
    id: 'kdv-2026-05',
    type: 'kdv',
    donem: '2026-05',
    period: 'aylik',
    status: 'hazir',
    matrah: 1141500,
    hesaplananVergi: 228300,
    sonTarih: '2026-06-28',
    aciklama: 'Mayıs 2026 KDV beyannamesi',
  },
  {
    id: 'muhtasar-2026-05',
    type: 'muhtasar',
    donem: '2026-05',
    period: 'aylik',
    status: 'taslak',
    matrah: 540000,
    hesaplananVergi: 81000,
    sonTarih: '2026-06-26',
    aciklama: 'Mayıs 2026 muhtasar beyanname',
  },
  {
    id: 'sgk-2026-05',
    type: 'sgk',
    donem: '2026-05',
    period: 'aylik',
    status: 'hazir',
    matrah: 408000,
    hesaplananVergi: 142800,
    sonTarih: '2026-06-26',
    aciklama: 'Mayıs 2026 SGK prim bildirgesi',
  },
  {
    id: 'gecici-2026-q1',
    type: 'gecici',
    donem: '2026-Q1',
    period: 'ucaylik',
    status: 'gonderildi',
    matrah: 920000,
    hesaplananVergi: 184000,
    sonTarih: '2026-05-17',
    beyanTarihi: '2026-05-14',
    aciklama: '2026 1. dönem geçici vergi',
  },
  {
    id: 'damga-2026-05',
    type: 'damga',
    donem: '2026-05',
    period: 'aylik',
    status: 'taslak',
    matrah: 0,
    hesaplananVergi: 8400,
    sonTarih: '2026-06-26',
    aciklama: 'Mayıs 2026 damga vergisi',
  },
  {
    id: 'stopaj-2026-05',
    type: 'stopaj',
    donem: '2026-05',
    period: 'aylik',
    status: 'taslak',
    matrah: 162000,
    hesaplananVergi: 32400,
    sonTarih: '2026-06-26',
    aciklama: 'Mayıs 2026 kira stopajı',
  },
  {
    id: 'kurumlar-2025',
    type: 'kurumlar',
    donem: '2025',
    period: 'yillik',
    status: 'odendi',
    matrah: 2400000,
    hesaplananVergi: 600000,
    sonTarih: '2026-04-30',
    beyanTarihi: '2026-04-22',
    aciklama: '2025 yılı kurumlar vergisi',
  },
  {
    id: 'kdv-2026-04',
    type: 'kdv',
    donem: '2026-04',
    period: 'aylik',
    status: 'odendi',
    matrah: 1050000,
    hesaplananVergi: 210000,
    sonTarih: '2026-05-28',
    beyanTarihi: '2026-05-24',
    aciklama: 'Nisan 2026 KDV beyannamesi',
  },
]

export const mockCompliance: ComplianceItem[] = [
  { alan: 'KDV beyannameleri', durum: 'tamam', not: 'Tüm dönemler güncel', agirlik: 25 },
  { alan: 'Muhtasar beyanname', durum: 'risk', not: 'Mayıs dönemi taslak halinde', agirlik: 20 },
  { alan: 'SGK bildirgeleri', durum: 'tamam', not: 'Zamanında gönderildi', agirlik: 20 },
  { alan: 'e-Fatura uyumu', durum: 'eksik', not: '3 fatura GİB ile eşleşmiyor', agirlik: 15 },
  { alan: 'Geçici vergi', durum: 'tamam', not: '1. dönem beyan edildi', agirlik: 10 },
  { alan: 'Damga vergisi', durum: 'risk', not: 'Mayıs dönemi beklemede', agirlik: 10 },
]
