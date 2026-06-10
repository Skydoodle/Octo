import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Wallet, Receipt, Scale, Users, Boxes,
  ShieldCheck, BarChart3, Gavel, Check, Sparkles,
  Phone, Eye, ChevronDown
} from 'lucide-react'
import { Wordmark, ThemeToggle, Label } from '../shared/utils/ui'

const arms = [
  { icon: Wallet, name: 'Finans', desc: 'Nakit akışı, mutabakat, anomali tespiti' },
  { icon: Receipt, name: 'Vergi', desc: 'KDV, Muhtasar, beyanname zekâsı' },
  { icon: Scale, name: 'Hukuk', desc: 'Sözleşme riski, KVKK, mevzuat takibi' },
  { icon: Users, name: 'İnsan Kaynakları', desc: 'Bordro, SGK, çalışan uyumu' },
  { icon: Boxes, name: 'Operasyon', desc: 'Satın alma, tedarikçi, maliyet' },
  { icon: BarChart3, name: 'Satış ve Teklifler', desc: 'Pipeline, teklif, gelir tahmini' },
  { icon: ShieldCheck, name: 'Denetim ve Uyum', desc: 'Katmanlar arası çakışma tespiti' },
  { icon: Gavel, name: 'Dış Denetim Hazırlığı', desc: 'Vergi denetimi, belge paketleme' },
]

const faqs = [
  ['Mevcut müşavirimin yerini mi alıyor?', 'Hayır. Octo müşavirinizin yerini almaz, onu güçlendirir. Verilerinizi okur, eksikleri yakalar ve müşavirinize hazır bir dosya sunar. İnsan ilişkisinin altındaki zekâ katmanıdır.'],
  ['Verilerim güvende mi?', 'Evet. Octo KVKK uyumlu olarak tasarlandı. Verileriniz Türkiye sınırları içinde, şifrelenmiş olarak saklanır ve hiçbir üçüncü tarafla paylaşılmaz.'],
  ['Logo veya Paraşüt kullanıyorum, ne olacak?', 'Octo mevcut sisteminizi değiştirmez. Verilerinizi okur ve onların söylemediğini size söyler. Geçiş sürecinde geçmiş verilerinizi de içeri aktarabilirsiniz.'],
  ['Kurulum zor mu?', 'Hayır. Kurulum gerektirmez. Hesabınızı açın, verilerinizi bağlayın, ertesi sabah ilk brifinginiz hazır.'],
]

export default function Landing() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleSubmit = () => {
    if (!email || !email.includes('@')) return
    setSubmitted(true)
    setEmail('')
  }

  return (
    <div className="relative min-h-screen bg-paper">

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <Wordmark className="text-3xl" />
            <span className="hidden text-xs text-ink-mute sm:inline">Koca bir arka ofis. Tek bir akıl.</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#nasil" className="hidden text-sm text-ink-soft hover:text-ink sm:inline transition-colors">Nasıl çalışır</a>
            <a href="#kollar" className="hidden text-sm text-ink-soft hover:text-ink sm:inline transition-colors">Katmanlar</a>
            <a href="#sss" className="hidden text-sm text-ink-soft hover:text-ink sm:inline transition-colors">SSS</a>
            <ThemeToggle />
            <Link to="/dashboard" className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-crimson hover:text-crimson">
              Demoyu gör
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
        <div>
          <div className="animate-rise">
            <Label>Türk KOBİleri için yapay zeka is asistanı</Label>
          </div>
          <h1 className="animate-rise mt-6 font-display text-5xl leading-tight text-ink md:text-6xl" style={{ animationDelay: '60ms' }}>
            Bir şirketi yönetmek için <span className="italic text-crimson">koca bir ekip</span> gerekmez.
          </h1>
          <p className="animate-rise mt-6 text-lg leading-relaxed text-ink-soft" style={{ animationDelay: '140ms' }}>
            Mali müşavirinize, avukatınıza, muhasebecinize ayrı ayrı sormak yerine — <span className="text-ink font-medium">tek bir bakış.</span> Octo işinizin her tarafini ayni anda görür ve size ne yapmaniz gerektiğini söyler.
          </p>

          <div className="animate-rise mt-8" style={{ animationDelay: '220ms' }}>
            {!submitted ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Şirket e-postanız"
                  className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-sm text-ink outline-none transition-colors focus:border-crimson"
                />
                <button
                  onClick={handleSubmit}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                >
                  Kurucu 50ye katıl
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-full border border-positive/30 bg-positive/10 px-5 py-3">
                <Check size={18} className="text-positive" />
                <span className="text-sm text-ink">Tesekkurler — Kurucu 50 arasindaki yerinizi ayırdık.</span>
              </div>
            )}
            <p className="mt-3 text-sm text-ink-mute">
              İlk 50 şirkete <span className="text-ink-soft font-medium">ömür boyu %50 indirim</span> + ürünü birlikte şekillendirin.
            </p>
          </div>
        </div>

        {/* HERO VISUAL — briefing card answering 3 arms */}
        <div className="animate-rise" style={{ animationDelay: '300ms' }}>
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-crimson/40" />
              <span className="h-3 w-3 rounded-full bg-warn/40" />
              <span className="h-3 w-3 rounded-full bg-positive/40" />
              <span className="ml-2 font-mono text-xs text-ink-mute">app.octo.com.tr</span>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-crimson" />
                <span className="label text-ink-mute">Günlük Brifing — Pazartesi</span>
              </div>
              <p className="text-sm leading-relaxed text-ink-soft">
                Bu hafta üç şeye dikkat edin. Nakit pozisyonunuz güçlü ama Perşembe iki odeme üst üste biniyor.
              </p>
              <div className="mt-5 space-y-3">
                <div className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-crimson" />
                  <div>
                    <span className="label text-crimson">Finans</span>
                    <p className="mt-1 text-sm text-ink">Nakit 879.400 TL — 4 ay pist. Perşembe 142.800 TL çıkış.</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-warn" />
                  <div>
                    <span className="label text-warn">Vergi</span>
                    <p className="mt-1 text-sm text-ink">KDV beyannamesi 2 gun içinde — 228.300 TL.</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-ink-mute" />
                  <div>
                    <span className="label text-ink-mute">Hukuk</span>
                    <p className="mt-1 text-sm text-ink">Tedarikçi sözleşmesi 12 gün sonra otomatik yenileniyor.</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
                <Eye size={13} className="text-ink-mute" />
                <span className="text-xs text-ink-mute">Üç kol, tek bakış. Müşaviriniz için hazırlandı.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Label>Eskiden / Octo ile</Label>
          <h2 className="mt-4 max-w-2xl font-display text-4xl text-ink">Üç telefon görüşmesi. Ya da tek bir bakış.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-card border border-line bg-surface p-8">
              <div className="mb-6 flex items-center gap-2">
                <Phone size={16} className="text-ink-mute" />
                <span className="label text-ink-mute">Eskiden</span>
              </div>
              <div className="space-y-4">
                {[
                  'Müşaviri ara — geri dönmesini bekle',
                  'Avukata aynı konuyu tekrar anlat',
                  'Muhasebeden rakamları iste',
                  'Parçaları kafanda birleştirmeye çalış',
                  'Bir seyi kaçırdığını geç fark et',
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-ink-soft">
                    <span className="font-mono text-xs text-ink-mute">{String(i + 1).padStart(2, '0')}</span>
                    <span className="line-through decoration-ink-mute/40">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-card border border-crimson/30 bg-crimson/5 p-8">
              <div className="mb-6 flex items-center gap-2">
                <Eye size={16} className="text-crimson" />
                <span className="label text-crimson">Octo ile</span>
              </div>
              <div className="flex h-full flex-col justify-center">
                <p className="font-display text-2xl leading-snug text-ink">
                  Telefonunuzu açın. Finans, vergi ve hukuk — hepsi tek bir brifingde, tek bir bakışta.
                </p>
                <p className="mt-4 text-sm text-ink-soft">
                  Birbirinden kopuk uzmanlar değil, birlikte düşünen tek bir zekâ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="nasil">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Label>Nasıl çalışır</Label>
          <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-ink">Sabah 8de telefonunuzu açın. Her şeyi bilin.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              ['01', 'Verileriniz Octoda', 'Fatura, odeme, sözleşme, bordro — hepsi tek sistemde.'],
              ['02', 'Katmanlar işler', 'Her alan kendi işini analiz eder — derin ve spesifik.'],
              ['03', 'Orkestratör bağlar', 'Yapay zeka hepsini okur. Görünmeyeni görür.'],
              ['04', 'Siz karar verin', 'Sabah brifingi. Net öneriler. Müşavirinize hazır dosya.'],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="font-mono text-4xl text-line">{n}</div>
                <h3 className="mt-4 font-medium text-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARMS */}
      <section id="kollar" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Label>Sekiz kol, tek orkestrasyon</Label>
          <h2 className="mt-4 max-w-2xl font-display text-4xl text-ink">Bir beyin, sekiz uzmanlık alanı.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {arms.map(({ icon: Icon, name, desc }) => (
              <div key={name} className="group bg-surface p-7 transition-colors hover:bg-surface-2">
                <Icon size={22} className="text-crimson" />
                <h3 className="mt-4 font-display text-xl text-ink">{name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US / WHY NOW */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <Label>Neden şimdi</Label>
              <h2 className="mt-4 font-display text-4xl leading-tight text-ink">
                Türkiye için, Türkiyeden.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-ink-soft">
                3.7 milyon KOBI aynı sorunu yaşıyor: parçalanmış bilgi, geç kalan kararlar, sürekli sürpriz. Octo bu gerçekliği yaşayan bir ekip tarafindan, Turk mevzuatına göre sıfırdan inşa ediliyor.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-6">
              {[
                ['Türkiye-yerli mevzuat derinliği', '300+ yıllık düzenleme değişikliği takip edilir. Mevzuat degisti, Octo zaten biliyor.'],
                ['Araçlarınızın üstünde', 'ERPnizi değiştirmez — verinizi okur, eksiğini söyler.'],
                ['Bileşik veri hendeği', '6. aydan sonra Octo işinizi sıfırdan başlayan herkesten daha iyi tanır.'],
              ].map(([t, d]) => (
                <div key={t} className="border-l-2 border-crimson pl-5">
                  <h3 className="font-medium text-ink">{t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / KURUCU 50 */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <Label>Kurucu 50</Label>
          <h2 className="mt-4 font-display text-4xl text-ink">İlk 50 şirket arasına katılın.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            Kurucu uyeler ömür boyu %50 indirim alıyor ve ürünü birlikte şekillendiriyor. Şu an erken erişim listesi açılıyor.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-line">
              <div className="h-full w-1/4 rounded-full bg-crimson" />
            </div>
            <span className="font-mono text-sm text-ink-mute">12 / 50 dolu</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="sss">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <Label>Sık sorulan sorular</Label>
          <h2 className="mt-4 font-display text-4xl text-ink">Aklınızdaki sorular.</h2>
          <div className="mt-10 divide-y divide-line border-t border-line">
            {faqs.map(([q, a], i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="font-medium text-ink">{q}</span>
                  <ChevronDown size={18} className={'shrink-0 text-ink-mute transition-transform ' + (openFaq === i ? 'rotate-180' : '')} />
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-sm leading-relaxed text-ink-soft">{a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-line bg-ink">
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <p className="font-mono text-sm uppercase tracking-widest text-crimson">Koca bir arka ofis. Tek bir akıl.</p>
          <h2 className="mt-6 font-display text-5xl italic text-paper">İşiniz düşünmeye başlasın.</h2>
          <p className="mt-4 text-sm text-paper/50">İlk 50 şirkete ömür boyu %50 indirim. KVKK uyumlu. Kurulum gerektirmez.</p>
          <Link to="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-full bg-crimson px-7 py-3.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
            Demoyu görün <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-ink-mute">
          <div className="flex items-baseline gap-3">
            <Wordmark className="text-xl" />
            <span>Koca bir arka ofis. Tek bir akıl.</span>
          </div>
          <span className="font-mono">2026 Octo · İzmir, Türkiye · KVKK uyumlu</span>
        </div>
      </footer>

    </div>
  )
}
