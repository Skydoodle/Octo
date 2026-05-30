// Octo — Vergi (Tax) Layer — Type Definitions
// Schema-first: Turkish tax taxonomy encoded at the type level.

export type BeyannameType =
  | 'kdv'           // Katma Değer Vergisi
  | 'muhtasar'      // Muhtasar ve Prim Hizmet Beyannamesi
  | 'gecici'        // Geçici Vergi
  | 'kurumlar'      // Kurumlar Vergisi
  | 'damga'         // Damga Vergisi
  | 'stopaj'        // Stopaj (Gelir Vergisi Kesintisi)
  | 'sgk'           // SGK Prim Bildirgesi

export type BeyannameStatus =
  | 'taslak'        // hazırlanıyor
  | 'hazir'         // gönderilmeye hazır
  | 'gonderildi'    // beyan edildi
  | 'odendi'        // tahakkuk ödendi
  | 'gecikti'       // süresi geçti

export type Period =
  | 'aylik'         // monthly
  | 'ucaylik'       // quarterly
  | 'yillik'        // annual

// KDV oranları — enum at schema level (your build priority)
export type KdvRate = 0 | 1 | 10 | 20

export interface Beyanname {
  id: string
  type: BeyannameType
  donem: string            // "2026-05" veya "2026-Q1"
  period: Period
  status: BeyannameStatus
  matrah: number           // tax base
  hesaplananVergi: number  // calculated tax owed
  sonTarih: string         // ISO deadline date
  beyanTarihi?: string     // when it was filed
  aciklama: string
}

export interface TaxObligation {
  type: BeyannameType
  label: string
  amount: number
  sonTarih: string
  daysUntil: number
  status: BeyannameStatus
}

// Compliance scoring
export interface ComplianceItem {
  alan: string
  durum: 'tamam' | 'eksik' | 'risk'
  not: string
  agirlik: number          // weight in composite score
}

export interface TaxMetrics {
  toplamVergiYuku: number      // total tax owed this period
  yaklasanBeyanname: number    // count due in next 30 days
  gecikmis: number             // count overdue
  uyumlulukSkoru: number       // 0-100 composite compliance score
}

// Display metadata for each beyanname type
export const beyannameLabels: Record<BeyannameType, string> = {
  kdv: 'KDV Beyannamesi',
  muhtasar: 'Muhtasar Beyanname',
  gecici: 'Geçici Vergi',
  kurumlar: 'Kurumlar Vergisi',
  damga: 'Damga Vergisi',
  stopaj: 'Stopaj',
  sgk: 'SGK Prim Bildirgesi',
}

export const beyannameAciklama: Record<BeyannameType, string> = {
  kdv: 'Aylık katma değer vergisi beyanı',
  muhtasar: 'Aylık muhtasar ve prim hizmet beyanı',
  gecici: 'Üç aylık geçici vergi beyanı',
  kurumlar: 'Yıllık kurumlar vergisi beyanı',
  damga: 'Damga vergisi beyanı',
  stopaj: 'Gelir vergisi kesinti beyanı',
  sgk: 'SGK aylık prim ve hizmet bildirgesi',
}

export const statusLabels: Record<BeyannameStatus, string> = {
  taslak: 'Taslak',
  hazir: 'Hazır',
  gonderildi: 'Gönderildi',
  odendi: 'Ödendi',
  gecikti: 'Gecikti',
}
