// Octo — Tek Düzen Hesap Planı (TDHP)
// The full standard Turkish chart of accounts, encoded as structured data.
// Source taxonomy: Muhasebe Sistemi Uygulama Genel Tebliği (MSUGT).
//
// Structure: single-digit main groups (1-7, 9), two-digit subgroups, three-digit
// postable accounts. `hareketGorur: true` marks leaf accounts that can take
// postings; group/header nodes (false) only aggregate in the mizan.
//
// This is intentionally comprehensive (the full tree) but pragmatically scoped
// to the standard accounts an SME actually encounters. Sub-accounts under a 3xx
// code (e.g. 120.01 for a specific customer) are created dynamically as needed.

import type { LedgerAccount } from './types'

// Helper to keep the table readable.
const A = (
  kod: string,
  ad: string,
  tip: LedgerAccount['tip'],
  normalTaraf: LedgerAccount['normalTaraf'],
  hareketGorur: boolean,
  ustHesap?: string,
): LedgerAccount => ({
  kod,
  ad,
  tip,
  normalTaraf,
  hareketGorur,
  ustHesap,
  anaGrup: kod[0],
})

export const TDHP: LedgerAccount[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1 — DÖNEN VARLIKLAR (Current Assets)
  // ═══════════════════════════════════════════════════════════════════════
  A('1', 'Dönen Varlıklar', 'aktif', 'borc', false),

  A('10', 'Hazır Değerler', 'aktif', 'borc', false, '1'),
  A('100', 'Kasa', 'aktif', 'borc', true, '10'),
  A('101', 'Alınan Çekler', 'aktif', 'borc', true, '10'),
  A('102', 'Bankalar', 'aktif', 'borc', true, '10'),
  A('103', 'Verilen Çekler ve Ödeme Emirleri (-)', 'aktif', 'alacak', true, '10'),
  A('108', 'Diğer Hazır Değerler', 'aktif', 'borc', true, '10'),

  A('11', 'Menkul Kıymetler', 'aktif', 'borc', false, '1'),
  A('110', 'Hisse Senetleri', 'aktif', 'borc', true, '11'),
  A('111', 'Özel Kesim Tahvil Senet ve Bonoları', 'aktif', 'borc', true, '11'),
  A('112', 'Kamu Kesimi Tahvil Senet ve Bonoları', 'aktif', 'borc', true, '11'),
  A('118', 'Diğer Menkul Kıymetler', 'aktif', 'borc', true, '11'),
  A('119', 'Menkul Kıymetler Değer Düşüklüğü Karşılığı (-)', 'aktif', 'alacak', true, '11'),

  A('12', 'Ticari Alacaklar', 'aktif', 'borc', false, '1'),
  A('120', 'Alıcılar', 'aktif', 'borc', true, '12'),
  A('121', 'Alacak Senetleri', 'aktif', 'borc', true, '12'),
  A('122', 'Alacak Senetleri Reeskontu (-)', 'aktif', 'alacak', true, '12'),
  A('126', 'Verilen Depozito ve Teminatlar', 'aktif', 'borc', true, '12'),
  A('127', 'Diğer Ticari Alacaklar', 'aktif', 'borc', true, '12'),
  A('128', 'Şüpheli Ticari Alacaklar', 'aktif', 'borc', true, '12'),
  A('129', 'Şüpheli Ticari Alacaklar Karşılığı (-)', 'aktif', 'alacak', true, '12'),

  A('13', 'Diğer Alacaklar', 'aktif', 'borc', false, '1'),
  A('131', 'Ortaklardan Alacaklar', 'aktif', 'borc', true, '13'),
  A('132', 'İştiraklerden Alacaklar', 'aktif', 'borc', true, '13'),
  A('133', 'Bağlı Ortaklıklardan Alacaklar', 'aktif', 'borc', true, '13'),
  A('135', 'Personelden Alacaklar', 'aktif', 'borc', true, '13'),
  A('136', 'Diğer Çeşitli Alacaklar', 'aktif', 'borc', true, '13'),

  A('15', 'Stoklar', 'aktif', 'borc', false, '1'),
  A('150', 'İlk Madde ve Malzeme', 'aktif', 'borc', true, '15'),
  A('151', 'Yarı Mamuller - Üretim', 'aktif', 'borc', true, '15'),
  A('152', 'Mamuller', 'aktif', 'borc', true, '15'),
  A('153', 'Ticari Mallar', 'aktif', 'borc', true, '15'),
  A('157', 'Diğer Stoklar', 'aktif', 'borc', true, '15'),
  A('159', 'Verilen Sipariş Avansları', 'aktif', 'borc', true, '15'),

  A('18', 'Gelecek Aylara Ait Giderler ve Gelir Tahakkukları', 'aktif', 'borc', false, '1'),
  A('180', 'Gelecek Aylara Ait Giderler', 'aktif', 'borc', true, '18'),
  A('181', 'Gelir Tahakkukları', 'aktif', 'borc', true, '18'),

  A('19', 'Diğer Dönen Varlıklar', 'aktif', 'borc', false, '1'),
  A('190', 'Devreden KDV', 'aktif', 'borc', true, '19'),
  A('191', 'İndirilecek KDV', 'aktif', 'borc', true, '19'),
  A('192', 'Diğer KDV', 'aktif', 'borc', true, '19'),
  A('193', 'Peşin Ödenen Vergiler ve Fonlar', 'aktif', 'borc', true, '19'),
  A('195', 'İş Avansları', 'aktif', 'borc', true, '19'),
  A('196', 'Personel Avansları', 'aktif', 'borc', true, '19'),
  A('197', 'Sayım ve Tesellüm Noksanları', 'aktif', 'borc', true, '19'),

  // ═══════════════════════════════════════════════════════════════════════
  // 2 — DURAN VARLIKLAR (Non-Current Assets)
  // ═══════════════════════════════════════════════════════════════════════
  A('2', 'Duran Varlıklar', 'aktif', 'borc', false),

  A('22', 'Ticari Alacaklar (Uzun Vadeli)', 'aktif', 'borc', false, '2'),
  A('220', 'Alıcılar', 'aktif', 'borc', true, '22'),
  A('221', 'Alacak Senetleri', 'aktif', 'borc', true, '22'),

  A('24', 'Mali Duran Varlıklar', 'aktif', 'borc', false, '2'),
  A('240', 'Bağlı Menkul Kıymetler', 'aktif', 'borc', true, '24'),
  A('242', 'İştirakler', 'aktif', 'borc', true, '24'),
  A('245', 'Bağlı Ortaklıklar', 'aktif', 'borc', true, '24'),

  A('25', 'Maddi Duran Varlıklar', 'aktif', 'borc', false, '2'),
  A('250', 'Arazi ve Arsalar', 'aktif', 'borc', true, '25'),
  A('251', 'Yeraltı ve Yerüstü Düzenleri', 'aktif', 'borc', true, '25'),
  A('252', 'Binalar', 'aktif', 'borc', true, '25'),
  A('253', 'Tesis Makine ve Cihazlar', 'aktif', 'borc', true, '25'),
  A('254', 'Taşıtlar', 'aktif', 'borc', true, '25'),
  A('255', 'Demirbaşlar', 'aktif', 'borc', true, '25'),
  A('256', 'Diğer Maddi Duran Varlıklar', 'aktif', 'borc', true, '25'),
  A('257', 'Birikmiş Amortismanlar (-)', 'aktif', 'alacak', true, '25'),
  A('258', 'Yapılmakta Olan Yatırımlar', 'aktif', 'borc', true, '25'),
  A('259', 'Verilen Avanslar', 'aktif', 'borc', true, '25'),

  A('26', 'Maddi Olmayan Duran Varlıklar', 'aktif', 'borc', false, '2'),
  A('260', 'Haklar', 'aktif', 'borc', true, '26'),
  A('261', 'Şerefiye', 'aktif', 'borc', true, '26'),
  A('262', 'Kuruluş ve Örgütlenme Giderleri', 'aktif', 'borc', true, '26'),
  A('264', 'Özel Maliyetler', 'aktif', 'borc', true, '26'),
  A('267', 'Diğer Maddi Olmayan Duran Varlıklar', 'aktif', 'borc', true, '26'),
  A('268', 'Birikmiş Amortismanlar (-)', 'aktif', 'alacak', true, '26'),

  A('28', 'Gelecek Yıllara Ait Giderler ve Gelir Tahakkukları', 'aktif', 'borc', false, '2'),
  A('280', 'Gelecek Yıllara Ait Giderler', 'aktif', 'borc', true, '28'),
  A('281', 'Gelir Tahakkukları', 'aktif', 'borc', true, '28'),

  A('29', 'Diğer Duran Varlıklar', 'aktif', 'borc', false, '2'),
  A('291', 'Gelecek Yıllarda İndirilecek KDV', 'aktif', 'borc', true, '29'),
  A('293', 'Gelecek Yıllar İhtiyacı Stoklar', 'aktif', 'borc', true, '29'),

  // ═══════════════════════════════════════════════════════════════════════
  // 3 — KISA VADELİ YABANCI KAYNAKLAR (Short-Term Liabilities)
  // ═══════════════════════════════════════════════════════════════════════
  A('3', 'Kısa Vadeli Yabancı Kaynaklar', 'pasif', 'alacak', false),

  A('30', 'Mali Borçlar', 'pasif', 'alacak', false, '3'),
  A('300', 'Banka Kredileri', 'pasif', 'alacak', true, '30'),
  A('303', 'Uzun Vadeli Kredilerin Anapara Taksitleri', 'pasif', 'alacak', true, '30'),
  A('304', 'Tahvil Anapara Borç Taksit ve Faizleri', 'pasif', 'alacak', true, '30'),
  A('309', 'Diğer Mali Borçlar', 'pasif', 'alacak', true, '30'),

  A('32', 'Ticari Borçlar', 'pasif', 'alacak', false, '3'),
  A('320', 'Satıcılar', 'pasif', 'alacak', true, '32'),
  A('321', 'Borç Senetleri', 'pasif', 'alacak', true, '32'),
  A('322', 'Borç Senetleri Reeskontu (-)', 'pasif', 'borc', true, '32'),
  A('326', 'Alınan Depozito ve Teminatlar', 'pasif', 'alacak', true, '32'),
  A('329', 'Diğer Ticari Borçlar', 'pasif', 'alacak', true, '32'),

  A('33', 'Diğer Borçlar', 'pasif', 'alacak', false, '3'),
  A('331', 'Ortaklara Borçlar', 'pasif', 'alacak', true, '33'),
  A('335', 'Personele Borçlar', 'pasif', 'alacak', true, '33'),
  A('336', 'Diğer Çeşitli Borçlar', 'pasif', 'alacak', true, '33'),

  A('34', 'Alınan Avanslar', 'pasif', 'alacak', false, '3'),
  A('340', 'Alınan Sipariş Avansları', 'pasif', 'alacak', true, '34'),
  A('349', 'Alınan Diğer Avanslar', 'pasif', 'alacak', true, '34'),

  A('36', 'Ödenecek Vergi ve Diğer Yükümlülükler', 'pasif', 'alacak', false, '3'),
  A('360', 'Ödenecek Vergi ve Fonlar', 'pasif', 'alacak', true, '36'),
  A('361', 'Ödenecek Sosyal Güvenlik Kesintileri', 'pasif', 'alacak', true, '36'),
  A('368', 'Vadesi Geçmiş Ertelenmiş Taksit. Vergi ve Diğ. Yük.', 'pasif', 'alacak', true, '36'),
  A('369', 'Ödenecek Diğer Yükümlülükler', 'pasif', 'alacak', true, '36'),

  A('37', 'Borç ve Gider Karşılıkları', 'pasif', 'alacak', false, '3'),
  A('370', 'Dönem Karı Vergi ve Diğer Yasal Yük. Karşılıkları', 'pasif', 'alacak', true, '37'),
  A('371', 'Dönem Karının Peşin Ödenen Vergi ve Diğ. Yük. (-)', 'pasif', 'borc', true, '37'),
  A('372', 'Kıdem Tazminatı Karşılığı', 'pasif', 'alacak', true, '37'),
  A('373', 'Maliyet Giderleri Karşılığı', 'pasif', 'alacak', true, '37'),

  A('38', 'Gelecek Aylara Ait Gelirler ve Gider Tahakkukları', 'pasif', 'alacak', false, '3'),
  A('380', 'Gelecek Aylara Ait Gelirler', 'pasif', 'alacak', true, '38'),
  A('381', 'Gider Tahakkukları', 'pasif', 'alacak', true, '38'),

  A('39', 'Diğer Kısa Vadeli Yabancı Kaynaklar', 'pasif', 'alacak', false, '3'),
  A('391', 'Hesaplanan KDV', 'pasif', 'alacak', true, '39'),
  A('392', 'Diğer KDV', 'pasif', 'alacak', true, '39'),
  A('393', 'Merkez ve Şubeler Cari Hesabı', 'pasif', 'alacak', true, '39'),
  A('397', 'Sayım ve Tesellüm Fazlaları', 'pasif', 'alacak', true, '39'),

  // ═══════════════════════════════════════════════════════════════════════
  // 4 — UZUN VADELİ YABANCI KAYNAKLAR (Long-Term Liabilities)
  // ═══════════════════════════════════════════════════════════════════════
  A('4', 'Uzun Vadeli Yabancı Kaynaklar', 'pasif', 'alacak', false),

  A('40', 'Mali Borçlar', 'pasif', 'alacak', false, '4'),
  A('400', 'Banka Kredileri', 'pasif', 'alacak', true, '40'),
  A('405', 'Çıkarılmış Tahviller', 'pasif', 'alacak', true, '40'),
  A('409', 'Diğer Mali Borçlar', 'pasif', 'alacak', true, '40'),

  A('42', 'Ticari Borçlar', 'pasif', 'alacak', false, '4'),
  A('420', 'Satıcılar', 'pasif', 'alacak', true, '42'),
  A('421', 'Borç Senetleri', 'pasif', 'alacak', true, '42'),

  A('43', 'Diğer Borçlar', 'pasif', 'alacak', false, '4'),
  A('431', 'Ortaklara Borçlar', 'pasif', 'alacak', true, '43'),
  A('436', 'Diğer Çeşitli Borçlar', 'pasif', 'alacak', true, '43'),

  A('47', 'Borç ve Gider Karşılıkları', 'pasif', 'alacak', false, '4'),
  A('472', 'Kıdem Tazminatı Karşılığı', 'pasif', 'alacak', true, '47'),

  // ═══════════════════════════════════════════════════════════════════════
  // 5 — ÖZKAYNAKLAR (Equity)
  // ═══════════════════════════════════════════════════════════════════════
  A('5', 'Özkaynaklar', 'ozkaynak', 'alacak', false),

  A('50', 'Ödenmiş Sermaye', 'ozkaynak', 'alacak', false, '5'),
  A('500', 'Sermaye', 'ozkaynak', 'alacak', true, '50'),
  A('501', 'Ödenmemiş Sermaye (-)', 'ozkaynak', 'borc', true, '50'),

  A('52', 'Sermaye Yedekleri', 'ozkaynak', 'alacak', false, '5'),
  A('520', 'Hisse Senetleri İhraç Primleri', 'ozkaynak', 'alacak', true, '52'),
  A('522', 'MDV Yeniden Değerleme Artışları', 'ozkaynak', 'alacak', true, '52'),

  A('54', 'Kar Yedekleri', 'ozkaynak', 'alacak', false, '5'),
  A('540', 'Yasal Yedekler', 'ozkaynak', 'alacak', true, '54'),
  A('541', 'Statü Yedekleri', 'ozkaynak', 'alacak', true, '54'),
  A('542', 'Olağanüstü Yedekler', 'ozkaynak', 'alacak', true, '54'),

  A('57', 'Geçmiş Yıllar Karları', 'ozkaynak', 'alacak', false, '5'),
  A('570', 'Geçmiş Yıllar Karları', 'ozkaynak', 'alacak', true, '57'),

  A('58', 'Geçmiş Yıllar Zararları (-)', 'ozkaynak', 'borc', false, '5'),
  A('580', 'Geçmiş Yıllar Zararları (-)', 'ozkaynak', 'borc', true, '58'),

  A('59', 'Dönem Net Karı (Zararı)', 'ozkaynak', 'alacak', false, '5'),
  A('590', 'Dönem Net Karı', 'ozkaynak', 'alacak', true, '59'),
  A('591', 'Dönem Net Zararı (-)', 'ozkaynak', 'borc', true, '59'),

  // ═══════════════════════════════════════════════════════════════════════
  // 6 — GELİR TABLOSU HESAPLARI (Income Statement)
  // ═══════════════════════════════════════════════════════════════════════
  A('6', 'Gelir Tablosu Hesapları', 'gelir', 'alacak', false),

  A('60', 'Brüt Satışlar', 'gelir', 'alacak', false, '6'),
  A('600', 'Yurtiçi Satışlar', 'gelir', 'alacak', true, '60'),
  A('601', 'Yurtdışı Satışlar', 'gelir', 'alacak', true, '60'),
  A('602', 'Diğer Gelirler', 'gelir', 'alacak', true, '60'),

  A('61', 'Satış İndirimleri (-)', 'gider', 'borc', false, '6'),
  A('610', 'Satıştan İadeler (-)', 'gider', 'borc', true, '61'),
  A('611', 'Satış İskontoları (-)', 'gider', 'borc', true, '61'),
  A('612', 'Diğer İndirimler (-)', 'gider', 'borc', true, '61'),

  A('62', 'Satışların Maliyeti (-)', 'gider', 'borc', false, '6'),
  A('620', 'Satılan Mamuller Maliyeti (-)', 'gider', 'borc', true, '62'),
  A('621', 'Satılan Ticari Mallar Maliyeti (-)', 'gider', 'borc', true, '62'),
  A('622', 'Satılan Hizmet Maliyeti (-)', 'gider', 'borc', true, '62'),

  A('63', 'Faaliyet Giderleri (-)', 'gider', 'borc', false, '6'),
  A('630', 'Araştırma ve Geliştirme Giderleri (-)', 'gider', 'borc', true, '63'),
  A('631', 'Pazarlama Satış ve Dağıtım Giderleri (-)', 'gider', 'borc', true, '63'),
  A('632', 'Genel Yönetim Giderleri (-)', 'gider', 'borc', true, '63'),

  A('64', 'Diğer Faaliyetlerden Olağan Gelir ve Karlar', 'gelir', 'alacak', false, '6'),
  A('640', 'İştiraklerden Temettü Gelirleri', 'gelir', 'alacak', true, '64'),
  A('642', 'Faiz Gelirleri', 'gelir', 'alacak', true, '64'),
  A('643', 'Komisyon Gelirleri', 'gelir', 'alacak', true, '64'),
  A('645', 'Menkul Kıymet Satış Karları', 'gelir', 'alacak', true, '64'),
  A('646', 'Kambiyo Karları', 'gelir', 'alacak', true, '64'),
  A('649', 'Diğer Olağan Gelir ve Karlar', 'gelir', 'alacak', true, '64'),

  A('65', 'Diğer Faaliyetlerden Olağan Gider ve Zararlar (-)', 'gider', 'borc', false, '6'),
  A('653', 'Komisyon Giderleri (-)', 'gider', 'borc', true, '65'),
  A('654', 'Karşılık Giderleri (-)', 'gider', 'borc', true, '65'),
  A('655', 'Menkul Kıymet Satış Zararları (-)', 'gider', 'borc', true, '65'),
  A('656', 'Kambiyo Zararları (-)', 'gider', 'borc', true, '65'),
  A('659', 'Diğer Olağan Gider ve Zararlar (-)', 'gider', 'borc', true, '65'),

  A('66', 'Finansman Giderleri (-)', 'gider', 'borc', false, '6'),
  A('660', 'Kısa Vadeli Borçlanma Giderleri (-)', 'gider', 'borc', true, '66'),
  A('661', 'Uzun Vadeli Borçlanma Giderleri (-)', 'gider', 'borc', true, '66'),

  A('67', 'Olağandışı Gelir ve Karlar', 'gelir', 'alacak', false, '6'),
  A('671', 'Önceki Dönem Gelir ve Karları', 'gelir', 'alacak', true, '67'),
  A('679', 'Diğer Olağandışı Gelir ve Karlar', 'gelir', 'alacak', true, '67'),

  A('68', 'Olağandışı Gider ve Zararlar (-)', 'gider', 'borc', false, '6'),
  A('681', 'Önceki Dönem Gider ve Zararları (-)', 'gider', 'borc', true, '68'),
  A('689', 'Diğer Olağandışı Gider ve Zararlar (-)', 'gider', 'borc', true, '68'),

  A('69', 'Dönem Net Karı (Zararı)', 'gelir', 'alacak', false, '6'),
  A('690', 'Dönem Karı veya Zararı', 'gelir', 'alacak', true, '69'),
  A('691', 'Dönem Karı Vergi ve Diğer Yasal Yük. Karşılıkları (-)', 'gider', 'borc', true, '69'),
  A('692', 'Dönem Net Karı veya Zararı', 'gelir', 'alacak', true, '69'),

  // ═══════════════════════════════════════════════════════════════════════
  // 7 — MALİYET HESAPLARI (Cost Accounts — 7/A option)
  // ═══════════════════════════════════════════════════════════════════════
  A('7', 'Maliyet Hesapları', 'maliyet', 'borc', false),

  A('70', 'Maliyet Muhasebesi Bağlantı Hesapları', 'maliyet', 'borc', false, '7'),
  A('700', 'Maliyet Muhasebesi Bağlantı Hesabı', 'maliyet', 'borc', true, '70'),

  A('71', 'Direkt İlk Madde ve Malzeme Giderleri', 'maliyet', 'borc', false, '7'),
  A('710', 'Direkt İlk Madde ve Malzeme Giderleri', 'maliyet', 'borc', true, '71'),

  A('72', 'Direkt İşçilik Giderleri', 'maliyet', 'borc', false, '7'),
  A('720', 'Direkt İşçilik Giderleri', 'maliyet', 'borc', true, '72'),

  A('73', 'Genel Üretim Giderleri', 'maliyet', 'borc', false, '7'),
  A('730', 'Genel Üretim Giderleri', 'maliyet', 'borc', true, '73'),

  A('74', 'Hizmet Üretim Maliyeti', 'maliyet', 'borc', false, '7'),
  A('740', 'Hizmet Üretim Maliyeti', 'maliyet', 'borc', true, '74'),

  A('75', 'Araştırma ve Geliştirme Giderleri', 'maliyet', 'borc', false, '7'),
  A('750', 'Araştırma ve Geliştirme Giderleri', 'maliyet', 'borc', true, '75'),

  A('76', 'Pazarlama Satış ve Dağıtım Giderleri', 'maliyet', 'borc', false, '7'),
  A('760', 'Pazarlama Satış ve Dağıtım Giderleri', 'maliyet', 'borc', true, '76'),

  A('77', 'Genel Yönetim Giderleri', 'maliyet', 'borc', false, '7'),
  A('770', 'Genel Yönetim Giderleri', 'maliyet', 'borc', true, '77'),

  A('78', 'Finansman Giderleri', 'maliyet', 'borc', false, '7'),
  A('780', 'Finansman Giderleri', 'maliyet', 'borc', true, '78'),

  // ═══════════════════════════════════════════════════════════════════════
  // 9 — NAZIM HESAPLAR (Off-Balance-Sheet / Memorandum)
  // ═══════════════════════════════════════════════════════════════════════
  A('9', 'Nazım Hesaplar', 'nazim', 'borc', false),
  A('900', 'Nazım Hesaplar (Borçlu)', 'nazim', 'borc', true, '9'),
  A('910', 'Nazım Hesaplar (Alacaklı)', 'nazim', 'alacak', true, '9'),
]

// Fast lookup by code.
const byCode = new Map(TDHP.map(a => [a.kod, a]))

export function getAccount(kod: string): LedgerAccount | undefined {
  // Exact match first; otherwise fall back to the 3-digit parent (e.g. 120.01 -> 120).
  return byCode.get(kod) ?? byCode.get(kod.slice(0, 3))
}

export function accountName(kod: string): string {
  return getAccount(kod)?.ad ?? kod
}

// All postable (leaf) accounts — the ones that can appear on a journal line.
export const postableAccounts = TDHP.filter(a => a.hareketGorur)
