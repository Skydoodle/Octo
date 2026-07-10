import { BarChart3, Boxes, Gavel, Receipt, Scale, ShieldCheck, Users, Wallet } from 'lucide-react'

export const capabilities = [
  { icon: Wallet, name: 'Finans ve Nakit', desc: 'Banka, kasa, tahsilat ve yaklaşan ödemeleri birlikte görün.' },
  { icon: Receipt, name: 'Vergi ve Yükümlülükler', desc: 'KDV, SGK ve diğer yükümlülüklerin nakde etkisini izleyin.' },
  { icon: Users, name: 'Bordro ve Ekip', desc: 'Maaş ve personel kaynaklı yükümlülükleri son güne bırakmayın.' },
  { icon: Boxes, name: 'Stok ve Operasyon', desc: 'Stok hareketlerinin satış, satın alma ve nakde etkisini görün.' },
  { icon: BarChart3, name: 'Cari ve Tahsilat', desc: 'Geciken tahsilatların yalnızca listesini değil, işletmeye etkisini görün.' },
  { icon: Scale, name: 'Satın Alma', desc: 'Siparişleri, vadeleri ve tedarikçi ödemelerini aynı takvimde değerlendirin.' },
  { icon: ShieldCheck, name: 'Dönem Hazırlığı', desc: 'Eksik kayıtları ve kontrol edilmesi gereken kalemleri erkenden bulun.' },
  { icon: Gavel, name: 'Müşavir İş Birliği', desc: 'Kayıtları, kanıtları ve inceleme durumunu mali müşavirinizle paylaşın.' },
]

export const faqs = [
  ['Octo mali müşavirimin yerini mi alıyor?', 'Hayır. Octo işletme verilerini düzenler ve incelemeyi kolaylaştırır. Mesleki değerlendirme ve sorumluluk mali müşavirinizde kalır.'],
  ['Logo, Mikro veya Paraşüt kullanıyorum. Ne olacak?', 'Octo seçilen iş akışları ve veri aktarımlarıyla aşamalı başlayabilir. Taşıma veya birlikte çalışma planı mevcut sisteminize göre belirlenir.'],
  ['Octo bir uyarıda yanılırsa ne olur?', 'Önemli uyarılar dayandığı kayıtları, varsayımları, eksik bilgileri ve güven seviyesini gösterir. Sonucu açıp kontrol edebilirsiniz.'],
  ['Kurulum zor mu?', 'İlk aşamada tek bir sorun ve sınırlı veri setiyle başlarız. Octo’nun gerçekten değer üretip üretmediğini birlikte ölçeriz.'],
]
