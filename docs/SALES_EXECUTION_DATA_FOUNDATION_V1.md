# Sales Execution Data Foundation V1

Bu aşama Satış ve Teklifler’in ticari yürütme veri temelini oluşturur. Müşteriye dönük yeni ekran eklenmemiştir.

## Veri modeli

- `sales_leads`: nitelendirme öncesi Potansiyel Müşteri kaydı, atama, sonraki eylem ve atomik dönüşüm sonuçları.
- `sales_pipelines`: şirket-kapsamlı, arşivlenebilir pipeline tanımı.
- `sales_pipeline_stages`: sıralı aşamalar, varsayılan olasılık, durgunluk eşiği ve kapalı sonuç bilgisi.
- `sales_opportunities`: kanonik `business_parties` kaydına bağlı Fırsat, sorumlu, değer, kapanış ve sonraki eylem bilgisi.
- `sales_opportunity_contacts`: fırsat ile mevcut `business_contacts` arasındaki çoklu ilişki; fırsat başına en fazla bir birincil kişi.
- `sales_activities`: Potansiyel Müşteri, Firma veya Fırsatla ilişkili aktivite ve görevler.
- `sales_opportunity_stage_history`: aşama geçişlerinin append-only geçmişi.

Composite foreign key’ler Firma, Kişi, Pipeline, Aşama, Fırsat ve Aktivite ilişkilerinin aynı şirkete ait olmasını zorunlu kılar. Normal uygulama akışında hard delete yoktur; mutable ana kayıtlar `archived_at` ile arşivlenir.

## Varsayılan pipeline

Her mevcut ve yeni şirket için `Standart Satış Pipeline’ı` atomik ve idempotent biçimde sağlanır. Dokuz aşama sırasıyla Yeni fırsat, İhtiyaç belirlendi, Görüşme yapıldı, Çözüm hazırlanıyor, Teklif gönderildi, Müzakere, Karar bekleniyor, Kazanıldı ve Kaybedildi’dir. Kazanıldı %100, Kaybedildi %0 olasılıklı kapalı aşamalardır. Migration tekrar çalıştırıldığında aynı stage key’leri çoğaltılmaz.

## Potansiyel Müşteri dönüşümü

`convert_sales_lead` yalnız etkin owner/employee tarafından çağrılır ve tek transaction içinde iki yol destekler:

1. Aynı şirketteki mevcut Firma’ya bağlanma, isteğe bağlı Kişi ve Fırsat oluşturma.
2. Kanonik `business_parties` üzerinde yeni Firma, prospect rolü, isteğe bağlı Kişi ve Fırsat oluşturma.

Dönüşüm Firma, Kişi ve Fırsat kimliklerini kaynağa yazar. Dönüştürülmüş, uygun bulunmamış veya arşivlenmiş kayıt yeniden dönüştürülemez. Herhangi bir doğrulama hatası tüm işlemi geri alır.

## Aşama geçişleri

`move_sales_opportunity_stage` hedef şirket, pipeline ve aşamayı doğrular. Kaybedildi için neden zorunludur; Kazanıldı/Kaybedildi zamanları trigger ile yönetilir. V1’de kapalı fırsat yeniden açılamaz. Her başarılı gerçek aşama değişikliği tam bir stage-history satırı üretir. Varsayılan olasılık, kullanıcı tarafından açıkça farklılaştırılmamışsa yeni aşamanın olasılığına taşınır.

## Aktivite görünürlüğü

- `company`: tüm etkin şirket üyeleri.
- `sales_team`: etkin owner ve employee üyeleri.
- `private`: yalnız oluşturan kullanıcı.

Accountant; Potansiyel Müşteri, Pipeline, Aşama, Fırsat, stage history ve `company` görünürlüklü aktiviteleri okuyabilir. Yazamaz, dönüştüremez veya aşama taşıyamaz; `sales_team` ve `private` aktiviteleri okuyamaz. Anonymous erişim yoktur. RLS ve controlled RPC’ler nihai güvenlik otoritesidir.

## TypeScript katmanı

`src/layers/sales/execution` altında domain tipleri, normalize/doğrulama yardımcıları, şirket-kapsamlı repository ve deterministik view-model hesapları bulunur. Repository arşivlenmiş kayıtları varsayılan olarak dışlar, ham Supabase hatasını internal `cause` içinde korur ve UI için güvenli hata mesajı üretir. Dönüşüm ve aşama geçişi frontend’de çoklu sorguyla taklit edilmez; atomik RPC kullanılır.

Deterministik kurallar; sonraki eylem eksikliği, durgunluk, kapanış gecikmesi, görev vadesi, aşama olasılığı ve ağırlıklı değer hesabını içerir. Bunlar AI veya fırsat skoru değildir.

## Bilinen sınırlar

- Potansiyel Müşteri, Fırsat, Pipeline, Aktivite veya Görev ekranı eklenmemiştir.
- Teklifler, satış siparişleri, fırsat skoru, müşteri sağlığı, tahmin ve Satış Asistanı uygulanmamıştır.
- Excel aktarımı yeni execution tablolarını kapsamaz.
- Realtime etkinleştirilmemiştir.
- Finans `cariStore` ile CRM senkron değildir; Firma 360 henüz yoktur.
- Teklif/marj, stok, tedarik, fatura ve tahsilat bağlantıları sonraki aşamalardadır.
