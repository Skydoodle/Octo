// Octo — İK Demo Seed
// Realistic personnel so the demo shows a real payroll run and a real SGK
// obligation feeding the cross-arm collision.

import type { Personel } from './types'
import type { Puantaj, IzinTalebi, GunKaydi, GunDurumu } from './attendanceTypes'

export function seedPersonel(): Personel[] {
  const mk = (
    id: string, ad: string, soyad: string, brut: number,
    departman: string, pozisyon: string, ay: string,
    telefon = '', iban = '', eposta = '',
  ): Personel => ({
    id, ad, soyad,
    tcKimlik: '1' + Math.floor(10000000000 + Math.random() * 89999999999).toString().slice(0, 10),
    iseGirisTarihi: ay,
    brutMaas: brut,
    departman, pozisyon,
    sgkDurumu: 'normal',
    calismaSekli: 'tam_zamanli',
    sgkIndirimli: true,
    telefon, iban, eposta,
    acilKisi: telefon ? 'Aile Üyesi' : '',
    acilTelefon: telefon ? '0(532) 000 00 00' : '',
    aktif: true,
  })

  return [
    mk('p1', 'Ahmet', 'Yılmaz', 95000, 'Yönetim', 'Genel Müdür', '2023-01-15', '0(532) 111 22 33', 'TR12 0001 0017 4538 0731 5000 01', 'ahmet@octo.com'),
    mk('p2', 'Elif', 'Demir', 62000, 'Finans', 'Finans Müdürü', '2023-03-01', '0(533) 222 33 44', 'TR33 0006 4000 0011 2345 6789 01', 'elif@octo.com'),
    mk('p3', 'Mehmet', 'Kaya', 48000, 'Satış', 'Satış Sorumlusu', '2024-02-10', '0(534) 333 44 55', 'TR09 0006 2000 1234 0006 2993 26', 'mehmet@octo.com'),
    mk('p4', 'Zeynep', 'Şahin', 38000, 'Operasyon', 'Operasyon Uzmanı', '2024-06-01', '0(535) 444 55 66', '', 'zeynep@octo.com'),
    mk('p5', 'Can', 'Öztürk', 33030, 'Üretim', 'Üretim Personeli', '2025-01-20', '0(536) 555 66 77', 'TR45 0001 0017 4538 0731 5000 99', ''),
    mk('p6', 'Ayşe', 'Çelik', 33030, 'Üretim', 'Üretim Personeli', '2025-04-15', '', '', ''),
    mk('p7', 'Burak', 'Aydın', 41000, 'Bilgi İşlem', 'Yazılım Geliştirici', '2024-09-01', '0(537) 666 77 88', 'TR78 0006 7010 0000 0011 2233 44', 'burak@octo.com'),
    mk('p8', 'Selin', 'Arslan', 36000, 'İK', 'İK Uzmanı', '2025-02-01', '0(538) 777 88 99', 'TR21 0001 0017 4538 0731 5001 02', 'selin@octo.com'),
  ]
}

// Demo puantaj for the current month: mostly full days, weekends as rest,
// a couple of absences/overtime to show attendance affecting payroll.
export function seedPuantaj(personeller: Personel[]): Puantaj[] {
  const now = new Date()
  const yil = now.getFullYear(), ay = now.getMonth() // 0-indexed
  const donem = `${yil}-${String(ay + 1).padStart(2, '0')}`
  const gunSayisi = new Date(yil, ay + 1, 0).getDate()

  return personeller.map((p, idx) => {
    const gunler: GunKaydi[] = []
    let devamsiz = 0, ucretsiz = 0, yillik = 0, hastalik = 0, fazla = 0, calisan = 0
    for (let d = 1; d <= gunSayisi; d++) {
      const date = new Date(yil, ay, d)
      const dow = date.getDay() // 0 Sun, 6 Sat
      let durum: GunDurumu = 'tam'
      if (dow === 0 || dow === 6) durum = 'hafta_tatili'
      // Sprinkle some variation per person
      else if (idx === 3 && d === 12) { durum = 'yillik_izin'; yillik++ }
      else if (idx === 3 && d === 13) { durum = 'yillik_izin'; yillik++ }
      else if (idx === 5 && d === 8) { durum = 'devamsiz'; devamsiz++ }
      else if (idx === 6 && d === 20) { durum = 'hastalik'; hastalik++ }
      else if (idx === 2 && d === 15) { durum = 'ucretsiz_izin'; ucretsiz++ }

      const rec: GunKaydi = { tarih: date.toISOString().slice(0, 10), durum }
      // A bit of overtime for two people
      if (durum === 'tam' && (idx === 4 || idx === 6) && d % 7 === 0) { rec.fazlaMesaiSaat = 2; fazla += 2 }
      const ucretsizMi = durum === 'devamsiz' || durum === 'ucretsiz_izin'
      if (!ucretsizMi) calisan += 1
      gunler.push(rec)
    }
    return {
      personelId: p.id, donem, gunler,
      calisanGun: calisan, devamsizGun: devamsiz, yillikIzinGun: yillik,
      hastalikGun: hastalik, ucretsizIzinGun: ucretsiz, fazlaMesaiSaat: fazla,
    }
  })
}

// Demo leave requests across statuses.
export function seedIzinler(personeller: Personel[]): IzinTalebi[] {
  const now = new Date()
  const iso = (d: number, m = now.getMonth()) => new Date(now.getFullYear(), m, d).toISOString().slice(0, 10)
  const out: IzinTalebi[] = []
  if (personeller[3]) out.push({ id: 'izin1', personelId: personeller[3].id, tur: 'yillik', baslangic: iso(12), bitis: iso(13), gunSayisi: 2, durum: 'onaylandi', olusturulma: iso(1), aciklama: 'Yıllık izin' })
  if (personeller[6]) out.push({ id: 'izin2', personelId: personeller[6].id, tur: 'hastalik', baslangic: iso(20), bitis: iso(20), gunSayisi: 1, durum: 'onaylandi', olusturulma: iso(19), aciklama: 'Rapor' })
  if (personeller[1]) out.push({ id: 'izin3', personelId: personeller[1].id, tur: 'yillik', baslangic: iso(25), bitis: iso(27), gunSayisi: 3, durum: 'beklemede', olusturulma: iso(18), aciklama: 'Yıllık izin talebi' })
  if (personeller[2]) out.push({ id: 'izin4', personelId: personeller[2].id, tur: 'ucretsiz', baslangic: iso(15), bitis: iso(15), gunSayisi: 1, durum: 'onaylandi', olusturulma: iso(10), aciklama: 'Ücretsiz izin' })
  return out
}
