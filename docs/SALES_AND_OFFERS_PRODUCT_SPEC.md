# Octo Satış ve Teklifler — Product Specification

> **Product layer:** Satış ve Teklifler
>
> **Status:** Active product specification
>
> **Current implementation stage:** CRM Foundation and Firmalar/Kişiler UI
>
> **Primary audience:** Product, engineering, design and go-to-market
>
> **Source of truth:** This document
>
> **Last updated:** 12 Temmuz 2026
>
> **Version:** 1.0

Bu belge, Satış ve Teklifler için dağınık ve gayriresmî özellik listelerinin yerini alır. [CRM veri temeli](./CRM_DATA_FOUNDATION_V1.md) ile [CRM UI temeli](./CRM_UI_FOUNDATION_V1.md) belgelerini veya bu belgelerdeki uyumluluk uyarılarını geçersiz kılmaz.

## 1. Ürün tezi

Octo Satış ve Teklifler yalnızca kişi kayıtlarının tutulduğu bir veritabanı, PDF teklif üreticisi veya genel amaçlı CRM kopyası değildir. Firma ile başlayan ticari ilişkinin gelire ve tahsilata dönüşmesini yöneten çalışma katmanıdır:

**Firma → Kişi → Potansiyel Müşteri → Fırsat → Aktivite → Teklif → Satış Siparişi → Fatura → Tahsilat → Müşteri Sağlığı → Yenileme / yeni fırsat**

Temel vaat:

> “Kiminle görüştüğünüzü, hangi fırsatın ilerlediğini, sırada ne yapmanız gerektiğini ve bunun gelir, marj ve nakit akışına nasıl yansıyacağını tek yerde görün.”

CRM, Octo içinde ayrı bir üst seviye ürün katmanı değildir; Satış ve Teklifler’in ilişki ve fırsat motorudur.

## 2. Ürün sınırları

| Alan | Sorumluluk |
|---|---|
| **Satış ve Teklifler** | Müşteri ilişkileri, potansiyel müşteriler, fırsatlar, satış aktiviteleri, teklifler, satış siparişleri, tahmin ve ticari zekâ |
| **Operasyon / Satın Alma** | Tedarikçiler, satın alma siparişleri, mal kabul, tedarik maliyeti ve tedarikçi performansı |
| **Finans** | Faturalar, tahsilatlar, alacaklar, ödeme geçmişi, nakit akışı ve muhasebe |
| **Hukuk ve Denetim** | Sözleşmeler, onaylar, uyum, kanıt ve denetim izleri |

Bu alanlar ayrı ürün sorumluluklarını korur; kanonik ticari taraf verisini paylaşır ve ileride birlikte akıl yürütür. Tedarikçi rolü ortak modelde bulunabilir, ancak tedarik ve satın alma süreçleri Satış ve Teklifler’e taşınmaz.

## 3. Kanonik ticari taraf ve Firma 360 hedefi

Tek bir kanonik ticari taraf; potansiyel müşteri, müşteri, tedarikçi, iş ortağı, başka bir ticari karşı taraf veya aynı anda müşteri ve tedarikçi olabilir. Ortak modelin amacı CRM, Finans ve Satın Alma içinde aynı kuruluş için kopuk ve yinelenen kayıtları önlemektir.

Uzun vadeli **Firma 360** görünümü şunları bir araya getirir: firma bilgileri, kişiler, fırsatlar, aktiviteler, teklifler, satış siparişleri, faturalar, tahsilatlar, ödeme davranışı, sözleşmeler, müşteri sağlığı, riskler, dosyalar ve denetim geçmişi.

Bugünkü Firma Detayı, Firma 360 değildir. Finans `cariStore` geçici ve ayrı bir tarayıcı modelidir; CRM ile senkron değildir. Bu nedenle mevcut ekranda Finans bakiyesi, fatura veya tahsilat ilişkisi varmış gibi davranılmaz.

## 4. Tam modül haritası

Nihai navigasyon:

- **Genel Bakış:** Bugün dikkat gerektiren ticari işleri ve açıklanabilir özetleri gösterir.
- **Firmalar:** Kanonik ticari tarafları ve rollerini yönetir. **Uygulandı.**
- **Kişiler:** Firmalara bağlı ticari kişileri yönetir. **Uygulandı.**
- **Potansiyel Müşteriler:** Henüz nitelendirilmemiş talebi yönetir.
- **Fırsatlar:** Satış öncesindeki merkezi ticari işlemleri yönetir.
- **Pipeline:** Fırsatların aşama ve ilerleme görünümüdür.
- **Aktiviteler ve Görevler:** Görüşme, takip ve sonraki eylemleri yönetir.
- **Teklifler:** Teklifin hazırlanmasından kabul ve revizyona kadar ticari süreci yönetir.
- **Satış Siparişleri:** Kabul edilen teklifin teslimat ve faturaya dönüşümünü yönetir.
- **Satış Tahmini:** Taahhüt, beklenen ve potansiyel geliri ayrıştırır.
- **Müşteri Sağlığı:** Müşteri Sağlığı ve Gelir Riski’ni kanıtlarıyla açıklar.
- **Satış Performansı:** Tanımlı ve denetlenebilir ticari metrikleri sunar.

Bugün ayrıca Firma Detayı, Firmalar Excel aktarımı ve Kişiler Excel aktarımı uygulanmıştır. Diğer tüm bölümler tasarlanmış fakat uygulanmamıştır; navigasyonda görünmemelidir.

## 5. Genel Bakış

Genel Bakış dekoratif bir dashboard değil, “Bugün neyle ilgilenmeliyim?” sorusunun yanıtıdır. Şunları kapsar: bugünkü takipler, geciken görevler, sonraki eylemi olmayan veya hareketsiz fırsatlar, süresi yaklaşan ve yanıt bekleyen teklifler, bu ay beklenen anlaşmalar, müşteri gelir-riski uyarıları, son ticari aktiviteler, taahhüt edilen gelir, olasılık ağırlıklı beklenen gelir, toplam potansiyel pipeline ve öngörülen satışlardan beklenen nakit tahsilatı.

Üretimde uydurma değer, örnek metrik veya gerçek veriye dayanmayan placeholder kullanılamaz.

## 6. Firmalar

Firma kanonik ticari varlıktır. Birden çok rol, yaşam döngüsü durumu, sorumlu çalışan, sektör, konum, kaynak ve etiketler desteklenmelidir; özel alanlar sonraki aşamadadır. Normal kaldırma arşivleme ile, tekrar kayıtların birleştirilmesi ise iz bırakan merge ile yapılır; yıkıcı silme yapılmaz. Aktivite geçmişi, Finans bağlantısı ve müşteri sağlığı bağlantısı aşamalı olarak eklenir.

Tekrar sinyalleri: kesin normalize VKN/TCKN, normalize firma adı, e-posta alan adı, web sitesi alan adı, telefon ve kişi e-postasıdır. Yalnızca kesin ve yüksek güvenli eşleşmeler oluşturmayı otomatik engelleyebilir. Bulanık eşleşmeler uyarı üretir; otomatik birleştirme yapmaz.

## 7. Kişiler

Bir firmaya birden fazla kişi bağlanabilir. Kayıt; birincil kişi, unvan, departman, iletişim bilgileri, tercih edilen kanal, ilişki rolü, karar rolü, notlar, arşiv geçmişi ve hukuken gerekli olduğunda iletişim izinlerini içerir.

Karar rolleri: **Karar Verici, Etkileyici, Teknik Değerlendirici, Kullanıcı, Satın Alma, Finans, Onaylayan, Diğer.** Karar vericiyi bilmek, yalnızca bir telefon numarası saklamaktan farklıdır: satışın kim tarafından, hangi ölçütlerle ve hangi paydaşların etkisiyle karara bağlanacağını açıklar.

## 8. Potansiyel Müşteriler

Potansiyel müşteri, henüz nitelendirilmemiş taleptir. Kişi/şirket, iletişim bilgileri, kaynak, ürün-hizmet ilgisi, sorumlu satışçı, durum, tahmini değer, nitelendirme notları, sonraki eylem ve tarihi ile oluşturulma tarihini taşır.

Varsayılan durumlar: **Yeni, İletişime geçilecek, İletişime geçildi, Nitelendiriliyor, Uygun, Uygun değil, Dönüştürüldü.** Uygun bir kayıt firma, kişi ve fırsata tek atomik işlemle dönüşür; aynı veriler yeniden girilmez. Uygun bulunmama nedeni kaydedilir.

## 9. Fırsatlar

Fırsat, teklif veya satış öncesindeki merkezi ticari işlemdir. Zorunlu alanlar: başlık, firma, bağlı kişiler, sorumlu, pipeline, aşama, beklenen değer, para birimi, beklenen kapanış tarihi, ürün/hizmet ilgisi, sonraki eylem ve sonraki eylem tarihi.

Ek alanlar: olasılık, tahmin kategorisi, beklenen marj, kaynak, öncelik, müşteri ihtiyacı, karar süreci, rakipler, etkin teklif, kayıp nedeni, teslimat uygulanabilirliği ve ticari risk.

> **Ürün kuralı:** Açık ve nitelendirilmiş bir fırsat sonraki eylemsiz kalmamalıdır.

Eksik sonraki eylem görünür biçimde işaretlenir.

## 10. Pipeline

Pipeline yapılandırılabilir olmalı; güçlü varsayılan aşamalar şunlardır:

1. Yeni fırsat
2. İhtiyaç belirlendi
3. Görüşme yapıldı
4. Çözüm hazırlanıyor
5. Teklif gönderildi
6. Müzakere
7. Karar bekleniyor
8. Kazanıldı
9. Kaybedildi

Her aşama varsayılan olasılık, beklenen azami süre, zorunlu alanlar, önerilen eylemler, durgunluk eşiği, giriş ve çıkış tarihlerini taşır. UI; Kanban ve liste görünümü, filtreler, sorumlu, değer, beklenen kapanış, aşamadaki gün, sonraki eylem, fırsat skoru ve risk göstergesi sunar. Kaybedildi için kayıp nedeni zorunludur. Kazanıldı ticari geçmişi korur ve aşağı akış dönüşümünü başlatabilir.

## 11. Aktiviteler ve Görevler

Aktivite türleri: arama, toplantı, e-posta, WhatsApp/mesaj, not, görev, teklif gönderimi, dosya paylaşımı, aşama değişikliği, satış siparişi olayı, fatura olayı ve ödeme olayıdır. Her aktivite tarih-saat, sorumlu, firma, kişi, fırsat, açıklama, sonuç, sonraki eylem, tamamlanma, ek ve görünürlük içerir.

Görev görünümleri: **Bugün, Geciken, Bu hafta, Bana atanan, Ekibime atanan, Fırsata bağlı, Firmaya bağlı.** Uzun vadede CRM, Finans ve Operasyon olayları birleşik kronolojik timeline’da görünür.

İç not görünürlüğü: tüm şirket, satış ekibi veya yalnızca oluşturan. İlk sürümlerde açık insan onayı olmadan dış mesaj gönderilmez.

## 12. Teklifler

Teklif yalnız PDF değildir. Alanlar: teklif numarası ve versiyonu, firma, kişi, fırsat, sorumlu, düzenleme/geçerlilik tarihleri, para birimi, fiyat listesi, kalemler, miktar, birim, birim fiyat, indirim, KDV ve diğer vergiler, ara toplam, toplam, ödeme/teslimat koşulları, teslimat tarihi, ticari koşullar, iç notlar ve müşteriye açık notlar.

Durumlar: **Taslak, Onay bekliyor, Gönderildi, Görüntülendi, Müşteri revizyon istedi, Kabul edildi, Reddedildi, Süresi doldu, İptal edildi.**

Yetenekler: markalı PDF, versiyon ve durum geçmişi, revizyon ve versiyon karşılaştırma, kopyalama, isteğe bağlı iç onay, indirim onay eşiği, asgari marj kontrolü, maliyet bazlı marj, geçerlilik uyarıları, kabul kanıtı, satış siparişine ve kazanılmış fırsata dönüşüm. Bir fırsatta birden çok teklif versiyonu olabilir, ancak yalnızca bir güncel ticari versiyon bulunur. Etkin teklif oluştuğunda fırsat değeri normalde ondan türetilir.

## 13. Satış Siparişleri

Akış: **Kabul edilen teklif → satış siparişi → karşılama/teslimat → fatura → tahsilat.**

Alanlar: sipariş numarası, firma, kişi, kaynak teklif/fırsat, sipariş ve beklenen teslimat tarihi, ürün-hizmetler, miktar, fiyat, indirim, vergi, toplam, ödeme/teslimat koşulları, sorumlu ve notlar. Durumlar: **Taslak, Onaylandı, Hazırlanıyor, Kısmen karşılandı, Tamamlandı, Faturalandı, İptal edildi.**

Kısmi karşılama, teslimat takibi, kalan miktar, iptal nedeni, fatura bağlantısı, tamamlanma geçmişi ve stok/girdi yetersizliğinde satın alma ihtiyacı sinyali desteklenir. Satış siparişi, satın alma siparişi değildir.

## 14. Müşteri takibi

Takip; son/sonraki aktivite, son sipariş, normal sipariş sıklığı, teklif geçmişi, etkin fırsatlar, açık görevler, yanıtsız iletişimler ve ileride açık faturalar, ödeme davranışı, sözleşme yenilemeleri ile şikâyet/destek sinyallerini kapsar. Unutulan takipler ve hareketsiz hesaplar görünür olur.

Toplantı hazırlığı: firma özeti, ana kişiler, açık fırsatlar, son teklif ve sipariş, ileride açık alacaklar, önceki itirazlar, karar vericiler ve kanıta dayalı görüşme önerileri.

## 15. Müşteri Sağlığı ve Gelir Riski

Müşteriye dönük terim **Müşteri Sağlığı ve Gelir Riski**’dir; açıklamasız kara kutu churn yüzdesi değildir. İlk seviyeler: **Sağlıklı, İzlenmeli, Riskli, Kritik, Yetersiz veri.**

Sinyaller; sipariş sıklığı/değerinde düşüş, olağandışı satın alma aralığı, düşen teklif kabulü, gecikmiş fatura/ödeme, ihtilaf, iade, çözülmemiş şikâyet, iletişim hareketsizliği, ana kişi kaybı, yaklaşan sözleşme bitişi, ürün çeşitliliği düşüşü, kayıp fırsat ve marj bozulmasıdır.

Her sonuç durum, kanıt, tarih aralığı, normal davranıştan değişim, önerilen sonraki eylem ve güven/veri yeterliliği gösterir. Örnek: “Riskli: Müşterinin normal sipariş aralığı 28–40 gün. Son siparişin üzerinden 67 gün geçti. Son iki fatura gecikmeli ödendi ve son teklif süresi doldu.” Makine öğrenimi ancak yeterli tarihsel veri sonrasında değerlendirilir.

## 16. Fırsat skorlama

İlk model açıklanabilir ve kural tabanlıdır:

- **İlişki kalitesi:** karar verici, paydaş kapsamı, anlamlı görüşme ve etkileşim kalitesi.
- **İlerleme:** aşama, aşamadaki süre, teklif gönderim/görüntülenme, koşul görüşmesi, kapanış tarihi.
- **Aktivite disiplini:** son aktivite, sonraki eylem, gecikme ve takip tutarlılığı.
- **Müşteri kalitesi:** satın alma/ödeme geçmişi, mevcut ilişki, gecikmiş faturalar, yoğunlaşma riski.
- **Ticari kalite:** marj, indirim, büyüklük, teslimat uygulanabilirliği ve ürün bulunabilirliği.

Çıktı; 0–100 skor, olumlu/risk faktörleri, eski veri uyarısı, veri yeterliliği ve önerilen sonraki eylem içerir. Açıklamasız skor gösterilmez. İleride şirket dönüşüm geçmişi, sektör örüntüleri, mahremiyet koruyan kolektif örüntüler, satışçı davranışı ve yapılandırılmamış notlar kullanılabilir; küresel model başka şirketin ham verisini açığa çıkaramaz.

## 17. Octo Satış Asistanı

Octo Satış Asistanı, Satış ve Teklifler içindeki akıllı deneyimdir: önerilen sonraki adım, günlük satış özeti, fırsat riski açıklaması, takip hatırlatması, teklif üst yazısı/takip e-postası/toplantı özeti taslağı, toplantı hazırlığı, yenileme ve yeniden etkinleştirme önerisi, kayıp analizleri, müşteri riski ve satış tahmini açıklaması.

Öneriler kaynak kayıtları belirtir; taslaklar insan onayı gerektirir. İlk sürümlerde otonom dış gönderim, görünmez kayıt değişikliği veya kanıtsız iddia yoktur. Önemli eylemler denetlenebilir; düşük güven ve eksik veri açıkça belirtilir.

## 18. Satış tahmini

Üç kategori:

- **Taahhüt:** ekibin açıkça taahhüt ettiği anlaşmalar.
- **Beklenen:** olasılık ağırlıklı tahmin.
- **Potansiyel:** uygun toplam pipeline.

Boyutlar: ay, çeyrek, satışçı, ekip, ürün/hizmet, müşteri, aşama, para birimi, marj ve ileride beklenen tahsilat tarihi. Finans bağlantısı şu ayrımı kurmalıdır: “Beklenen satış geliri 780.000 TL, ancak müşteri vadelerine göre aynı ay içinde beklenen tahsilat 410.000 TL.” Teklif, fırsat, taahhütlü sipariş, faturalanmış gelir ve tahsil edilmiş nakit ayrı tutulur; pipeline muhasebe geliri değildir.

## 19. Satış performansı ve müşteri kârlılığı

Metrikler: yeni/nitelikli potansiyel müşteri, dönüşüm, açık/ağırlıklı pipeline, kazanılan/kaybedilen gelir, kazanma oranı, ortalama anlaşma, satış döngüsü, aşama dönüşümü ve süresi, teklif üretim/kabul/süre dolma oranı, indirim, beklenen ve ileride gerçekleşen marj, kayıp nedenleri, aktivite, takip tamamlama, tahmin doğruluğu, satışçı ve ürün/hizmet performansı, ileride müşteri kârlılığı.

Her metrik pay, payda, tarih mantığı, hariç tutmalar, para birimi davranışı ve veri kaynağını tanımlar. Çalışanlar açıklamasız AI skoruyla sıralanmaz.

Uzun vadeli müşteri kârlılığı; gelir, brüt marj, indirim, iade, teslimat maliyeti, destek yükü, ödeme gecikmesi, finansman maliyeti ve net katkıyı içerir. Gelir tek başına en iyi müşteriyi belirlemez. Bu özellik Finans, Satın Alma ve Operasyon entegrasyonuna bağlıdır.

## 20. Katmanlar arası akıl yürütme

Bu bağlantılar Octo’yu silo CRM araçlarından ayırır:

1. **Tedarikçi maliyeti → teklif marjı:** “Tedarikçi X bileşen fiyatını %12 artırdı. Üç etkin teklif eski maliyeti kullanıyor ve asgari marjın altında.”
2. **Teklif → satın alma ihtiyacı:** 1.000 birimlik teklif stok, gerekli alım, tercih edilen tedarikçi, son maliyet, teslimat uygulanabilirliği, işletme sermayesi ve beklenen marjı değerlendirir.
3. **Pipeline → nakit akışı:** “Olasılık ağırlıklı Eylül satışları 1,4 milyon TL, fakat Eylül’de yalnızca 620.000 TL tahsilat bekleniyor.”
4. **Satın alma taahhüdü → satış riski:** “İki satın alma siparişi, ilişkili teklifler kabul edilmeden önce 580.000 TL taahhütlü çıkış yaratıyor.”
5. **Ödeme riski → fırsat kalitesi:** gecikmiş faturalar müşteri sağlığını, fırsat skorunu, ödeme koşullarını ve onay gereksinimini etkiler.
6. **Sözleşme yenileme → fırsat:** gelecekte Hukuk sözleşme tarihinden yenileme fırsatı doğurur.
7. **Satış siparişi → fatura → tahsilat:** zincir uçtan uca izlenebilir kalır.

Bu çıkarımlar, ilgili kaynak katmanlar bağlanmadan üretilmez.

## 21. Excel içe ve dışa aktarma

Bugün Firmalar ve Kişiler için `.xlsx`, `.xls`, `.csv`, tür/sütun tanıma, manuel eşleme, doğrulama, önizleme, satır dışlama, kısmi sonuç, kurgusal şablonlar ve etkin şirket kapsamı uygulanmıştır. Önizleme ve açık onay olmadan kayıt yazılmaz. Yetim kişi oluşturulmaz; bulanık firma eşleşmesi otomatik yazamaz.

Gelecek içe aktarımlar: potansiyel müşteriler, fırsatlar, teklifler, satış siparişleri ve yalnız yapısal olarak güvenliyse aktiviteler. Gelecek dışa aktarımlar: filtreli listeler, pipeline, teklifler, sipariş kaydı, müşteri sağlığı ve performans raporları. Dışa aktarma izinlere ve hassas veri maskelemesine uyar.

## 22. Yetkiler

- **Owner/Admin:** tam erişim, ayarlar, rapor, birleştirme/arşivleme, atama ve onay kuralları.
- **Satış Yöneticisi:** ekip geneli, yeniden atama, tahmin, rapor, indirim onayı ve pipeline yapılandırması.
- **Satış Temsilcisi:** atanmış/izinli kayıtlar, aktiviteler, fırsatlar, teklifler ve görevler.
- **Finans:** müşteri finansal bağlamı, kabul edilen teklifler, siparişler, fatura/ödeme; özel satış notlarına sınırlı erişim.
- **Muhasebeci:** şirket politikası genişletmedikçe salt okunur CRM bağlamı.
- **Genel çalışan:** atanmış görevler veya açıkça paylaşılan kayıtlar.

Veritabanı RLS nihai otoritedir; gizli UI kontrolü güvenlik değildir. Alan seviyesi izinler ertelenebilir, ancak özel not ve kayıt seviyesi erişim gereklidir. Mevcut uygulamada owner/employee yazabilir, accountant salt okuyabilir.

## 23. Veri bütünlüğü, denetim ve bildirimler

Kurallar: şirket kapsamı, RLS, soft delete, arşiv/birleştirme geçmişi, normal akışta hard delete olmaması ve ileride değiştirilemez denetim kayıtları. Aşama, sorumlu, değer, kapanış tarihi, teklif revizyonu, skor, müşteri sağlığı, sipariş durumu, import ve onay değişimleri izlenir. Kritik eylem aktör, zaman, önce/sonra değeri ve gerektiğinde neden kaydeder.

Gelecek bildirimleri: geciken görev, süresi yaklaşan teklif, hareketsiz/sonraki eylemsiz fırsat, geçen kapanış tarihi, indirim onayı, bozulan müşteri sağlığı, geciken sipariş/fatura, yaklaşan yenileme ve önemli tahmin değişimi. Gürültü önlenir; uygulama içi ve günlük özet önceliklidir, e-posta/mobil daha sonradır. Kritik olmayan tercihler yapılandırılabilir.

## 24. AI ve veri ilkeleri

- Şirketler arasında ham müşteri verisi paylaşılmaz.
- Mahremiyet koruyan toplulaştırılmış örüntüler kullanılabilir.
- Küresel örüntü ile şirkete özgü kanıt ayrıştırılır.
- Önerinin kanıtı ve belirsizliği gösterilir; insan override edebilir.
- Önemli AI destekli eylemler loglanır ve denetlenir.
- Eksik ticari gerçek uydurulmaz.
- Özel şirket verisi açık hukuki dayanak ve ürün politikası olmadan dış eğitim için kullanılmaz.

Sistem tenant verisini açığa çıkarmadan örüntülerden öğrenir.

## 25. Uygulama yol haritası

1. **Tamamlanan temel:** kanonik taraflar, roller, kişiler, Firmalar, Firma Detayı, Kişiler ve Excel aktarımı.
2. **Ticari yürütme:** potansiyel müşteriler/dönüşüm, fırsatlar, varsayılan pipeline/aşamalar, aktiviteler, görevler, sonraki eylemler ve birleşik CRM timeline.
3. **Teklifler:** model, kalemler, versiyon, PDF, onay, marj ve durum geçmişi.
4. **Satış siparişleri:** teklif dönüşümü, karşılama, teslimat ve fatura bağlantısı.
5. **Finans entegrasyonu:** açık CRM/Cari köprüsü, faturalar, tahsilatlar, ödeme geçmişi, forecast-to-cash ve Firma 360.
6. **Intelligence V1:** kural tabanlı fırsat skoru, müşteri sağlığı, eski fırsat uyarısı, günlük özet ve sonraki eylem.
7. **Analitik:** tahmin, satış performansı, kazanma/kaybetme ve müşteri kârlılığı.
8. **İleri zekâ:** şirkete özgü öngörü modelleri, mahremiyet koruyan kolektif örüntüler, gelişmiş churn/fırsat modelleri ve iletişim analizi.

Her aşama uygulamadan önce ayrı spesifikasyon ve doğrulama gerektirir.

## 26. İlk ticari sürüm ve kapsam dışı alanlar

İlk ticari olarak kullanılabilir sürüm; firmalar, kişiler, potansiyel müşteriler, fırsatlar, pipeline, aktiviteler, görevler, sonraki eylemler, teklifler, satış siparişleri, temel tahmin, açıklanabilir fırsat skoru, temel müşteri sağlığı, Excel aktarımı ve rol tabanlı erişim içerir.

İlk sürüm kapsamı dışında: otonom e-posta/dış iletişim, tam pazarlama otomasyonu, çağrı kaydı/transkripsiyon, bölge planlama, komisyon, tam destek ticket sistemi, opak ML skoru, karmaşık workflow builder ve onaysız otomatik AI kayıt değişikliği.

## 27. Ürün başarı metrikleri

- **Benimseme:** etkin satış kullanıcısı, etkin kişili firma, sonraki eylemli fırsat, haftalık aktivite kaydı.
- **Yürütme kalitesi:** geciken görev, hareketsiz fırsat, sonraki eylemsiz fırsat ve teklif takip tamamlama oranı.
- **Ticari sonuç:** kazanma, teklif kabulü, satış döngüsü, tahmin doğruluğu, korunan gelir ve marj.
- **Veri kalitesi:** tekrar oranı, eksik karar verici/kapanış tarihi, çözülemeyen import ve eski veri.
- **Güven:** öneri kabulü, AI override, desteksiz öneri ve kullanıcı bildirimiyle yanlış uyarı oranı.

Yeterli kanıt olmadan ürün kullanımı ile ticari sonuç arasında nedensellik iddia edilmez.

## 28. Terminoloji

| İngilizce | Tercih edilen müşteri terimi | Not |
|---|---|---|
| Business Party | Ticari Taraf | Teknik/kanonik model; UI’da çoğunlukla Firma |
| Account | Firma | |
| Contact | Kişi | Bağlamda “İlgili Kişi” kullanılabilir |
| Lead | Potansiyel Müşteri | |
| Opportunity | Fırsat | |
| Pipeline | Pipeline | Açıklamada “satış hunisi” denebilir |
| Quote | Teklif | |
| Sales Order | Satış Siparişi | Satın alma siparişinden ayrıdır |
| Customer Health | Müşteri Sağlığı | Tam alan: Müşteri Sağlığı ve Gelir Riski |
| Revenue Risk | Gelir Riski | |
| Opportunity Score | Fırsat Skoru | Her zaman açıklanabilir |
| Next Best Action | Önerilen Sonraki Adım | |
| Forecast | Satış Tahmini | |
| Won | Kazanıldı | |
| Lost | Kaybedildi | |
| Committed | Taahhüt | |
| Expected | Beklenen | |
| Upside/Potential | Potansiyel | |

## 29. Özellik durum matrisi

| Alan | Yetenek | Durum | Bağımlılık | Planlanan aşama | Not |
|---|---|---|---|---:|---|
| Veri temeli | Kanonik ticari taraf ve çoklu rol | Implemented | Supabase/RLS | 1 | Finance ile henüz birleşik değil |
| Veri temeli | Kişiler ve birincil kişi | Implemented | Kanonik taraf | 1 | Çoklu kişi desteklenir |
| Firmalar | Liste, filtre, oluşturma, düzenleme, arşiv | Implemented | CRM repository | 1 | Hard delete yok |
| Firmalar | Firma Detayı | Implemented | Firma ve kişi verisi | 1 | Firma 360 değildir |
| Kişiler | Liste, filtre, oluşturma, düzenleme, arşiv | Implemented | CRM repository | 1 | Yetim kişi yok |
| Import | Firma/Kişi Excel ve CSV | Implemented | XLSX, repository | 1 | Eşleme, önizleme, kısmi sonuç |
| Genel Bakış | Eylem odaklı satış özeti | Designed | Fırsat/aktivite/teklif | 2–3 | Sahte metrik yok |
| Potansiyel Müşteri | Kayıt, nitelendirme, atomik dönüşüm | Designed | Yeni veri modeli | 2 | Tekrar giriş engellenir |
| Fırsat | Fırsat ve sonraki eylem yönetimi | Designed | Lead/firma/kişi | 2 | Sonraki eylem kuralı |
| Pipeline | Aşama modeli, Kanban/liste | Designed | Fırsat | 2 | Kayıp nedeni zorunlu |
| Aktivite | Aktivite, görev ve birleşik timeline | Designed | Fırsat ve entegrasyonlar | 2/5 | Dış gönderim onaylı |
| Teklif | Versiyonlu teklif ve PDF | Designed | Fırsat, ürün/maliyet | 3 | Yalnız PDF değildir |
| Teklif | Onay, indirim ve marj kontrolü | Designed | Finans/Satın Alma | 3/5 | Maliyet bağlantısı gerekir |
| Satış Siparişi | Tekliften sipariş ve karşılama | Designed | Teklif/Operasyon | 4 | Satın alma siparişi değildir |
| Finans bağlantısı | CRM/Cari köprüsü ve Firma 360 | Deferred | Finans veri modeli | 5 | Mevcut cariStore senkron değil |
| Finans bağlantısı | Fatura, tahsilat, forecast-to-cash | Deferred | Finans entegrasyonu | 5 | Pipeline gelir değildir |
| Müşteri | Müşteri Sağlığı ve Gelir Riski | Designed | CRM + Finans geçmişi | 6 | Kanıt ve veri yeterliliği |
| Zekâ | Açıklanabilir fırsat skoru | Designed | Yeterli CRM sinyali | 6 | İlk model kural tabanlı |
| Zekâ | Octo Satış Asistanı | Designed | Denetlenebilir veri | 6 | İnsan onayı zorunlu |
| Tahmin | Taahhüt/Beklenen/Potansiyel | Designed | Fırsat/teklif/sipariş | 7 | Muhasebe gelirinden ayrı |
| Analitik | Satış performansı ve win/loss | Designed | Tarihsel veri | 7 | Metrik tanımları zorunlu |
| Kârlılık | Müşteri net katkısı | Deferred | Finans/Satın Alma/Operasyon | 7 | Gelir tek başına yeterli değil |
| Gelişmiş AI | Churn ve fırsat öngörüleri | Deferred | Yeterli tarihsel veri | 8 | Mahremiyet koruyan modeller |
| Bildirim | Akıllı uyarı ve tercihler | Designed | Olay altyapısı | 2–7 | Gürültü azaltma gerekir |
| Denetim | Değişiklik, import ve onay geçmişi | Partially implemented | Audit altyapısı | 2–5 | Temel created/updated var; tam immutable geçmiş yok |
| Dışa aktarım | Filtreli ticari raporlar | Deferred | İzin ve maskeleme | 7 | Hassas veri korunur |

## 30. Uygulama doğruluk ilkesi

Bu belgede **Implemented** yalnız üretim kodunda bulunan yeteneği ifade eder. **Partially implemented** temelinin bulunduğunu, **Designed** ürün davranışının tanımlandığını fakat kodlanmadığını, **Deferred** ise bağımlılık veya veri olgunluğu beklediğini ifade eder. Yeni navigasyon veya müşteri vaadi ancak ilgili veri modeli, yetki, hata durumları, testler ve denetim davranışı tamamlandığında açılır.
