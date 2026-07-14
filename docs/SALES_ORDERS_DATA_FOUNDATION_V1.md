# Octo Sales Orders Data Foundation V1

## Kapsam

Bu faz, kabul edilmiş ve arşivlenmemiş bir teklifin tek işlem içinde satış siparişine dönüştürülmesi için güvenli Supabase ve TypeScript temelini sağlar. Müşteri ekranı, sipariş PDF'i, fatura, stok, Procurement veya Finance entegrasyonu içermez.

## Tablolar ve ilişkiler

- `sales_orders`: kabul edilen teklif ve güncel sürümüne bağlı, şirket kapsamlı ticari ve operasyonel sipariş kaydı.
- `sales_order_items`: kabul edilen teklif kalemlerinin değiştirilemez tam snapshot'ı.
- `sales_order_fulfillments`: sipariş başına 1'den başlayan, eklemeli karşılama/teslim kayıtları.
- `sales_order_fulfillment_items`: bir karşılamadaki sipariş kalemi ve miktarı.
- `sales_order_status_history`: ilk taslak dahil kontrollü durum geçmişi.
- `sales_order_number_counters`: şirket ve takvim yılına göre yarış güvenli numara sayacı.

Firma, kişi, fırsat ve sorumlu için mevcut kanonik kayıtlar yeniden kullanılmaktadır. Yeni müşteri, kişi, fırsat veya teklif tabloları oluşturulmamıştır.

## Sipariş numarası

Numaralar `SS-YYYY-000001` biçimindedir. Sayaç şirket ve takvim yılı kapsamında atomik `INSERT ... ON CONFLICT ... UPDATE` ile tahsis edilir. Yeni yıl `000001` ile başlar. İptal veya arşiv numarayı serbest bırakmaz; istemci numara seçemez.

## Kabul edilmiş teklif dönüşümü

`convert_accepted_quote_to_sales_order` yalnız aktif owner veya employee tarafından çağrılabilir. Teklif satırı kilitlenir; teklifin aynı şirkette, accepted, arşivlenmemiş, daha önce dönüştürülmemiş ve geçerli bir current version'a sahip olduğu doğrulanır.

RPC teklifin firma, kişi, fırsat, sorumlu, para birimi ve ticari koşullarını; güncel sürümün sunucu-onaylı toplamlarını; bütün değiştirilemez kalemlerini kopyalar. İlk `draft` geçmiş kaydı aynı transaction içinde oluşturulur. Hata durumunda numara, sipariş, kalem ve geçmiş dahil bütün işlem geri alınır. Fırsat aşaması veya beklenen değeri değiştirilmez.

## Değiştirilemez ticari snapshot

Dönüşümden sonra sipariş numarası, kaynak teklif/sürüm, müşteri bağlamı, sorumlu, para birimi, tarihler, ticari koşullar, toplamlar, maliyet ve marj alanları değiştirilemez. Sipariş kalemleri de doğrudan güncellenemez veya silinemez. Daha sonra Firmalar, Kişiler, Fırsatlar ya da Tekliflerde yapılan değişiklikler siparişi yeniden yazmaz.

V1'de sipariş revizyonu yoktur. Ticari değişiklikler için ileride kontrollü bir change-order modeli tasarlanmalıdır.

## Durum geçişleri

`transition_sales_order_status` şu geçişleri uygular:

- draft → confirmed veya cancelled
- confirmed → in_preparation veya cancelled
- in_preparation → partially_fulfilled, completed veya cancelled
- partially_fulfilled → completed veya cancelled

`completed` ve `cancelled` terminaldir. İptal nedeni zorunludur. Tamamlanma yalnız bütün kalem miktarları tamamen karşılandığında mümkündür. Aynı `partially_fulfilled` durumuna yapılan etkisiz çağrı yeni geçmiş oluşturmaz.

## Kısmi karşılama

`record_sales_order_fulfillment` yalnız confirmed, in_preparation veya partially_fulfilled ve arşivlenmemiş siparişlerde çalışır. En az bir pozitif miktar gerekir. Sipariş ve kalem satırları kilitlenir; şirket/sipariş ilişkisi ve kümülatif miktarın sipariş miktarını aşmaması doğrulanır.

Karşılama numarası sipariş başına atomik olarak artar. Header ve kalemler birlikte yazılır. Kısmi miktar siparişi `partially_fulfilled`, bütün kalemlerin tamamlanması `completed` yapar ve yalnız gerçek durum değişikliğinde bir geçmiş kaydı ekler.

Karşılama ve kalemleri eklemelidir. V1'de silme, geri alma veya düzeltme yoktur; gelecekte ayrı bir kontrollü düzeltme modeli gerekir.

## Arşiv davranışı

`archive_sales_order` yalnız aktif, fulfillment içermeyen `draft` siparişi arşivler. Onaylanmış, hazırlanmakta olan, kısmen/tamamen karşılanmış veya iptal edilmiş siparişler arşivlenemez. Kaynak teklif değişmez. Arşiv kayıtları repository listelerinde varsayılan olarak dışlanır ve yalnız `includeArchived` ile istenir.

## RLS ve roller

- Owner ve employee: şirket siparişlerini okur; kabul edilmiş teklifi dönüştürür; geçerli durum geçişi, karşılama ve güvenli taslak arşivi RPC'lerini kullanır.
- Accountant: şirket siparişlerini, kalemlerini, fulfillment kayıtlarını ve geçmişi salt okunur görür.
- Anonymous: erişemez.
- Şirketler arası erişim `is_company_member` RLS politikaları ve RPC içindeki `is_company_operator` doğrulamasıyla engellenir.

Kalem, fulfillment, fulfillment kalemi ve geçmiş için doğrudan istemci yazma yetkisi yoktur. Sayaçlara doğrudan erişim verilmez. Authenticated frontend rolüne hard delete verilmez.

## TypeScript repository

`src/layers/sales/orders` şirket kapsamlı liste/detay sorguları, teklif bağlantısı, atomik dönüşüm, durum geçişi, karşılama ve arşiv fonksiyonlarını içerir. Ham Supabase hatası dahili `cause` alanında korunur; gelecek UI'ya güvenli Türkçe hata döner. Fiyat, vergi, marj, müşteri veya teslimat verisi loglanmaz.

## Bilinen sınırlar

- Sales Order UI, sipariş/irsaliye PDF'i ve manuel sipariş oluşturma yoktur.
- Fatura oluşturma, fatura durumu veya tahsilat yoktur.
- Stok rezervasyonu, depo hareketi ve sevkiyat entegrasyonu yoktur.
- Procurement ihtiyacı, satın alma siparişi veya tedarikçi senkronizasyonu yoktur.
- Finance `cariStore` ile senkronizasyon yoktur; geçici uyumluluk sınırı devam eder.
- Karşılama geri alma/düzeltme ve ticari sipariş revizyonu yoktur.
- Realtime ve Excel Sales Order aktarımı yoktur.
