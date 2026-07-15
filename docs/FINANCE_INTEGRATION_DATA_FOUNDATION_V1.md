# Finance Integration Data Foundation V1

## Amaç ve kanonik firma bağlantısı

Bu temel, yeni Finance kayıtlarını CRM'nin kanonik `public.business_parties` modeliyle doğrudan `party_id` üzerinden ilişkilendirir. VKN/TCKN yalnız snapshot, doğrulama, kesin mükerrer tespiti ve ilerideki kontrollü geçiş desteği için kullanılabilir; ilişki anahtarı değildir. Ayrı bir Cari veya müşteri tablosu oluşturulmamıştır.

## Tablolar

- `finance_accounts`: banka/nakit tahsilat hedefleri ve açılış bakiyesi
- `finance_invoices`: satış siparişine bağlı iç Octo alacak kaydı ve değiştirilemez firma/kişi snapshot'ı
- `finance_invoice_items`: satış siparişi kalemlerinin değiştirilemez ticari kopyası
- `finance_invoice_status_history`: eklemeli durum geçmişi
- `finance_payments`: değiştirilemez müşteri tahsilatı
- `finance_payment_allocations`: tahsilatın faturalara eklemeli dağıtımı
- `finance_document_number_counters`: şirket, belge türü ve yıl kapsamlı sayaç

## İç belge numaraları

Satış faturası referansı `FTR-YYYY-000001`, müşteri tahsilat referansı `THS-YYYY-000001` biçimindedir. Sayaçlar şirket, belge türü ve takvim yılı kapsamında atomik artar. İptal/arşiv numarayı serbest bırakmaz.

Bu numaralar yalnız Octo iç referanslarıdır. Yasal e-Fatura, e-Arşiv, GİB veya resmi muhasebe belge serisi oldukları iddia edilmez.

## Satış siparişinden faturaya dönüşüm

`create_sales_invoice_from_sales_order`, etkin ve tamamlanmış Sales Order satırını kilitler; aynı siparişin daha önce faturalanmadığını doğrular ve tek transaction içinde taslak satış faturası, kalemleri ve ilk geçmiş kaydını oluşturur. `party_id`, kişi, fırsat ve sorumlu doğrudan kopyalanır. Firma/kişi kimliği snapshot olarak saklanır. Para birimi, koşullar ve tüm toplamlar Sales Order'dan aynen alınır; frontend toplam veya kalem sağlayamaz.

Dönüşüm Sales Order, karşılama, teklif veya fırsatı değiştirmez; ödeme yaratmaz ve eski store/ledger akışına yazmaz.

## Snapshot ve durumlar

Kaynak sipariş, kanonik ilişkiler, kimlik snapshot'ı, para birimi, ticari toplamlar ve kalemler oluşturma sonrasında değiştirilemez. Durumlar: `draft`, `issued`, `partially_paid`, `paid`, `cancelled`.

- Taslak, kesinleştirilebilir (`issued`) veya gerekçeyle iptal edilebilir.
- Kesinleştirilmiş, tahsisatı yoksa gerekçeyle iptal edilebilir.
- `partially_paid` ve `paid` yalnız tahsilat tahsisleri tarafından belirlenir.
- İptal terminaldir.

`issued`, Octo iç alacağının kesinleştiğini ifade eder; yasal elektronik fatura gönderimi değildir.

## Gecikme ve alacak hesabı

`overdue` saklanan veya elle değiştirilen bir durum değildir. Kesinleştirilmiş/kısmen ödenmiş, açık bakiyesi pozitif ve vadesi değerlendirme tarihinden önce olan fatura deterministik olarak gecikmiş sayılır. Repository; açık alacak ve gecikmiş alacağı kur dönüşümü yapmadan para birimi bazında, ayrıca açık fatura sayısı, son fatura/tahsilat tarihleri ve vade takvimini sağlar. Yaşlandırma dilimleri güncel, 1–30, 31–60, 61–90 ve 90+ gündür.

## Tahsilat ve tahsisat

`record_customer_collection` aynı firma ve para birimindeki bir veya birden fazla kesinleşmiş faturayı kilitler. Hesap para birimini, her tahsisatın pozitif ve açık bakiyeyi aşmamasını doğrular; tek değiştirilemez tahsilat ve tahsisatlarını atomik oluşturur. Fatura `partially_paid` veya `paid` olur, açık/ödenen tutarlar ve geçmiş kayıtları güncellenir.

V1'de dağıtılmamış müşteri kredisi, fazla ödeme, kur dönüşümü, ters kayıt, silme, iade veya satın alma faturası ödemesi yoktur.

## Hesap bakiyesi

`current_balance` kolonu yoktur. Bakiye, açılış bakiyesi ile hesaba post edilmiş giriş/çıkış ödemelerinden deterministik türetilir. Bu sürüm yalnız müşteri tahsilatı (`inflow`) üretir. Kurgusal banka hesabı otomatik oluşturulmaz; ödemesi bulunan hesap arşivlenemez.

## Güvenlik

- Owner/employee: hesap oluşturma, tamamlanan siparişten taslak fatura oluşturma, izinli fatura geçişleri, müşteri tahsilatı, uygun taslak/boş hesap arşivi.
- Accountant: şirket hesapları, faturalar, kalemler, tahsilatlar, tahsisatlar ve geçmiş için salt okunur erişim.
- Anonymous: erişim yok.

Tüm sorgular `company_id` kapsamlıdır. RLS şirket üyeliğini doğrular; mutasyonlar `SECURITY DEFINER`, boş `search_path` ve operator kontrolü kullanan dar RPC'lerle yapılır. Frontend rollerine hard delete veya değiştirilemez tablolarda doğrudan yazım verilmez.

## Legacy Finance uyumluluk sınırı

`src/layers/finance/financeStore.ts` ve `src/layers/finance/cari/cariStore.ts` tarayıcı-yerel uyumluluk modelleri olarak değişmeden kalır. Mevcut Finance UI bu eski modeli kullanmaya devam eder. Yeni Supabase repository henüz görünür Finance UI kaynağı değildir.

- Otomatik migration veya iki yönlü senkronizasyon yoktur.
- VKN üzerinden sessiz kopyalama yoktur.
- Supabase faturası eski fatura sayılmaz; eski fatura Supabase faturası sayılmaz.
- Yeni kayıtlar legacy Muhasebe ledger'ına post edilmez; mükerrer muhasebe etkisi yaratılmaz.

Görünür üretim kesimi artık [FINANCE_UI_CUTOVER_V1.md](./FINANCE_UI_CUTOVER_V1.md) içinde belgelenmiştir. Bu kesim legacy kayıtları taşımamış veya senkronize etmemiştir; backend güvenlik ve atomiklik garantileri değişmemiştir.

## Mevcut sınırlar

Tam Firma 360 görünümü, fatura PDF'i, yasal e-Fatura/e-Arşiv, GİB/UBL, alış faturaları, tedarikçi ödemeleri, banka API'leri, kur dönüşümü, ters tahsilat, genel muhasebe postu, stok/Procurement etkileri, Customer Health, skor, tahmin ve analitik bu sürümde yoktur.
