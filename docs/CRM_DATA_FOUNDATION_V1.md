# CRM Data Foundation V1

`public.business_parties`, Octo’nun gelecekteki kanonik ticari taraf modelidir. Bir ticari taraf aynı anda müşteri ve tedarikçi rollerini taşıyabilir; roller `public.business_party_roles` içinde ayrı ve birlikte tutulur. `public.business_contacts`, aynı ticari taraf için birden fazla kişiyi destekler.

## Geçici Cari uyumluluk sınırı

Mevcut `src/layers/finance/cari/cariStore.ts`, Finans özellikleri için tarayıcıda çalışan geçici uyumluluk modelidir. Bu aşamada silinmemiş, değiştirilmemiş veya yeni CRM modeliyle otomatik olarak eşitlenmemiştir. Herhangi bir otomatik veri geçişi yapılmaz.

Bir sonraki veri geçişi aşaması, eski Cari kayıtlarını `business_parties` modeline güvenli ve tekrarlanabilir biçimde aktaran köprüyü açıkça tanımlamalıdır. Finans faturaları bugün Cari kayıtlarını VKN üzerinden eşleştirmeye devam eder; fatura, içe aktarma ve demo seed davranışları bu aşamada değişmemiştir.

CRM fırsatları, aktiviteler, teklifler, pipeline aşamaları, puanlama, satış tahmini ve müşteri sağlığı özellikleri bilinçli olarak sonraki aşamalara ertelenmiştir.

## Sales & Offers UI Foundation V1

Firmalar, Firma Detayı ve Kişiler ekranları yalnızca `business_parties`, `business_party_roles` ve `business_contacts` kayıtlarını CRM repository üzerinden kullanır. Tarayıcı-local bir CRM kaynağı oluşturulmamıştır.

Finans tarafı geçici Cari uyumluluk modelinde kalmaya devam eder; CRM ve Cari modelleri senkron değildir. Sonraki entegrasyon aşaması iki model arasındaki açık, denetlenebilir köprüyü tanımlayacaktır. Finans bağlantısı kurulmadan Firma Detayı “Firma 360” olarak adlandırılmayacak ve bu ekranda bakiye, fatura veya tahsilat bilgisi gösterilmeyecektir.
