// Octo — Operasyon (Operations) Şeması
// Stok, sipariş (satış/alış), üretim (BOM/reçete) ve tedarikçi katmanının
// yapılandırılmış veri katmanı. ÖNCE ŞEMA ilkesi: her şey sıkı tipli, normalize,
// AI tüketimine uygun. Türk iş taksonomisi native kodlanır (birim, KDV, e-İrsaliye
// durumu state machine, sipariş durumu state machine).
//
// Cross-arm bağlantılar (orkestratöre giden sinyaller):
//  - Stok kritik seviye + açık satış siparişi + tedarik süresi → karşılanamama riski
//  - Açık alış siparişi → gelecek nakit çıkışı (Finans projeksiyonu)
//  - Satış siparişi → fatura/sevkiyat → Finans alacak + e-Fatura/e-İrsaliye uyum
//  - Üretim emri → hammadde stok düşüşü → yeniden sipariş tetiği

// ── Birim & ortak ─────────────────────────────────────────────────────────

export type StokBirimi = 'adet' | 'kg' | 'lt' | 'mt' | 'm2' | 'm3' | 'paket' | 'kutu' | 'ton' | 'saat'

export const birimLabels: Record<StokBirimi, string> = {
  adet: 'Adet', kg: 'kg', lt: 'lt', mt: 'mt', m2: 'm²', m3: 'm³',
  paket: 'Paket', kutu: 'Kutu', ton: 'Ton', saat: 'Saat',
}

// ── Ürün / Stok kalemi ────────────────────────────────────────────────────

export type UrunTipi = 'hammadde' | 'yari_mamul' | 'mamul' | 'ticari' | 'hizmet'

export const urunTipiLabels: Record<UrunTipi, string> = {
  hammadde: 'Hammadde',
  yari_mamul: 'Yarı Mamul',
  mamul: 'Mamul (Üretilen)',
  ticari: 'Ticari Mal (Alınıp satılan)',
  hizmet: 'Hizmet',
}

export interface Urun {
  id: string
  kod: string                // stok kodu (SKU)
  ad: string
  tip: UrunTipi
  birim: StokBirimi
  kdvOrani: number           // 0, 1, 10, 20
  alisFiyati: number         // TRY, KDV hariç
  satisFiyati: number        // TRY, KDV hariç
  kritikSeviye: number       // bu seviyenin altına düşünce uyar
  tedarikSuresiGun: number   // lead time (yeniden sipariş için)
  barkod?: string
  aciklama?: string
  aktif: boolean
  olusturulma: string
}

// Stok hareketi — her giriş/çıkış kaydı (denetlenebilir, türetilebilir bakiye).
export type HareketTipi =
  | 'giris_alis'        // alış siparişiyle giriş
  | 'cikis_satis'       // satış siparişiyle çıkış
  | 'giris_uretim'      // üretimle mamul girişi
  | 'cikis_uretim'      // üretimde hammadde tüketimi
  | 'giris_sayim'       // sayım fazlası / düzeltme +
  | 'cikis_sayim'       // sayım eksiği / fire -
  | 'giris_iade'        // müşteri iadesi
  | 'cikis_iade'        // tedarikçiye iade

export const hareketTipiLabels: Record<HareketTipi, string> = {
  giris_alis: 'Alış Girişi', cikis_satis: 'Satış Çıkışı',
  giris_uretim: 'Üretim Girişi', cikis_uretim: 'Üretim Tüketimi',
  giris_sayim: 'Sayım Fazlası', cikis_sayim: 'Sayım/Fire Eksiği',
  giris_iade: 'Müşteri İadesi', cikis_iade: 'Tedarikçi İadesi',
}

export const hareketGirisMi: Record<HareketTipi, boolean> = {
  giris_alis: true, cikis_satis: false, giris_uretim: true, cikis_uretim: false,
  giris_sayim: true, cikis_sayim: false, giris_iade: true, cikis_iade: false,
}

export interface StokHareketi {
  id: string
  urunId: string
  tip: HareketTipi
  miktar: number             // her zaman pozitif; yön tipten gelir
  birimMaliyet: number       // TRY
  tarih: string              // ISO
  kaynak?: string            // ilgili sipariş/üretim id
  aciklama?: string
}

// ── Sipariş (satış / alış) ────────────────────────────────────────────────

export type SiparisTuru = 'satis' | 'alis'
export type SiparisParaBirimi = 'TRY' | 'USD' | 'EUR'
export type SiparisOdemeDurumu = 'bekliyor' | 'odendi'

// Sipariş durum makinesi (state machine).
export type SiparisDurumu =
  | 'taslak'         // hazırlanıyor
  | 'onaylandi'      // onaylı, beklemede
  | 'kismi'          // kısmen sevk/teslim edildi
  | 'tamamlandi'     // tamamen sevk/teslim + faturalandı
  | 'iptal'          // iptal

export const siparisDurumuLabels: Record<SiparisDurumu, string> = {
  taslak: 'Taslak', onaylandi: 'Onaylandı', kismi: 'Kısmi',
  tamamlandi: 'Tamamlandı', iptal: 'İptal',
}

// İzin verilen durum geçişleri (state machine guard).
export const siparisGecisleri: Record<SiparisDurumu, SiparisDurumu[]> = {
  taslak: ['onaylandi', 'iptal'],
  onaylandi: ['kismi', 'tamamlandi', 'iptal'],
  kismi: ['tamamlandi', 'iptal'],
  tamamlandi: [],
  iptal: [],
}

export interface SiparisSatiri {
  urunId: string
  miktar: number
  birimFiyat: number         // KDV hariç
  kdvOrani: number
  sevkEdilen: number         // kısmi sevkiyat takibi
}

export interface Siparis {
  id: string
  no: string                 // sipariş no (SIP-2026-0001)
  tur: SiparisTuru
  cariId: string             // müşteri (satış) veya tedarikçi (alış)
  cariUnvan: string          // denormalize, hızlı gösterim
  tarih: string              // sipariş tarihi
  teslimTarihi: string       // beklenen teslim
  odemeTarihi?: string       // alış siparişinde teyit edilmiş ödeme tarihi
  paraBirimi?: SiparisParaBirimi // migration-safe: eski kayıtlar TRY kabul edilir
  odemeDurumu?: SiparisOdemeDurumu
  durum: SiparisDurumu
  satirlar: SiparisSatiri[]
  faturalandi: boolean       // faturaya dönüştü mü
  faturaId?: string          // bağlı Finans faturası (tam faturalama)
  faturaIds?: string[]       // açık ve kısmi faturalama için açık bağlantılar
  aciklama?: string
}

function nonNegativeFinite(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

// Sipariş toplamları (türetilir).
export function siparisToplam(s: Siparis): { netToplam: number; kdvToplam: number; genelToplam: number } {
  let net = 0, kdv = 0
  for (const r of s.satirlar) {
    const satirNet = nonNegativeFinite(r.miktar) * nonNegativeFinite(r.birimFiyat)
    const kdvOrani = nonNegativeFinite(r.kdvOrani)
    net += satirNet
    kdv += satirNet * kdvOrani / 100
  }
  return { netToplam: net, kdvToplam: kdv, genelToplam: net + kdv }
}

// Partially fulfilled orders only carry the unfulfilled monetary commitment.
export function siparisKalanToplam(s: Siparis): { netToplam: number; kdvToplam: number; genelToplam: number } {
  let net = 0, kdv = 0
  for (const row of s.satirlar) {
    const remaining = Math.max(0, nonNegativeFinite(row.miktar) - nonNegativeFinite(row.sevkEdilen))
    const rowNet = remaining * nonNegativeFinite(row.birimFiyat)
    const kdvOrani = nonNegativeFinite(row.kdvOrani)
    net += rowNet
    kdv += rowNet * kdvOrani / 100
  }
  return { netToplam: net, kdvToplam: kdv, genelToplam: net + kdv }
}

// ── Sevkiyat (e-İrsaliye kancalı) ─────────────────────────────────────────

export type SevkiyatDurumu = 'hazirlaniyor' | 'yolda' | 'teslim' | 'iptal'
export type EIrsaliyeDurumu = 'yok' | 'taslak' | 'gonderildi' | 'kabul' | 'red'

export const sevkiyatDurumuLabels: Record<SevkiyatDurumu, string> = {
  hazirlaniyor: 'Hazırlanıyor', yolda: 'Yolda', teslim: 'Teslim Edildi', iptal: 'İptal',
}

export const eIrsaliyeDurumuLabels: Record<EIrsaliyeDurumu, string> = {
  yok: 'Yok', taslak: 'Taslak', gonderildi: 'Gönderildi', kabul: 'Kabul', red: 'Reddedildi',
}

export interface SevkiyatSatiri {
  urunId: string
  miktar: number
}

export interface Sevkiyat {
  id: string
  no: string                 // İRS-2026-0001
  siparisId: string
  cariUnvan: string
  tarih: string
  durum: SevkiyatDurumu
  eIrsaliye: EIrsaliyeDurumu  // e-İrsaliye state (GİB entegrasyonu backend ile)
  satirlar: SevkiyatSatiri[]
  tasiyici?: string
  aciklama?: string
}

// ── Üretim (BOM / reçete + üretim emri) ───────────────────────────────────

// Bill of Materials: bir mamulü üretmek için gereken hammadde/yarı mamuller.
export interface BomBileseni {
  urunId: string             // hammadde/yarı mamul
  miktar: number             // 1 birim mamul için gereken miktar
}

export interface Recete {
  id: string
  mamulId: string            // üretilen ürün (tip: mamul/yari_mamul)
  ad: string
  bilesenler: BomBileseni[]
  iscilikSaati: number       // 1 birim için işçilik (maliyet/planlama)
  aktif: boolean
}

export type UretimDurumu = 'planlandi' | 'devam' | 'tamamlandi' | 'iptal'

export const uretimDurumuLabels: Record<UretimDurumu, string> = {
  planlandi: 'Planlandı', devam: 'Devam Ediyor', tamamlandi: 'Tamamlandı', iptal: 'İptal',
}

export interface UretimEmri {
  id: string
  no: string                 // URE-2026-0001
  receteId: string
  mamulId: string
  miktar: number             // üretilecek mamul adedi
  tarih: string
  hedefTarih: string
  durum: UretimDurumu
  aciklama?: string
}

// Bir üretim emri için gereken toplam hammadde (reçete × miktar).
export function uretimHammaddeIhtiyaci(recete: Recete, miktar: number): BomBileseni[] {
  return recete.bilesenler.map(b => ({ urunId: b.urunId, miktar: b.miktar * miktar }))
}

// ── Tedarikçi ─────────────────────────────────────────────────────────────
// Tedarikçi, Finans'taki cari ile bağlıdır (cariId). Burada operasyonel ek
// bilgiler tutulur: hangi ürünleri sağlar, ortalama tedarik süresi, performans.

export interface Tedarikci {
  id: string
  cariId?: string            // Finans cari bağlantısı (varsa)
  unvan: string
  vkn: string
  telefon: string
  eposta?: string
  adres?: string
  saglananUrunler: string[]  // urunId listesi
  ortTedarikSuresiGun: number
  notlar?: string
  aktif: boolean
  olusturulma: string
}
