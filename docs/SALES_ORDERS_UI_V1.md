# Sales Orders UI V1

## Kapsam

Satış Siparişleri kullanıcı arayüzü, Sales Orders Data Foundation V1 üzerindeki şirket kapsamlı repository ve kontrollü RPC'leri kullanır. Üretim verisi tarayıcıda tutulmaz; siparişler yalnız kabul edilmiş tekliflerden atomik olarak oluşturulur.

## Rotalar ve gezinme

- `/dashboard/satis/satis-siparisleri`: liste, filtreler, teslimat gecikmesi ve karşılama ilerlemesi
- `/dashboard/satis/satis-siparisleri/:orderId`: değiştirilemez ticari kopya, kalemler, toplamlar, karşılama ve durum geçmişi

Satış ve Teklifler iç gezinmesinde Satış Siparişleri, Teklifler'in ardından gelir. Manuel sipariş oluşturma rotası yoktur.

## Kabul edilmiş tekliften dönüşüm

Kabul edilmiş, arşivlenmemiş ve henüz siparişe dönüşmemiş tekliflerde owner ve employee kullanıcıları `Satış siparişi oluştur` işlemini görür. Onay ekranı teklif sürümünü, firma/kişi/fırsat bağlamını, sorumluyu, para birimini, sunucu toplamını, kalem sayısını ve ticari koşulları gösterir. Kullanıcı yalnız sipariş tarihi, beklenen teslimat tarihi ve iç not ekleyebilir. Dönüşüm yalnız `convertAcceptedQuoteToSalesOrder` üzerinden yapılır; arayüz toplam veya kalem göndermez.

Mevcut sipariş varsa ikinci dönüşüm sunulmaz; sipariş numarası, durum ve karşılama oranıyla bağlantı gösterilir.

## Liste ve detay

Liste; sipariş/firma araması, durum, sorumlu, firma, para birimi, sipariş ve teslimat tarih aralıkları, gecikme, karşılama ve arşiv filtrelerini destekler. Toplamlar sunucunun doğruladığı sipariş snapshot'ından gelir.

Detay ekranı siparişin kabul edilmiş teklif sürümünün değiştirilemez ticari kopyası olduğunu açıkça belirtir. Kalemlerde sipariş edilen, karşılanan ve kalan miktarlar bulunur. Karşılama kayıtları, durum geçmişi ve kaynak teklif/firma/fırsat bağlantıları salt okunur geçmiş olarak sunulur. Eksik maliyet halinde kısmi veya yanıltıcı marj gösterilmez.

## Durum işlemleri

Tüm açık durum değişiklikleri `transitionSalesOrderStatus` kullanır:

- Taslak: onaylama, iptal, güvenli arşivleme
- Onaylandı: hazırlamaya başlama, karşılama, iptal
- Hazırlanıyor / Kısmen karşılandı: karşılama, iptal
- Tamamlandı / İptal edildi: terminal, işlem yok

İptal gerekçe ister. Tamamlanma normalde son karşılama kaydının sunucu tarafından tüm miktarları tamamladığının doğrulanmasıyla oluşur. Fatura oluşturulmaz.

## Karşılama

`recordSalesOrderFulfillment` yalnız kalan miktarı bulunan kalemlerle çağrılır. En az bir pozitif miktar gerekir; önizleme seçilen kalemleri ve beklenen ilerlemeyi gösterir. Yetkili sonuç durumu, kümülatif miktar ve tamamlanma kararı Supabase tarafından belirlenir. Başarıdan sonra sipariş, kalemler, karşılamalar ve durum geçmişi yeniden yüklenir.

Karşılama kayıtları eklemelidir. V1'de düzenleme, silme, geri alma veya düzeltme akışı yoktur.

## Yetkiler

- Owner ve employee: görüntüleme, teklif dönüşümü, geçerli durum değişiklikleri, karşılama ve güvenli taslak arşivi.
- Accountant: sipariş, kalem, karşılama ve geçmiş için salt okunur görünüm.
- Anonymous: dashboard akışına erişemez.

Arayüz yetkileri üyelik rolünden türetir; nihai otorite RLS ve kontrollü RPC'lerdir.

## Entegrasyonlar

Firma ve fırsat detayında sınırlı sipariş özetleri; teklif detayında dönüşüm veya bağlı sipariş görünümü bulunur. Firma Detayı, Firma 360 olarak adlandırılmaz. Sipariş oluşturma teklif veya fırsat durumunu otomatik değiştirmez.

## Erişilebilirlik ve duyarlılık

Ekranlar mobil kart düzeni, etiketli alanlar, klavye ile çalışabilen düğmeler, odak yöneten mevcut modal bileşeni, açık yükleme/hata/boş durumları ve server onayından sonra başarı bildirimi kullanır.

## Bilinen sınırlar

- Manuel sipariş oluşturma, ticari düzenleme ve sipariş revizyonu yoktur.
- Karşılama düzeltmesi/geri alma yoktur.
- Sipariş veya teslimat PDF'i yoktur.
- Fatura, tahsilat, stok, depo, envanter veya Procurement bağlantısı yoktur.
- Finance cariStore ile senkronizasyon yoktur ve mevcut uyumluluk sınırı korunur.
