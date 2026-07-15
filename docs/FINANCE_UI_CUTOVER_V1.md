# Finance UI Cutover V1

## Üretim kaynağı ve route'lar

Kimliği doğrulanmış şirketlerde Finance'in tek görünür ve yetkili kaynağı Supabase'teki Finance Integration Data Foundation'dır. Route'lar `/dashboard/finans`, `/alacaklar`, `/faturalar`, `/faturalar/:invoiceId`, `/tahsilatlar`, `/tahsilatlar/:paymentId` ve `/hesaplar` alt yollarıdır. Tüm sorgular etkin `company_id` ile repository üzerinden yapılır.

`financeStore`, `cariStore` ve legacy ledger yalnız izole demo/uyumluluk kodudur. Üretim ekranları bunları okumaz veya yazmaz; otomatik localStorage migration, VKN eşleştirmesi, senkronizasyon ve ledger postu yoktur.

## Görünür işlevler

- Genel Bakış; açık/gecikmiş alacak, 30 gün içindeki vadeler ve kaydedilmiş tahsilatları para birimi bazında gösterir.
- Hesaplar; açılış bakiyesi ile Octo'da kaydedilen tahsilatlardan türetilen “Octo kayıt bakiyesi”ni ayırır. Bu doğrulanmış veya canlı banka bakiyesi değildir.
- Tamamlanmış Satış Siparişi, değiştirilemez ticari snapshot üzerinden atomik olarak iç satış faturası kaydına çevrilir. Bu işlem yasal e-Fatura/e-Arşiv göndermez.
- Faturalar taslaktan kesinleştirilir; tahsisat yoksa gerekçeyle iptal edilebilir. Kısmi/tam tahsil durumu yalnız kontrollü tahsilat RPC'siyle oluşur.
- Alacaklar güncel, 1–30, 31–60, 61–90 ve 90+ yaşlandırma dilimleriyle ve para birimi ayrılarak gösterilir.
- Tahsilat aynı Firma, para birimi ve etkin hesap kapsamında bir veya birden fazla açık faturaya atomik tahsis edilir. Tahsilat ve tahsisatlar V1'de değiştirilemez; ters kayıt, silme, iade, fazla ödeme ve dağıtılmamış kredi yoktur.
- Firma Detayı “Finansal durum” bölümü canonical `party_id` ile son faturaları, tahsilat tarihini ve açık alacağı gösterir. Bu hâlâ tam Firma 360 değildir.

## Dashboard, 30 Gün ve reasoning

Üretim Finance pulse değerleri Supabase açık alacak, gecikmiş alacak, 30 gün vadeli alacak ve bu ay kaydedilen tahsilatlardan gelir. Para birimleri kur kaynağı olmadan toplanmaz. Kesinleşmiş/kısmen tahsil edilmiş faturaların açık bakiyesi vade tarihinde “beklenen tahsilat” sinyali olur; taslak, iptal, ödenmiş ve arşivlenmiş faturalar hariçtir.

Başlangıç nakdi doğrulanmış banka verisine dayanmadığından 30 Gün görünümü güvenilir koşan bakiye veya nakit pisti üretmez. Vergi, İK ve Operasyon çıkış sinyalleri korunur. Coverage; Supabase hesap/fatura/tahsilat varlığını değerlendirir ve banka mutabakatı, gider/borç takibi, kur dönüşümü ile nakit pistini engelli yetenekler olarak açıklar.

## Import ve izinler

Üretimde legacy Finance Excel seçenekleri devre dışıdır ve kullanıcıya “Finans Excel aktarımı yeni şirket veri modeline henüz bağlanmadı. Bu aşamada kayıtları Finans ekranlarından oluşturun.” açıklaması gösterilir. Dosya sessizce atılmaz.

Owner/employee hesap, fatura dönüşümü/durum işlemi, uygun arşiv ve tahsilat yapabilir. Accountant hesapları, faturaları, alacakları, tahsilat/tahsisat ve Firma finans bağlamını salt okunur görür. RLS ve kontrollü RPC'ler nihai yetki sınırıdır.

## Bilinen sınırlar

Yasal e-Fatura, e-Arşiv, GİB, PDF, satın alma faturası, tedarikçi/gider ödemesi, banka bağlantısı/mutabakatı, kur dönüşümü, genel muhasebe postu, stok/Procurement etkisi, Customer Health, skor, forecast ve analitik yoktur.
