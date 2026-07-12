# CRM UI Foundation V1

Satış ve Teklifler kullanıcı arayüzü bugün yalnızca **Firmalar**, **Firma Detayı** ve **Kişiler** alanlarını içerir. Bu ekranların üretim veri kaynağı Supabase üzerindeki `business_parties`, `business_party_roles` ve `business_contacts` tablolarıdır.

## Excel içe aktarma kapsamı

Excel’den aktar akışı yalnızca Firmalar ve Kişiler kayıtlarını destekler. `.xlsx`, `.xls` ve `.csv` dosyaları önce tarayıcıda analiz edilir; tür ve sütun eşlemesi kontrol edildikten, satırlar doğrulanıp önizlendikten ve kullanıcı açıkça onay verdikten sonra mevcut CRM repository fonksiyonlarıyla yazılır.

Firma aktarımı `createBusinessParty`, kişi aktarımı `createBusinessContact` üzerinden yapılır. Firma rolleri atomik `create_business_party` RPC’siyle oluşturulur. Kişiler yalnızca kesin VKN/TCKN veya kesin normalize firma adı eşleşmesiyle bağlanır; çözülemeyen veya birden çok eşleşen satırlar açık kullanıcı seçimi olmadan yazılmaz. Şablonlardaki örneklerin tamamı kurgusaldır.

## Geçici Finans uyumluluk sınırı

Finans `cariStore` modeli CRM ile hâlâ senkron değildir. İçe aktarılan CRM firmaları otomatik olarak Finans carisi olmaz; Cari kayıtları da CRM’e otomatik aktarılmaz. Bu iki model arasındaki denetlenebilir köprü ayrı bir entegrasyon aşamasında tanımlanacaktır.

## Ertelenen alanlar

Satış ve Teklifler modülünün tamamı ileride şu alanları içerecektir; bunlar bu sürümde uygulanmış değildir:

- lead yönetimi
- fırsatlar
- pipeline
- aktiviteler
- teklifler
- satış siparişleri
- müşteri sağlığı
- fırsat puanlama
- satış tahmini
- performans analitiği
