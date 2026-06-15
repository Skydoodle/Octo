// Octo — İnsan Kaynakları (İK) Schema
// The personnel + payroll data layer. Turkish labor/SGK/tax law is encoded
// natively as structured, machine-reasonable values — the same R&D thesis as
// the TDHP chart of accounts: regulatory logic as data, not free text.
//
// All 2026 parameters are verified against current sources (muhasebetr,
// cottgroup, kolayik, sistemglobal) as of 2026 H1.

// ── 2026 Payroll Parameters (verified) ───────────────────────────────────

export const BORDRO_2026 = {
  // Minimum wage
  asgariUcretBrut: 33030.0,
  asgariUcretNet: 28075.5,
  asgariUcretGunlukBrut: 1101.0,

  // Employee-side deductions (işçi payı)
  sgkIsciOrani: 0.14,          // %9 MYÖ + %5 GSS
  issizlikIsciOrani: 0.01,     // %1

  // Employer-side contributions (işveren payı)
  sgkIsverenOrani: 0.205,      // standard %20.5
  sgkIsverenIndirimliOrani: 0.155, // with 5-puan Hazine indirimi
  issizlikIsverenOrani: 0.02,  // %2

  // Stamp tax
  damgaVergisiOrani: 0.00759,  // binde 7,59

  // SGK ceiling (taban = asgari ücret brüt, tavan = 7.5x)
  sgkTavan: 33030.0 * 7.5,     // 247.725,00

  // Minimum-wage support to employer (2026)
  asgariUcretDestegi: 1270.0,
} as const

// 2026 income-tax brackets (cumulative matrah-based, GVK m.103).
// Each bracket: up to `limit`, rate `rate`; `base` = accumulated tax at the
// start of this bracket.
export interface VergiDilimi {
  limit: number       // upper bound of cumulative matrah for this bracket
  rate: number        // marginal rate
  base: number        // tax accumulated before this bracket begins
  alt: number         // lower bound of this bracket
}

export const GELIR_VERGISI_DILIMLERI_2026: VergiDilimi[] = [
  { alt: 0, limit: 190000, rate: 0.15, base: 0 },
  { alt: 190000, limit: 400000, rate: 0.20, base: 28500 },
  { alt: 400000, limit: 1500000, rate: 0.27, base: 70500 },
  { alt: 1500000, limit: 5300000, rate: 0.35, base: 367500 },
  { alt: 5300000, limit: Infinity, rate: 0.40, base: 1697500 },
]

// ── Personnel entity ─────────────────────────────────────────────────────

export type SgkDurumu = 'normal' | 'emekli' | 'genc_tesvik' | 'engelli'
export type CalismaSekli = 'tam_zamanli' | 'yari_zamanli'

export interface Personel {
  id: string
  ad: string
  soyad: string
  tcKimlik: string           // 11-digit
  iseGirisTarihi: string     // ISO date
  brutMaas: number           // monthly gross
  departman: string
  pozisyon: string
  sgkDurumu: SgkDurumu
  calismaSekli: CalismaSekli
  // Optional employer-side flags affecting cost
  sgkIndirimli: boolean      // does employer qualify for 5-puan indirim?
  // Contact & bank — operationally needed (maaş ödemesi, ulaşım)
  telefon?: string
  eposta?: string
  adres?: string
  iban?: string
  dogumTarihi?: string
  acilKisi?: string          // emergency contact name
  acilTelefon?: string       // emergency contact phone
  aktif: boolean             // currently employed
  notlar?: string
}

// Required at creation; telefon/IBAN are "warn if missing" not blocking.
export const zorunluPersonelAlanlari: (keyof Personel)[] = ['ad', 'tcKimlik']
export const uyariPersonelAlanlari: (keyof Personel)[] = ['telefon', 'iban']

export const personelAlanLabels: Record<string, string> = {
  ad: 'Ad', soyad: 'Soyad', tcKimlik: 'TC Kimlik', brutMaas: 'Brüt Maaş',
  departman: 'Departman', pozisyon: 'Pozisyon', iseGirisTarihi: 'İşe Giriş',
  telefon: 'Telefon', eposta: 'E-posta', adres: 'Adres', iban: 'IBAN',
  dogumTarihi: 'Doğum Tarihi', acilKisi: 'Acil Durum Kişisi', acilTelefon: 'Acil Telefon',
}

// Missing "warn" fields on a personel (telefon, IBAN) for the eksik-bilgi badge.
export function personelEksikAlanlar(p: Partial<Personel>): (keyof Personel)[] {
  return uyariPersonelAlanlari.filter(f => !String(p[f] ?? '').trim())
}

export const departmanlar = [
  'Yönetim', 'Finans', 'Satış', 'Üretim', 'Operasyon', 'İK', 'Bilgi İşlem', 'Diğer',
]

export const sgkDurumuLabels: Record<SgkDurumu, string> = {
  normal: 'Normal',
  emekli: 'Emekli (SGDP)',
  genc_tesvik: 'Genç Teşvik',
  engelli: 'Engelli İndirimi',
}

// ── Bordro (payroll calculation) result ──────────────────────────────────

export interface Bordro {
  personelId: string
  donem: string              // 2026-01 ..
  brutMaas: number
  // Employee deductions
  sgkIsci: number
  issizlikIsci: number
  gelirVergisiMatrahi: number
  gelirVergisi: number       // after asgari ücret istisnası
  gelirVergisiIstisna: number
  damgaVergisi: number       // after asgari ücret istisnası
  damgaVergisiIstisna: number
  toplamKesinti: number
  netMaas: number
  // Employer cost
  sgkIsveren: number
  issizlikIsveren: number
  isverenMaliyeti: number    // brüt + employer contributions
  // Cumulative tracking
  kumulatifMatrah: number
}

// A full month's payroll run across all personnel.
export interface BordroDonem {
  donem: string
  bordrolar: Bordro[]
  toplamBrut: number
  toplamNet: number
  toplamSgkIsci: number
  toplamSgkIsveren: number
  toplamGelirVergisi: number
  toplamDamga: number
  toplamIsverenMaliyeti: number
  // What feeds the other arms:
  sgkPrimToplam: number      // → SGK beyanname (Vergi)
  muhtasarToplam: number     // gelir vergisi stopajı → Muhtasar (Vergi)
  maasOdemesi: number        // net total → cash outflow (Finans)
}
