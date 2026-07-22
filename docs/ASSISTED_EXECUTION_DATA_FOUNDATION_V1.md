# Assisted Execution Data Foundation V1

## Amaç ve otorite sınırı

Assisted Execution, hazırlanmış işin yaşam döngüsü, güvenli kanıt snapshot'ı, açık varsayım, eksik girdi, versiyonlu artifact, insan kararı/düzenlemesi, yürütme olayı ve gözlenen sonucu için otoritedir. CRM, Teklifler, Satış Siparişleri, Finans ve Müşteri Sağlığı kendi kayıtları için otorite olmaya devam eder. Kaynak domain kaydı yalnız açık insan onayından sonra kontrollü domain transaction'ı ile oluşur.

V1 workflow'u `quote_preparation`, ruleset'i `quote-preparation-v1`, sürümü `1.0.0`'dır. Makine öğrenmesi veya dış AI sağlayıcısı kullanılmaz.

## Migration ve tablolar

- `20260722130000_assisted_execution_data_foundation_v1.sql`: dokuz tablo, company-scoped foreign key'ler, indeksler, RLS, kontrollü RPC'ler ve outcome trigger'ları.
- `20260722131500_assisted_execution_v1_hardening.sql`: kaynak değişmeden refresh idempotency'si, karşılaştırılabilir teklif sırası, doğru approval event'i ve düzenlenebilir cover-email artifact operasyonu.
- `20260722132500_fix_assisted_execution_retry_ambiguity.sql`: duplicate retry dalındaki PostgreSQL output-column belirsizliğini giderir.
- `20260722133500_harden_execution_responsible_role.sql`: hazırlama ve onay anında responsible user'ın aktif owner/employee olmasını doğrular.
- `20260722134500_clean_quote_preparation_lint.sql`: kullanılmayan hazırlama değişkenlerini kaldırır ve missing-price loop adını açıklaştırır.
- `20260722135000_finish_quote_preparation_lint.sql`: PostgreSQL integer-loop iterator'ının otomatik tanımına uygun son lint temizliğidir.

Tablolar:

- `execution_cases`: kontrollü case durumu, hedefler, sorumlu, ruleset, evidence quality, fingerprint ve yürütülen tek teklif bağlantısı.
- `execution_evidence`: PII/private-body taşımayan immutable güvenli kanıt.
- `execution_assumptions`: kaynağı ve confirmation durumu açık varsayım.
- `execution_missing_inputs`: blocking/non-blocking eksik bilgi ve kontrollü çözüm.
- `execution_artifacts`: `quote_draft`, `internal_review_summary`, `cover_email_draft` için immutable versiyon geçmişi; yalnız `superseded_at` kontrollü değişir.
- `execution_decisions`: approve, approve_with_edits, reject ve cancel için immutable insan kararı.
- `execution_field_edits`: önemli alanlarda önce/sonra değeri ve insan gerekçe kategorisi.
- `execution_events`: append-only workflow ve audit olayları.
- `execution_outcomes`: kaynak domain transition'larından gelen trusted observation.

Her ilişki mümkün olan yerde `(id, company_id)` composite foreign key ile korunur. `executed_quote_id` unique'tir. Her artifact türünde case başına yalnız bir supersede edilmemiş sürüm bulunur. Sorumlu/status/review/fingerprint sorguları için company-scoped indeksler vardır. Authenticated frontend'e yalnız `select` verilir; doğrudan insert/update/delete verilmez.

## Yaşam döngüsü ve kontrollü operasyonlar

Uygulanan durumlar: `detected → prepared → awaiting_review → approved → executing → executed → completed`; alternatif terminaller `rejected`, `expired`, `cancelled`, `failed`.

- `prepare_quote_execution_case`: company/party/contact/opportunity/quotation/sorumlu kapsamını doğrular, güvenli kanıtları toplar, deterministik fiyat kaynağı arar, missing input ve üç artifact üretir. Aynı source fingerprint için mevcut aktif case'i döndürür.
- `refresh_quote_execution_case`: aynı snapshot'ı idempotent tutar; kaynak değişirse replacement case üretir ve önceki case'i görünür biçimde kapatır.
- `resolve_execution_missing_input`: tip ve case durumunu server-side doğrular; delivery confirmation yalnız açık `true` ile çözülür.
- `save_quote_execution_review`: yeni quote artifact sürümü ve material field edits üretir; önceki sürümü silmez.
- `save_execution_text_artifact`: cover email subject/body değişikliğini yeni sürüm ve `wording` edit kayıtlarıyla saklar.
- `approve_quote_execution_case`: auth, company, operator, responsible user, lifecycle, blocking inputs, artifact ve quotation-required fields'i tekrar doğrular; case'i kilitler; normal teklif, version 1, items ve draft history kaydını mevcut quotation internalleriyle tek transaction içinde oluşturur; case'i bağlar ve outcome/event yazar. İç subtransaction başarısızsa quotation parçaları rollback olur, case `failed` ve güvenli error code ile denetlenebilir kalır.
- `retry_quote_execution_case`: yalnız failed ve daha önce onaylanmış case'i yeniden yürütür; oluşturulmuş teklif varsa aynı authoritative teklifi döndürür.
- `submit_execution_case_decision`: yalnız reject/cancel için kullanılır; rejection reason category zorunludur.

Outcome trigger'ları quotation status history, quotation version ve Sales Order creation kayıtlarından sırasıyla gönderim/görüntüleme/revizyon/terminal sonuç ve conversion observation üretir. UI davranışı outcome sayılmaz; viewed yalnız quotation domain'de gerçek bir transition varsa kaydedilir. Causality iddiası yoktur.

## Güvenlik ve kanıt sınırı

RLS bütün tablolarda etkindir. Owner/employee şirket kayıtlarını okur ve kontrollü operasyonları kullanır. Accountant şirket kayıtlarını salt okur; mutation RPC'leri `is_company_operator` ile reddedilir. Anonymous tablo erişimi yoktur. Cross-company okuma RLS, yazma RPC kontrolleri ve composite foreign key'lerle engellenir.

Evidence'a private veya sales-team activity body, description/outcome/note, telefon, adres, VKN/TCKN, IBAN, attachment, secret veya subjektif ilişki skoru kopyalanmaz. Company-visible activity'de yalnız güvenli title/type/completion metadata'sı kullanılır. Parasal değer kendi para biriminde kalır; FX veya cross-currency toplam yoktur.

## Doğrulama

`supabase/tests/assisted_execution_v1_remote.sql` linked Supabase Management API üzerinden tek transaction olarak çalışır ve `rollback` ile biter. Dokuz tablonun RLS/privilege durumunu, employee/owner operasyonunu, accountant read-only davranışını, anonymous ve cross-company denial'ı, company FK'lerini, kanıt mahremiyetini, idempotency'yi, blocking price/delivery'yi, immutable audit'i, atomik quotation oluşturmayı, failure rollback'ini, retry duplicate prevention'ı ve trusted outcome'ları doğrular. Sonrasında sentetik kullanıcı/şirket/case sayıları ayrı sorguda sıfırdır.

## Durum matrisi

| Yetenek | Durum |
|---|---|
| Reusable company-scoped Assisted Execution lifecycle | Implemented |
| Quote Preparation ruleset and three artifact types | Implemented |
| Human review, material edits, approve/reject/cancel/retry | Implemented |
| Atomic normal quotation draft | Implemented |
| Trusted quotation and Sales Order outcomes | Implemented |
| Shadow-mode-compatible records | Implemented |
| Later payment behavior linkage | Designed |
| Automatic external sending | Deferred |
| Autonomous policy/pricing/term changes | Deferred |
| Generic agent/workflow builder | Deferred |
