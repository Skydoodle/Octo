# Customer Health and Revenue Risk Data Foundation V1

## Amaç ve ilkeler

Customer Health V1, canonical Firma için mevcut yapılandırılmış ticari kayıtlardan deterministik, açıklanabilir, kanıta bağlı ve denetlenebilir assessment snapshot'ları üretir. Ruleset sürümü `customer-health-v1` olarak her snapshot'ta saklanır. Sonuç bir churn olasılığı, makine öğrenmesi çıktısı, gizli 0–100 puanı veya gelir kaybı tahmini değildir.

## Tablolar

- `customer_health_assessments`: geçerli ve tarihsel değerlendirme snapshot'ları.
- `customer_health_factors`: yön, önem, eşik, dönem, karşılaştırma ve öneri taşıyan açıklanabilir faktörler.
- `customer_health_evidence`: kaynak kayda güvenli referans; özel içerik veya PII kopyalamaz.
- `customer_health_currency_contexts`: sipariş, alacak ve teklif bağlamını para birimi bazında özetler.

Firma, assessment, factor ve evidence ilişkileri şirket kimliğiyle doğrulanır. Aynı Firma için yalnız bir current assessment vardır. Eski assessment, factor, evidence ve currency context satırları değiştirilemez tarihsel snapshot olarak korunur.

## İzin verilen ve dışlanan kaynaklar

Yalnız tamamlanmış/arşivlenmemiş Sales Order, geçerli Finance faturası ve tahsilatı, arşivlenmemiş teklif ve yalnız `company` görünür activity metadata'sı okunur. Draft/cancelled/archived kaynaklar kurala göre dışlanır. Private ve sales-team activity içeriği, açıklama/not, e-posta gövdesi, telefon, adres, VKN/TCKN, IBAN ve ek içeriği evidence'a yazılmaz.

Şikâyet, destek bileti, iade, sözleşme, ürün kullanımı, banka akışı, dış kredi skoru, web davranışı, e-posta açılması, WhatsApp ve görüşme transkripti kullanılmaz.

## V1 faktörleri ve eşikler

- `overdue_receivable`: 1–60 gün gecikme veya para birimi içindeki açık alacağın %20'si warning; 60 günü aşma veya %50 critical.
- `late_payment_pattern`: 180 günde en az iki uygun faturanın en az yarısı ve en az ikisi geçse warning; en az üç geç fatura ve ortalama en az 15 gün gecikme critical.
- `order_inactivity`: 365 günde en az üç tamamlanan sipariş ve son altı sipariş aralığının ortancası gerekir. En az 45 gün ve 1,5 kat warning; en az 75 gün ve 2 kat critical.
- `order_value_decline`: aynı para biriminde her iki 90 günlük dönemde en az ikişer sipariş gerekir. %30 düşüş warning, %50 düşüş critical; sıfır önceki değer karşılaştırılmaz.
- `quote_outcome_deterioration`: 180 günde en az üç terminal sonuçta kabul oranı %25'in altı veya ret+süre dolma en az üçse warning; en az dört terminal teklif ve sıfır kabul critical.
- `relationship_inactivity`: yalnız company-visible metadata; 60–89 gün warning, 90+ gün critical.
- Pozitif kanıtlar: 30 günde tamamlanan sipariş, 30 günde company-visible activity, 180 günde en az üç faturanın %80'inin vadesinde tahsili ve 90 günde kabul edilen teklif.

Pozitif faktör kritik veya warning kanıtını iptal etmez.

## Aggregation, yeterlilik ve güven

En az bir critical faktör veya Sales ve Finance'i birlikte içeren en az üç warning → `critical`; iki warning → `risky`; bir warning → `watch`. `healthy` yalnız sufficient veri, negatif uyarı olmaması ve pozitif/yakın tarihli kanıtla mümkündür. Diğer temiz fakat partial/insufficient durumlar `insufficient_data` olur. Doğrudan risk, veri geçmişi kısmi olsa bile görünür.

En az iki domain ve bunlardan orders veya Finance varsa sufficient; tek domain partial; qualifying kanıt yoksa insufficient. İki domain ve doğrudan evidence high confidence, tek domain medium, kanıtsız durum low'dur. Confidence churn olasılığı değildir.

## Para birimi ve gizlilik

Sipariş değeri, teklif değeri, açık/gecikmiş alacak ve exposure bağlamı TRY/EUR/USD/GBP için ayrı tutulur. Kur dönüşümü veya para birimleri arası toplam yoktur. Currency context “toplam risk altındaki gelir” olarak yorumlanmaz.

Evidence yalnız güvenli etiket, kaynak türü/UUID, gözlem tarihi ve gerekiyorsa o kaydın kendi para birimindeki tutarı taşır. Özel activity içeriği değerlendirme okuyucusuna sızmaz.

## Refresh, idempotency ve tarihçe

`refresh_customer_health_assessment` operator yetkisiyle Firma kapsamını kilitler, yalnız izinli kaynakları okur ve assessment/factor/evidence/context satırlarını tek transaction'da üretir. Şirket, Firma, evaluation date, ruleset ve PII içermeyen deterministic source fingerprint değişmemişse current snapshot yeniden kullanılır. Kaynak değişirse önceki current assessment supersede edilir ve yeni immutable snapshot oluşur.

`refresh_company_customer_health` customer rolü, tamamlanmış sipariş veya Finance geçmişi olan aktif Firmaları aynı tek-Firma mantığıyla işler; varsayılan 100, hard maximum 200'dür. Cron, Realtime veya otomatik scheduler yoktur.

## RLS ve roller

Owner/employee şirket assessment'larını okur ve refresh RPC'lerini çalıştırır. Accountant assessment, factor, evidence ve currency context'i salt okunur görür. Anonymous erişemez. Frontend doğrudan insert/update/delete yapamaz; hard delete yoktur. Cross-company erişim RLS ve şirket kapsamlı foreign key'lerle engellenir.

## Şirket özeti ve sınırlar

Repository; status dağılımı, yenilenmesi gereken assessment sayısı, en eski current tarih ve negatif factor-code dağılımı üretir. Para tutarlı exposure şirket toplamında birleştirilmez.

Bu fazda Customer Health veya Revenue Risk UI, Firma health görünümü, otomatik görev/aktivite/iletişim, churn modeli, makine öğrenmesi, Opportunity Scoring, Forecasting, Analytics, Sales Copilot ya da kaynak CRM/Sales/Finance mutasyonu yoktur.
