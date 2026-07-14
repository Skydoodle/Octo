# Octo Quotations UI and PDF V1

## Kapsam

Bu faz, mevcut Quotations Data Foundation V1 üzerinde çalışan müşteri arayüzünü ve müşteri-güvenli PDF belgesini sağlar. Üretim kaynağı Supabase’deki `sales_quotes`, değiştirilemez teklif sürümleri, kalemler ve durum geçmişidir; tarayıcıda ayrı bir teklif veri deposu yoktur.

## Rotalar

- `/dashboard/satis/teklifler`: teklif listesi ve filtreler
- `/dashboard/satis/teklifler/yeni`: çok bölümlü teklif oluşturma
- `/dashboard/satis/teklifler/:quoteId`: teklif, sürüm ve durum detayı
- `/dashboard/satis/teklifler/:quoteId/revizyon`: mevcut sürümden yeni, değiştirilemez sürüm oluşturma

## Liste, oluşturma ve detay

Liste firma, kişi, fırsat, sorumlu, tarih, para birimi, durum, onay ve arşiv bağlamını gösterir. Toplamlar mevcut sürümün sunucuda hesaplanmış değerlerinden okunur.

Oluşturma akışı firma, isteğe bağlı kişi/fırsat, sorumlu, ticari tarihler ve koşullar ile en az bir teklif kalemi ister. Kişiler ve fırsatlar seçilen firmaya göre sınırlandırılır. Kalemler eklenebilir, çoğaltılabilir, kaldırılabilir ve yeniden sıralanabilir. Tarayıcıdaki hesaplama yalnız teyit önizlemesidir; RPC’ye hesaplanmış toplam gönderilmez ve kayıt sonrasında Supabase değerleri yeniden yüklenir.

Detay ekranı güncel sürümün kalemlerini ve sunucu toplamlarını, bütün sürümleri, durum geçmişini ve sınırlı owner onay bilgisini gösterir. Geçmiş sürümler kendi değiştirilemez kalemleri ve toplamlarıyla salt okunur açılır.

## Revizyon ve durum yönetimi

Revizyon, güncel sürümü başlangıç olarak kullanır fakat mevcut sürümü değiştirmez. Revizyon notu ve tam ikame kalem seti `createSalesQuoteRevision` üzerinden gönderilir. Önceki sürümler korunur. Arşivli ve terminal teklifler revize edilemez.

Bütün durum değişiklikleri `transitionSalesQuoteStatus` üzerinden yapılır. Arayüz yalnız mevcut durumdan izin verilen hedefleri gösterir. Kabul için kanıt veya gerekçe; ret ve iptal için gerekçe zorunludur. Kabul, satış siparişi oluşturmaz.

Onay V1’de bilerek sınırlıdır: owner ve employee bir taslağı onaya gönderebilir, ancak bekleyen teklifi onaylayıp gönderildi durumuna yalnız aktif owner taşıyabilir. Otomatik eşikler, yönetici rolü, çoklu onaycı veya yapılandırılabilir onay zinciri yoktur.

## PDF uygulaması

PDF üretimi için `pdfmake` kullanılır. Bu seçim tarayıcıda çevrimdışı üretim, Vite uyumu, paket içindeki Roboto fontuyla Türkçe karakterler ve seçilebilir/aranabilir metin sağladığı için yapılmıştır. PDF üretimi durum değişikliği yapmaz.

Belge, seçilmiş değiştirilemez sürümden deterministik olarak oluşturulur ve şunları içerebilir:

- mevcut şirket adından satıcı adı;
- teklif numarası, sürüm, ticari durum ve tarihler;
- firma adı/unvanı, kayıtlı vergi ve adres bilgisi;
- seçilen kişinin uygun iletişim bilgileri;
- açıklama, miktar, birim, birim fiyat, indirim, KDV ve satır toplamları;
- ara toplam, indirim, vergiler ve genel toplam;
- ödeme, teslimat, beklenen teslimat ve müşteriye açık notlar;
- geçerlilik, imza alanı, belge numarası, üretim tarihi ve sayfa numarası.

PDF hiçbir zaman iç notları, birim maliyetlerini, marjları, onay nedenlerini, özel aktiviteleri veya Finance verisini içermez. Tarihsel PDF, seçilen sürümün kendi kalem ve toplamlarını kullanır. Dosya adı `Teklif_<quote-number>_v<version>.pdf` biçiminde güvenli hale getirilir.

## Firma ve fırsat bağlantıları

Firma ve fırsat detayları son bağlantılı teklifleri salt okunur özet olarak gösterir. Owner ve employee bu bağlamdan teklif oluşturabilir; firma/fırsat güvenilir şekilde önceden seçilir. Teklif oluşturmak veya durumunu değiştirmek fırsat aşamasını ya da beklenen değerini otomatik değiştirmez.

## Yetkiler

- Owner ve employee teklif oluşturabilir, revizyon oluşturabilir, izinli durum işlemlerini yapabilir, uygun taslakları arşivleyebilir ve PDF kullanabilir.
- Yalnız owner bekleyen onayı onaylayabilir.
- Accountant teklifleri, sürümleri, kalemleri ve geçmişi salt okunur görür; müşteri-güvenli PDF’yi önizleyip indirebilir.
- Anonymous erişim yoktur. Veritabanı RLS ve RPC denetimleri nihai yetki kaynağıdır.

## Erişilebilirlik ve responsive davranış

Form alanları görünür etiketler, ilişkili uyarılar ve açık düğme türleri kullanır. Mevcut odak yöneten modal bileşeni terminal işlemleri ve PDF önizlemesinde kullanılır. Kart ve kalem düzenleri mobilde tek sütuna düşer; sayfa seviyesinde yatay taşma gerektirmez.

## Bilinen sınırlar

- Satış siparişi ve tekliften siparişe dönüşüm yoktur.
- Dış e-posta, mesaj, WhatsApp, müşteri portalı, elektronik imza ve herkese açık teklif bağlantısı yoktur.
- Yapılandırılabilir onay kuralları yoktur.
- Procurement maliyet/tedarik senkronizasyonu yoktur.
- Finance `cariStore` geçici uyumluluk modeli olmaya devam eder ve CRM/teklif verisiyle senkronize değildir.
- Stok, fatura, tahsilat, Realtime ve Excel teklif aktarımı bu fazın dışındadır.
