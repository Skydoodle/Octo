// Octo — Stok Tahmin Çekirdeği (Katman 1)
// Dürüst, az veriyle çökmeyen tahmin. Çekirdek BİLİNÇLİ olarak basit: geçmiş
// tüketim hareketlerinden lineer bir günlük tüketim oranı çıkarır ve tükenme /
// yeniden sipariş tarihini hesaplar. "Akıllı" olan kısım Katman 2'de gelecek
// (cross-domain: açık siparişler + üretim + nakit çakışması). Bu modül saf
// fonksiyonlardan oluşur (store'dan bağımsız) — test edilebilir ve ileride
// istatistiksel modele yükseltmek için izole.
//
// DÜRÜSTLÜK İLKESİ: Az veri varsa tahmin uydurmayız; güven derecesini düşürür
// ve bunu UI'da açıkça gösteririz. Lineer model sabit tüketim varsayar; mevsimsel
// veya ani talep değişimini yakalamaz — bu sınır kullanıcıya bildirilir.

import { hareketGirisMi, type StokHareketi, type Urun } from './types'
import { addDateOnlyDays, dateOnlyFromLocalDate } from '../../shared/dateOnly'

// Tahmin penceresi: son N gün. 60 gün = stabil ama yakın trende duyarlı denge.
export const TAHMIN_PENCERE_GUN = 60

export type GuvenDerecesi = 'yuksek' | 'orta' | 'dusuk' | 'yok'

export const guvenLabels: Record<GuvenDerecesi, string> = {
  yuksek: 'Yüksek güven', orta: 'Orta güven', dusuk: 'Düşük güven', yok: 'Veri yetersiz',
}

export type ReorderAciliyet = 'guvende' | 'yakinda' | 'simdi' | 'gecikti' | 'tukenmiyor'

export interface StokTahmin {
  urunId: string
  gunlukTuketim: number          // birim/gün (çıkış hareketlerinden)
  mevcutStok: number
  kalanGun: number | null        // mevcut / günlük tüketim (null = tüketim yok)
  tukenmeTarihi: string | null   // ISO
  yenidenSiparisTarihi: string | null  // tükenme - tedarik süresi
  onerilticMiktar: number        // önerilen sipariş miktarı
  aciliyet: ReorderAciliyet
  guven: GuvenDerecesi
  pencereGun: number
  hareketSayisi: number          // güveni belirleyen örnek sayısı
}

const GUN_MS = 1000 * 60 * 60 * 24

// Güven derecesi: pencerede kaç gün veri ve kaç çıkış hareketi var?
// Az örnek → düşük güven. Bu, tahmini körü körüne kullanmayı engeller.
function guvenHesapla(hareketSayisi: number, veriGunAraligi: number): GuvenDerecesi {
  if (hareketSayisi === 0 || veriGunAraligi <= 0) return 'yok'
  if (hareketSayisi >= 6 && veriGunAraligi >= 30) return 'yuksek'
  if (hareketSayisi >= 3 && veriGunAraligi >= 14) return 'orta'
  return 'dusuk'
}

// Bir ürün için tahmin üret. `hareketler` o ürünün TÜM hareketleri olabilir;
// fonksiyon pencereye göre filtreler.
export function urunTahmini(
  urun: Urun,
  hareketler: StokHareketi[],
  bugun = new Date(),
  pencereGun = TAHMIN_PENCERE_GUN,
): StokTahmin {
  const mevcutStok = hareketler.reduce(
    (s, h) => s + (hareketGirisMi[h.tip] ? h.miktar : -h.miktar), 0,
  )

  // Pencere içindeki ÇIKIŞ hareketleri (tüketim = satış + üretim tüketimi + fire).
  const pencereBaslangic = new Date(bugun.getTime() - pencereGun * GUN_MS)
  const cikislar = hareketler.filter(h =>
    !hareketGirisMi[h.tip] && new Date(h.tarih) >= pencereBaslangic && new Date(h.tarih) <= bugun,
  )

  const toplamCikis = cikislar.reduce((s, h) => s + h.miktar, 0)
  const hareketSayisi = cikislar.length

  // Veri aralığı: en eski çıkış hareketinden bugüne (en fazla pencere kadar).
  let veriGunAraligi = 0
  if (cikislar.length > 0) {
    const enEski = Math.min(...cikislar.map(h => new Date(h.tarih).getTime()))
    veriGunAraligi = Math.min(pencereGun, Math.max(1, (bugun.getTime() - enEski) / GUN_MS))
  }

  const guven = guvenHesapla(hareketSayisi, veriGunAraligi)
  const gunlukTuketim = veriGunAraligi > 0 ? toplamCikis / veriGunAraligi : 0

  let kalanGun: number | null = null
  let tukenmeTarihi: string | null = null
  let yenidenSiparisTarihi: string | null = null
  let aciliyet: ReorderAciliyet = 'tukenmiyor'

  if (gunlukTuketim > 0 && urun.tip !== 'hizmet') {
    kalanGun = mevcutStok / gunlukTuketim
    const bugunISO = dateOnlyFromLocalDate(bugun)
    tukenmeTarihi = addDateOnlyDays(bugunISO, kalanGun)
    const reorderGun = kalanGun - urun.tedarikSuresiGun
    yenidenSiparisTarihi = addDateOnlyDays(bugunISO, reorderGun)

    if (reorderGun < 0) aciliyet = 'gecikti'        // sipariş zamanı geçmiş
    else if (reorderGun <= 3) aciliyet = 'simdi'     // hemen sipariş ver
    else if (reorderGun <= 10) aciliyet = 'yakinda'  // yaklaşıyor
    else aciliyet = 'guvende'
  }

  // Önerilen sipariş miktarı: (tedarik süresi + güvenlik tamponu) kadar tüketim,
  // en az kritik seviyeyi tamamlayacak şekilde. Güvenlik tamponu = tedarik/2.
  const guvenlikTampon = urun.tedarikSuresiGun * 0.5
  const hedefGun = urun.tedarikSuresiGun + guvenlikTampon
  let onerilticMiktar = 0
  if (gunlukTuketim > 0) {
    const ihtiyac = gunlukTuketim * hedefGun - mevcutStok
    onerilticMiktar = Math.max(0, Math.ceil(ihtiyac))
    // Kritik seviyenin altındaysa en azından kritik seviyeye tamamla.
    if (mevcutStok + onerilticMiktar < urun.kritikSeviye) {
      onerilticMiktar = Math.ceil(urun.kritikSeviye - mevcutStok)
    }
  }

  return {
    urunId: urun.id, gunlukTuketim, mevcutStok, kalanGun,
    tukenmeTarihi, yenidenSiparisTarihi, onerilticMiktar,
    aciliyet, guven, pencereGun, hareketSayisi,
  }
}

export const aciliyetLabels: Record<ReorderAciliyet, string> = {
  guvende: 'Güvende', yakinda: 'Yakında sipariş', simdi: 'Şimdi sipariş ver',
  gecikti: 'Gecikti — acil', tukenmiyor: 'Hareket yok',
}

export const aciliyetRenk: Record<ReorderAciliyet, string> = {
  guvende: 'text-positive', yakinda: 'text-warn', simdi: 'text-crimson',
  gecikti: 'text-crimson', tukenmiyor: 'text-ink-mute',
}
