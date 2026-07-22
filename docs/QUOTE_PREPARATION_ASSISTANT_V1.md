# Quote Preparation Assistant V1

## Kullanıcı akışı ve route'lar

- `/dashboard/satis/hazirlanan-isler`: gerçek hazırlanmış, review bekleyen, blocked ve failed case listesi.
- `/dashboard/satis/hazirlanan-isler/yeni`: explicit Firma/Fırsat/Teklif bağlamından hazırlama formu.
- `/dashboard/satis/hazirlanan-isler/:caseId`: Evidence, Proposed terms, Assumptions, Missing information, Risks ve Final action odaklı inceleme.

Entry point'ler Sales Workbench “Teklif hazırla”, açık Fırsat “Octo ile teklif hazırla” ve uygun Teklif “Octo ile hazırla” eylemleridir. Sayfa yüklemek case oluşturmaz. Mevcut `/dashboard/satis`, tüm deep route'lar, grouped navigation ve mobil yatay navigasyon korunur; “Hazırlanan İşler” Ticari İşlemler grubuna eklenir.

## Deterministik hazırlama

Karşılaştırılabilir teklifler önce aynı Firma ve aynı currency ile sınırlandırılır; sonra aynı product/service identifier veya normalize description, benzer quantity band, recency, accepted outcome ve varsa opportunity category sırasıyla değerlendirilir. Tie `quote_id` ile stabildir. Para birimleri dönüştürülmez.

Unit price kaynak sırası V1'de açık user input, latest same-party/same-currency accepted comparable ve latest relevant history'dir. Her öneride quotation/date/currency/quantity/outcome ile tarihsel discount type/value bağlamı saklanır ve kaynak teklif UI'dan açılabilir. Savunulabilir kaynak yoksa `unit_price` null kalır, blocking missing input oluşur ve sıfır fiyat uydurulmaz.

İndirim user input veya aynı satırın geçmiş bağlamı olarak açıklanır; tarihsel ortalama “optimal” veya policy sayılmaz. Repository'de company discount/approval policy olmadığı için policy uydurulmaz. Cost source olmadığı için margin safety hesaplanmaz veya iddia edilmez.

Payment terms açık input gerektirir; Finans gecikme kayıtları ve current Customer Health yalnız review warning/evidence üretir. Sistem vadeyi otomatik kısaltmaz, peşin ödeme dayatmaz veya risk nedeniyle teklifi tek başına bloklamaz. Validity açık tarih ister. Teslimat doğrulanmış Operations/Inventory kaynağına dayanmadığı için açık assumption ve blocking human confirmation'dır; stock, supplier availability veya delivery guarantee iddiası yoktur.

Evidence quality `high|medium|low|insufficient`, supporting records'ın completeness/comparability/recency gücünü anlatır; acceptance, churn veya gelir olasılığı değildir. Unresolved blocking input quality'yi `insufficient` yapar.

## Artifact ve inceleme

`quote_draft` normal quotation alanlarını ve satır başına `price_source` bilgisini taşır. Toplamlar UI'da mevcut quotation calculations ile sunulabilir; authoritative total, tax, decimal ve margin davranışı onay transaction'ında mevcut `insert_sales_quote_version` tarafından hesaplanır.

`internal_review_summary` kullanılan kanıtı, öneriyi ve insan değerlendirmesi gereken riskleri ayırır. `cover_email_draft` deterministic `quote-cover-v1` şablonudur, düzenlenebilir ve versiyonludur; `send_status` yalnız `not_sent` olabilir.

Material quote edits quantity, unit, description, price, discount, tax, payment, validity, delivery ve notes alanlarında field path, before/after ve category ile kaydedilir. Cover email subject/body değişiklikleri `wording` olarak izlenir. Keystroke monitoring yoktur. Override doğruluk kanıtı değil, disagreement/missing-context evaluation evidence'ıdır.

Blocking bilgiler UI'da ayrı görünür ve kontrollü çözülür. İnceleyen kişi taslağa satır ekleyebilir veya kaldırabilir; bu değişiklikler versiyon ve field edit olarak kaydedilir, satır fiyat blocker'ları server-side yeniden uzlaştırılır ve son satır UI'da kaldırılamaz. Original artifact overwrite edilmez. Onayda server aynı gerekli alanları tekrar doğrular ve normal quotation draft route'una bağlantı verir. Otomatik send, Sales Order veya Finance mutation yoktur.

## Sales Workbench entegrasyonu

“Octo hazırladı” gerçek case'leri company-scoped repository'den yükler; Firma, Fırsat, attention reason, state, evidence quality, blocking count ve review due date gösterir. Failed önce, awaiting review sonra deterministik sıralanır. Bu sıra mevcut “Bugün dikkat gerektirenler” öncelik algoritmasını değiştirmez. “Onayınızı bekliyor” hem real awaiting-review case'leri hem mevcut pending quotation approval kayıtlarını gösterir. Partial-error, retry, loading, empty, mobile ve accountant read-only davranışları korunur.

## Test ve sınırlamalar

Unit/repository/UI testleri fingerprint determinism, company/currency separation, ranking/ties, price attribution, missing zero-price davranışı, evidence quality, repository validation, execution failure visibility, Workbench integration, route/entry point, rejection reason, edit comparison ve no-send sınırını kapsar. Remote SQL suite security ve transaction davranışını doğrular.

V1'de external email/WhatsApp parsing, automatic customer communication, autonomous price/discount/payment/delivery decision, inventory/procurement/cost claim, scoring, forecasting, broad analytics, ML acceptance/churn model, cross-company learning, generic agent veya workflow builder yoktur.
