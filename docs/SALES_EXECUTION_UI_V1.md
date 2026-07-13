# Sales Execution UI V1

## Kapsam

Satış ve Teklifler modülü artık Supabase Sales Execution Data Foundation V1 üzerinde çalışan Potansiyel Müşteriler, Fırsatlar, Pipeline ve Aktiviteler ve Görevler ekranlarını içerir. Üretim verisinin kaynağı execution repository katmanıdır; tarayıcıda ayrı bir üretim veri deposu oluşturulmaz.

## Rotalar

- `/dashboard/satis/potansiyel-musteriler`
- `/dashboard/satis/potansiyel-musteriler/:leadId`
- `/dashboard/satis/firsatlar`
- `/dashboard/satis/firsatlar/:opportunityId`
- `/dashboard/satis/pipeline`
- `/dashboard/satis/aktiviteler`

Mevcut Firmalar ve Kişiler rotaları aynı modül navigasyonunda korunur.

## Potansiyel müşteri ve dönüşüm

Liste ve detay ekranları arama, durum, atama, kaynak, geciken takip ve arşiv filtrelerini destekler. Oluşturma ve düzenleme mevcut validation/repository katmanlarını kullanır. Dönüşümde kullanıcı mevcut bir Firma seçer veya yeni Firma tanımlar, isteğe bağlı kişi oluşturur ve fırsat bilgilerini onay özetinde kontrol eder.

Dönüşüm yalnız `convertSalesLead` üzerinden, tek atomik RPC çağrısıyla yapılır. UI gereksinimlerini atomik olarak taşıyabilmek için conversion RPC’si beklenen değer, para birimi, owner, kapanış tarihi, ürün ilgisi ve sonraki eylem alanlarıyla dar kapsamlı biçimde genişletilmiştir. Başarı, Supabase işlemi tamamlanmadan gösterilmez; dönüştürülmüş lead yeniden dönüştürülemez.

## Fırsatlar ve Pipeline

Fırsat listesi şirket kapsamlı filtreler, arşiv görünümü ve deterministik gecikme/durgunluk/sonraki eylem uyarıları sunar. Bunlar AI veya skor değildir. Detay ekranı genel bilgiler, sonraki eylem, bağlı kişiler, aktiviteler ve aşama geçmişini gösterir.

Pipeline kolonları veritabanındaki stage sırasını izler. Masaüstünde sürükle-bırak desteklenir; klavye ve mobil kullanım için her kartta açık `Aşamayı değiştir` seçeneği vardır. Her hareket yalnız `moveSalesOpportunityStage` ile yapılır. Kaybedildi aşaması neden ister; kapalı fırsat V1’de yeniden açılamaz; başarılı geçiş tek bir history kaydı üretir.

## Aktiviteler ve görevler

Birleşik ekran Bugün, Geciken, Bu hafta, Tüm aktiviteler, Bana atanan ve Ekibime atanan görünümlerini sağlar. Arama yerine ilişkili lead, Firma veya fırsat seçilerek arama/telefon/toplantı/e-posta kaydı/mesaj kaydı/not/görev/dosya paylaşımı kaydı oluşturulur. Bu kayıtlar dışarıya e-posta veya mesaj göndermez. Görev tamamlama `completeSalesTask` ile, diğer değişiklikler execution repository ile yapılır.

## Yetkiler

- Owner ve employee: oluşturma, düzenleme, arşivleme, lead dönüştürme, aşama taşıma ve görev tamamlama.
- Accountant: lead, fırsat ve Pipeline için salt okunur; aktivite görünürlüğü veritabanı RLS kurallarınca yalnız şirket görünürlüklü kayıtlarla sınırlandırılır. Yazma kontrolleri gösterilmez.
- Private aktiviteler yalnız creator tarafından, sales-team aktiviteleri owner ve employee tarafından görülebilir. RLS nihai güvenlik katmanıdır.

Tüm repository çağrıları aktif `company_id` ile kapsamlanır.

## Erişilebilirlik ve responsive davranış

Form alanları etiketlidir, modal odak yönetimi mevcut ortak bileşenle sağlanır, buton tipleri açıktır ve yükleme/hata/boş durumları gerçeği yansıtır. Pipeline’ın seçime dayalı aşama değiştirme kontrolü sürükle-bırak kullanamayan kişiler için klavye erişimli alternatiftir. Dar ekranlarda kart tabanlı düzen ve yatay kaydırılabilir stage/navigasyon kullanılır.

## Bilinen sınırlar

- Teklifler, teklif PDF’leri ve satış siparişleri yoktur.
- Skorlama, tahminleme, analitik, müşteri sağlığı ve Sales Copilot yoktur.
- Pipeline yapılandırma arayüzü ve Realtime yoktur.
- Lead/fırsat/aktivite Excel importu yoktur.
- Finance `cariStore` geçici uyumluluk modeli olarak ayrı kalır; CRM verileriyle senkronize değildir. Firma Detayı, Finance bağlantısı kurulmadan Firma 360 olarak adlandırılmaz.
