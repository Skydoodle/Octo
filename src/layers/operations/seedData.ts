// Octo — Operasyon Demo Seed
// Gerçekçi bir küçük üretim işletmesi: hammadde alır, üretir, mamul satar.
// Kritik stok + açık satış siparişi + açık alış siparişi senaryoları cross-arm
// sinyallerini (stok riski, nakit yükümlülüğü, üretim eksiği) tetikler.

import type {
  Urun, StokHareketi, Siparis, Sevkiyat, Recete, UretimEmri, Tedarikci,
} from './types'
import { addDateOnlyDays, dateOnlyFromLocalDate } from '../../shared/dateOnly'

const bugun = dateOnlyFromLocalDate(new Date())
const gunEkle = (n: number) => addDateOnlyDays(bugun, n) ?? bugun

export function seedUrunler(): Urun[] {
  const mk = (
    id: string, kod: string, ad: string, tip: Urun['tip'], birim: Urun['birim'],
    kdv: number, alis: number, satis: number, kritik: number, lead: number,
  ): Urun => ({
    id, kod, ad, tip, birim, kdvOrani: kdv, alisFiyati: alis, satisFiyati: satis,
    kritikSeviye: kritik, tedarikSuresiGun: lead, aktif: true,
    olusturulma: '2025-01-01',
  })
  return [
    // Hammaddeler
    mk('u1', 'HM-001', 'Çelik Sac 2mm', 'hammadde', 'kg', 20, 45, 0, 500, 14),
    mk('u2', 'HM-002', 'Alüminyum Profil', 'hammadde', 'mt', 20, 120, 0, 200, 10),
    mk('u3', 'HM-003', 'Vida Seti M6', 'hammadde', 'paket', 20, 35, 0, 100, 7),
    mk('u4', 'HM-004', 'Toz Boya (Antrasit)', 'hammadde', 'kg', 20, 180, 0, 50, 21),
    // Mamuller (üretilen)
    mk('u5', 'MM-001', 'Metal Raf Sistemi', 'mamul', 'adet', 20, 0, 2400, 20, 0),
    mk('u6', 'MM-002', 'Endüstriyel Dolap', 'mamul', 'adet', 20, 0, 4800, 10, 0),
    // Ticari mal (alınıp satılan)
    mk('u7', 'TM-001', 'Hazır Tekerlek Seti', 'ticari', 'adet', 20, 85, 160, 40, 5),
  ]
}

export function seedHareketler(urunler: Urun[]): StokHareketi[] {
  const has = (kod: string) => urunler.find(u => u.kod === kod)?.id ?? ''
  let i = 0
  const mk = (urunId: string, tip: StokHareketi['tip'], miktar: number, maliyet: number, gun: number): StokHareketi => ({
    id: 'sh' + (++i), urunId, tip, miktar, birimMaliyet: maliyet, tarih: gunEkle(gun),
  })
  return [
    // Başlangıç girişleri
    mk(has('HM-001'), 'giris_alis', 2000, 45, -40),
    mk(has('HM-002'), 'giris_alis', 800, 120, -38),
    mk(has('HM-003'), 'giris_alis', 300, 35, -35),
    mk(has('HM-004'), 'giris_alis', 200, 180, -30),
    mk(has('TM-001'), 'giris_alis', 150, 85, -25),
    // Üretim tüketimleri ve mamul girişleri
    mk(has('HM-001'), 'cikis_uretim', 1600, 45, -20),  // raf üretimi tüketti → kritik altına itecek
    mk(has('MM-001'), 'giris_uretim', 80, 1100, -20),
    mk(has('HM-002'), 'cikis_uretim', 650, 120, -18),  // dolap üretimi → kritik altı
    mk(has('MM-002'), 'giris_uretim', 25, 2600, -18),
    // Satış çıkışları
    mk(has('MM-001'), 'cikis_satis', 62, 1100, -10),
    mk(has('MM-002'), 'cikis_satis', 18, 2600, -8),
    mk(has('TM-001'), 'cikis_satis', 115, 85, -6),     // tekerlek → kritik altı
  ]
}

export function seedSiparisler(urunler: Urun[]): Siparis[] {
  const id = (kod: string) => urunler.find(u => u.kod === kod)?.id ?? ''
  return [
    // Açık satış siparişi — stok yetmiyor → cross-arm risk
    {
      id: 'sip1', no: 'SIP-2026-0001', tur: 'satis', cariId: 'c-musteri-1',
      cariUnvan: 'Mavi İnşaat Ltd. Şti.', tarih: gunEkle(-5), teslimTarihi: gunEkle(3),
      durum: 'onaylandi', faturalandi: false,
      satirlar: [
        { urunId: id('MM-001'), miktar: 30, birimFiyat: 2400, kdvOrani: 20, sevkEdilen: 0 },
        { urunId: id('TM-001'), miktar: 50, birimFiyat: 160, kdvOrani: 20, sevkEdilen: 0 },
      ],
    },
    // Açık alış siparişi — gelecek nakit çıkışı → Finans
    {
      id: 'sip2', no: 'SIP-2026-0002', tur: 'alis', cariId: 'c-tedarikci-1',
      cariUnvan: 'Çelik Tedarik A.Ş.', tarih: gunEkle(-3), teslimTarihi: gunEkle(7), odemeTarihi: gunEkle(14),
      durum: 'onaylandi', faturalandi: false,
      satirlar: [
        { urunId: id('HM-001'), miktar: 1500, birimFiyat: 47, kdvOrani: 20, sevkEdilen: 0 },
        { urunId: id('HM-002'), miktar: 400, birimFiyat: 125, kdvOrani: 20, sevkEdilen: 0 },
      ],
    },
    // Tamamlanmış satış
    {
      id: 'sip3', no: 'SIP-2026-0003', tur: 'satis', cariId: 'c-musteri-2',
      cariUnvan: 'Demir Yapı San.', tarih: gunEkle(-12), teslimTarihi: gunEkle(-8),
      durum: 'tamamlandi', faturalandi: true,
      satirlar: [
        { urunId: id('MM-002'), miktar: 15, birimFiyat: 4800, kdvOrani: 20, sevkEdilen: 15 },
      ],
    },
  ]
}

export function seedSevkiyatlar(): Sevkiyat[] {
  return [
    {
      id: 'sv1', no: 'İRS-2026-0001', siparisId: 'sip3', cariUnvan: 'Demir Yapı San.',
      tarih: gunEkle(-8), durum: 'teslim', eIrsaliye: 'kabul',
      satirlar: [{ urunId: '', miktar: 15 }], tasiyici: 'Aras Kargo',
    },
  ]
}

export function seedReceteler(urunler: Urun[]): Recete[] {
  const id = (kod: string) => urunler.find(u => u.kod === kod)?.id ?? ''
  return [
    {
      id: 'rec1', mamulId: id('MM-001'), ad: 'Metal Raf Sistemi Reçetesi', aktif: true,
      iscilikSaati: 2.5,
      bilesenler: [
        { urunId: id('HM-001'), miktar: 18 },   // 18 kg çelik sac
        { urunId: id('HM-003'), miktar: 1 },    // 1 paket vida
        { urunId: id('HM-004'), miktar: 0.8 },  // 0.8 kg boya
      ],
    },
    {
      id: 'rec2', mamulId: id('MM-002'), ad: 'Endüstriyel Dolap Reçetesi', aktif: true,
      iscilikSaati: 5,
      bilesenler: [
        { urunId: id('HM-001'), miktar: 32 },
        { urunId: id('HM-002'), miktar: 12 },
        { urunId: id('HM-003'), miktar: 2 },
        { urunId: id('HM-004'), miktar: 1.5 },
      ],
    },
  ]
}

export function seedUretim(urunler: Urun[]): UretimEmri[] {
  const id = (kod: string) => urunler.find(u => u.kod === kod)?.id ?? ''
  return [
    // Planlı üretim — hammadde yetmeyebilir → cross-arm üretim eksiği sinyali
    {
      id: 'ure1', no: 'URE-2026-0001', receteId: 'rec1', mamulId: id('MM-001'),
      miktar: 40, tarih: gunEkle(-2), hedefTarih: gunEkle(5), durum: 'devam',
    },
    {
      id: 'ure2', no: 'URE-2026-0002', receteId: 'rec2', mamulId: id('MM-002'),
      miktar: 20, tarih: gunEkle(-1), hedefTarih: gunEkle(10), durum: 'planlandi',
    },
  ]
}

export function seedTedarikciler(urunler: Urun[]): Tedarikci[] {
  const id = (kod: string) => urunler.find(u => u.kod === kod)?.id ?? ''
  return [
    {
      id: 'ted1', unvan: 'Çelik Tedarik A.Ş.', vkn: '1234567890',
      telefon: '0(212) 555 10 20', eposta: 'satis@celiktedarik.com',
      adres: 'İkitelli OSB, İstanbul',
      saglananUrunler: [id('HM-001'), id('HM-002')],
      ortTedarikSuresiGun: 12, aktif: true, olusturulma: '2025-01-01',
    },
    {
      id: 'ted2', unvan: 'Boya Kimya Ltd.', vkn: '9876543210',
      telefon: '0(232) 444 30 40', adres: 'Kemalpaşa OSB, İzmir',
      saglananUrunler: [id('HM-004')],
      ortTedarikSuresiGun: 21, aktif: true, olusturulma: '2025-01-01',
    },
    {
      id: 'ted3', unvan: 'Bağlantı Elemanları San.', vkn: '4567891230',
      telefon: '0(216) 333 50 60',
      saglananUrunler: [id('HM-003'), id('TM-001')],
      ortTedarikSuresiGun: 6, aktif: true, olusturulma: '2025-01-01',
    },
  ]
}
