# Quotations Data Foundation V1

Bu aşama Satış ve Teklifler içindeki teklif yaşam döngüsünün güvenli veri ve TypeScript temelini oluşturur. Müşteriye dönük Teklif ekranı veya PDF üretimi eklenmemiştir.

## Tablolar ve ilişkiler

- `sales_quotes`: şirket, kanonik Firma, isteğe bağlı Kişi ve Fırsat, owner, ticari koşullar, durum, onay ve kabul kanıtı.
- `sales_quote_versions`: teklif başına sıralı, değiştirilemez versiyonlar ve sunucu tarafından hesaplanan toplamlar.
- `sales_quote_items`: versiyona bağlı, değiştirilemez teklif kalemleri ve satır hesapları.
- `sales_quote_status_history`: ilk Taslak kaydı ve kontrollü durum geçişlerinin append-only geçmişi.
- `sales_quote_number_counters`: şirket ve takvim yılı kapsamlı atomik numara sayacı.

Composite foreign key ve trigger kontrolleri Firma, Kişi, Fırsat, owner, teklif, versiyon ve kalemlerin aynı şirkete ait olmasını zorunlu kılar. Kişi seçili Firma’ya, Fırsat da seçili Firma’ya bağlı olmalıdır.

## Teklif numarası

`next_sales_quote_number` yalnız kontrollü veritabanı mantığı tarafından çağrılır. Şirket ve yıl için tek atomik UPSERT satırı kullanarak `TKL-YYYY-000001` biçiminde numara ayırır. Sayaç concurrency altında kilitlenir; şirketler birbirinden bağımsızdır ve yeni takvim yılında `000001` ile başlar. İptal veya arşiv numarayı geri bırakmaz.

## Versiyonlar ve hesaplamalar

`create_sales_quote` teklif, versiyon 1, kalemler, güncel-versiyon bağlantısı ve ilk durum geçmişini tek transaction içinde oluşturur. `create_sales_quote_revision`, teklif satırını kilitleyerek sıradaki versiyon numarasını üretir, önceki versiyonu salt geçmiş hâline getirir ve tam kalem setinden yeni güncel versiyonu oluşturur. Eski versiyon ve kalemler yerinde düzenlenmez.

Parasal satır değerleri PostgreSQL `numeric` ile hesaplanır ve her satır ara sonucu iki ondalığa, marj yüzdesi dört ondalığa yuvarlanır. PostgreSQL’in numeric `round` davranışı yarım değerleri sıfırdan uzağa yuvarlar. Versiyon toplamları yuvarlanmış satır sonuçlarının toplamıdır; frontend toplam gönderemez.

İndirim sonrası tutar vergi matrahıdır. KDV ve diğer vergi bu tutar üzerinden hesaplanır. Birim maliyet mevcutsa satır maliyeti ve marj hesaplanır. Versiyondaki herhangi bir kalemin maliyeti eksikse yanıltıcı kısmi toplam maliyet ve brüt marj üretilmez; bu alanlar `null` kalır. Tedarikçi maliyeti otomatik bağlanmaz.

## Durum geçişleri ve onay

`transition_sales_quote_status` yalnız tanımlı geçiş haritasını kabul eder. Kabul, ret, süresi doldu ve iptal V1’de terminaldir. Kabul için kanıt veya açık neden; ret ve iptal için neden zorunludur. İlgili zaman damgası aynı transaction içinde yazılır ve her başarılı geçiş tam bir history kaydı üretir. Kabul satış siparişi oluşturmaz.

`approval_required`, `approval_reason`, `approved_by` ve `approved_at` ilerideki onay arayüzü için temeldir. Taslak onaya gönderilebilir ve geri çekilebilir. V1’de onay bekleyen teklifi göndererek onaylama yalnız aktif company owner tarafından yapılabilir. Yapılandırılabilir eşik, manager rolü veya otomatik marj/indirim kararı yoktur.

## RLS ve arşiv

- Owner ve employee şirket tekliflerini okuyabilir; create, revision, transition ve yalnız aktif Taslak arşivleme RPC’lerini çağırabilir.
- Accountant etkin üye olduğu şirketin teklif, versiyon, kalem ve geçmişini salt okuyabilir.
- Anonymous erişim yoktur; şirketler arası okuma/yazma RLS ve RPC doğrulamalarıyla engellenir.
- Versiyonlar, kalemler ve history frontend için salt okunurdur. Sayaç frontend tarafından okunamaz veya yazılamaz.
- Authenticated frontend tablolarında hard delete yetkisi yoktur. Normal kaldırma yalnız Taslak teklif için `archive_sales_quote` ile `archived_at` yazar.

## TypeScript katmanı

`src/layers/sales/quotes` altında domain tipleri, doğrulama, deterministik hesaplamalar, durum/view-model yardımcıları ve şirket kapsamlı repository bulunur. Repository atomik create/revision/transition/archive RPC’lerini kullanır, arşiv kayıtlarını varsayılan olarak dışlar, ham hatayı internal `cause` alanında korurken tüketiciye güvenli typed hata sunar. Müşteri, kişi, fiyat veya vergi verisi loglanmaz.

## Bilinen sınırlar

- Teklif listesi, detay veya form UI yoktur.
- PDF, müşteri portalı, e-posta gönderimi ve elektronik imza yoktur.
- Kabul edilen tekliften satış siparişi oluşturulmaz.
- Yapılandırılabilir onay kuralları yoktur.
- Procurement maliyet/stok/tedarikçi senkronizasyonu yoktur.
- Finance, fatura, tahsilat veya `cariStore` senkronizasyonu yoktur.
- Realtime ve Excel teklif importu yoktur.
