import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Label } from '../../shared/utils/ui'
import { capabilities, faqs } from './content'

type Props = {
  email: string
  submitted: boolean
  onEmail: (value: string) => void
  onSubmit: () => void
}

export default function LandingSections({ email, submitted, onEmail, onSubmit }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      <section id="nasil" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Label>Nasıl çalışır?</Label>
          <h2 className="mt-4 max-w-2xl font-display text-4xl text-ink">Veri işletmenizde var. Bütün resmi artık Octo tamamlar.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              ['01','Veriyi bir araya getirir','Günlük işletme kayıtları tek bir yapı içinde çalışır.'],
              ['02','Birlikte değerlendirir','Finans, vergi, bordro, stok ve operasyon arasındaki etkileri inceler.'],
              ['03','Önemli olanı öne çıkarır','Riskleri, eksikleri ve yaklaşan çakışmaları önceliklendirir.'],
              ['04','Kanıtı ve adımı gösterir','Ne olduğunu, nedenini ve yapılacak işi açıkça gösterir.'],
            ].map(([n,title,desc]) => (
              <div key={n}><div className="font-mono text-4xl text-line">{n}</div><h3 className="mt-4 font-medium text-ink">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-soft">{desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="alanlar" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Label>Tek sistem. Tek işletme görünümü.</Label>
          <h2 className="mt-4 max-w-2xl font-display text-4xl text-ink">İşletmenin parçalarını değil, aralarındaki etkiyi görün.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, name, desc }) => (
              <div key={name} className="bg-surface p-7 transition-colors hover:bg-surface-2"><Icon size={22} className="text-crimson" /><h3 className="mt-4 font-display text-xl text-ink">{name}</h3><p className="mt-2 text-sm leading-relaxed text-ink-soft">{desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <Label>Kanıtsız konuşmaz</Label>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink">Her önemli uyarının altında hesabı vardır.</h2>
            <p className="mt-5 text-base leading-relaxed text-ink-soft">Octo hangi kayıtlara dayandığını, hangi varsayımları kullandığını ve hangi bilginin eksik olduğunu açıkça gösterir.</p>
            <p className="mt-4 text-sm font-medium text-ink">İnanmanız gerekmez. Açıp kontrol edebilirsiniz.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Dayanak kayıtlar','Uyarıyı oluşturan fatura, ödeme ve yükümlülükler.'],
              ['Hesaplama','Tutarın ve tarihin nasıl oluştuğu.'],
              ['Eksik bilgiler','Sonucu değiştirebilecek bilinmeyenler.'],
              ['Önerilen adım','Kontrol edilecek veya yapılacak sonraki iş.'],
            ].map(([title,desc]) => (
              <div key={title} className="rounded-card border border-line bg-surface p-5"><Check size={17} className="text-positive" /><h3 className="mt-4 font-medium text-ink">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-soft">{desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="musavir" className="border-t border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div><Label>Mali müşavirinizle birlikte</Label><h2 className="mt-4 font-display text-4xl leading-tight text-ink">Aynı veriye bakın. Eksikleri daha erken görün.</h2><p className="mt-5 text-base leading-relaxed text-ink-soft">Octo işletme verilerini daha düzenli ve izlenebilir hâle getirir. Mali müşaviriniz belge takibine daha az, inceleme ve uzmanlığa daha fazla zaman ayırır.</p></div>
          <div className="rounded-card border border-line bg-surface p-8"><p className="font-display text-2xl text-ink">Veriyi Octo düzenler.</p><p className="mt-2 font-display text-2xl italic text-crimson">Uzmanlık ve değerlendirme mali müşavirinizdedir.</p></div>
        </div>
      </section>

      <section id="pilot" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <Label>Kurucu 10 Pilot Programı</Label>
          <h2 className="mt-4 font-display text-4xl text-ink">Octo’yu gerçek bir işletme problemi üzerinde deneyin.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">Tek bir iş akışı seçer, bugünkü yükü ölçer ve Octo’nun daha erken bir uyarı veya anlamlı bir zaman kazancı üretip üretmediğini birlikte doğrularız.</p>
          <div className="mx-auto mt-8 max-w-xl">
            {!submitted ? (
              <div className="flex flex-col gap-3 sm:flex-row"><input type="email" value={email} onChange={e => onEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSubmit()} placeholder="Şirket e-postanız" className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-sm text-ink outline-none focus:border-crimson" /><button onClick={onSubmit} className="rounded-full bg-crimson px-6 py-3 text-sm font-medium text-white">Başvurun</button></div>
            ) : (
              <div className="flex items-center justify-center gap-3 rounded-full border border-positive/30 bg-positive/10 px-5 py-3"><Check size={18} className="text-positive" /><span className="text-sm text-ink">Teşekkürler. Pilot başvurunuzu aldık.</span></div>
            )}
          </div>
        </div>
      </section>

      <section id="sss">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <Label>Sık sorulan sorular</Label><h2 className="mt-4 font-display text-4xl text-ink">Aklınızdaki sorular.</h2>
          <div className="mt-10 divide-y divide-line border-t border-line">
            {faqs.map(([question,answer], index) => (
              <div key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between py-5 text-left"><span className="font-medium text-ink">{question}</span><ChevronDown size={18} className={'text-ink-mute transition-transform ' + (openFaq === index ? 'rotate-180' : '')} /></button>{openFaq === index && <p className="pb-5 text-sm leading-relaxed text-ink-soft">{answer}</p>}</div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
