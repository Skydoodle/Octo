// Octo — İK Puantaj & İzin Şeması
// Attendance (puantaj) and leave (izin) as structured data. Both feed payroll:
// missing days reduce the bordro matrah (→ lower SGK → cross-arm), and accrued
// annual leave is a real severance-style liability. Turkish leave entitlement
// (4857 sayılı İş Kanunu) is encoded by seniority bands.

// ── Puantaj (attendance) ─────────────────────────────────────────────────

export type GunDurumu =
  | 'tam'            // full day worked
  | 'yarim'         // half day
  | 'devamsiz'      // unexcused absence (no pay)
  | 'yillik_izin'   // annual paid leave
  | 'hastalik'      // sick leave (rapor)
  | 'ucretsiz_izin' // unpaid leave
  | 'resmi_tatil'   // public holiday (paid)
  | 'hafta_tatili'  // weekly rest (paid)

export const gunDurumuLabels: Record<GunDurumu, string> = {
  tam: 'Tam Gün',
  yarim: 'Yarım Gün',
  devamsiz: 'Devamsız',
  yillik_izin: 'Yıllık İzin',
  hastalik: 'Hastalık (Rapor)',
  ucretsiz_izin: 'Ücretsiz İzin',
  resmi_tatil: 'Resmi Tatil',
  hafta_tatili: 'Hafta Tatili',
}

// Does this day status count as a paid day for payroll?
export const ucretliGun: Record<GunDurumu, boolean> = {
  tam: true, yarim: true, devamsiz: false, yillik_izin: true,
  hastalik: true, ucretsiz_izin: false, resmi_tatil: true, hafta_tatili: true,
}

export interface GunKaydi {
  tarih: string       // ISO date
  durum: GunDurumu
  giris?: string      // HH:MM
  cikis?: string      // HH:MM
  fazlaMesaiSaat?: number
}

// One personnel member's attendance for one month.
export interface Puantaj {
  personelId: string
  donem: string                 // 2026-MM
  gunler: GunKaydi[]
  // Derived totals
  calisanGun: number            // paid days
  devamsizGun: number
  yillikIzinGun: number
  hastalikGun: number
  ucretsizIzinGun: number
  fazlaMesaiSaat: number
}

// Fazla mesai multiplier (İş Kanunu: %50 zamlı).
export const FAZLA_MESAI_CARPAN = 1.5
export const AYLIK_CALISMA_SAATI = 225 // ~30 gün x 7.5 saat

// ── İzin (leave) ─────────────────────────────────────────────────────────

export type IzinTuru = 'yillik' | 'hastalik' | 'ucretsiz' | 'mazeret' | 'dogum' | 'evlilik'

export const izinTuruLabels: Record<IzinTuru, string> = {
  yillik: 'Yıllık İzin',
  hastalik: 'Hastalık İzni',
  ucretsiz: 'Ücretsiz İzin',
  mazeret: 'Mazeret İzni',
  dogum: 'Doğum İzni',
  evlilik: 'Evlilik İzni',
}

export type IzinDurumu = 'beklemede' | 'onaylandi' | 'reddedildi'

export const izinDurumuLabels: Record<IzinDurumu, string> = {
  beklemede: 'Beklemede',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi',
}

export interface IzinTalebi {
  id: string
  personelId: string
  tur: IzinTuru
  baslangic: string   // ISO date
  bitis: string       // ISO date
  gunSayisi: number
  durum: IzinDurumu
  aciklama?: string
  olusturulma: string
}

// Annual leave entitlement by seniority (4857 sayılı İş Kanunu m.53).
// 1-5 yıl: 14 gün, 5-15 yıl: 20 gün, 15+ yıl: 26 gün.
// (18 yaş altı ve 50 yaş üstü için en az 20 gün — burada yaş bilgisi yoksa kıdem esas.)
export function yillikIzinHakki(iseGirisTarihi: string): number {
  if (!iseGirisTarihi) return 0
  const giris = new Date(iseGirisTarihi)
  const now = new Date()
  const yil = (now.getTime() - giris.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (yil < 1) return 0          // hak henüz doğmadı
  if (yil < 5) return 14
  if (yil < 15) return 20
  return 26
}

// Accrued annual-leave liability: unused days × daily gross (severance-style).
export function izinBakiyesi(
  iseGirisTarihi: string,
  kullanilanYillik: number,
): { hak: number; kullanilan: number; kalan: number } {
  const hak = yillikIzinHakki(iseGirisTarihi)
  const kalan = Math.max(0, hak - kullanilanYillik)
  return { hak, kullanilan: kullanilanYillik, kalan }
}
