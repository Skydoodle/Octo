import { useReducer, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { enableDemo, disableDemo } from '../shared/config'
import {
  ArrowRight, Wallet, Receipt, Scale, Users, Boxes,
  ShieldCheck, BarChart3, Gavel, Check, Sparkles,
  Phone, Eye, ChevronDown
} from 'lucide-react'
import { Wordmark, ThemeToggle, Label } from '../shared/utils/ui'
import { initialLeadFormState, leadFormReducer, runFounder50Submission } from './landingLead'

const arms = [
  { icon: Wallet, name: 'Finans', desc: 'Nakit akışı, mutabakat, anomali tespiti', status: 'Aktif' },
  { icon: Receipt, name: 'Vergi', desc: 'KDV, Muhtasar, beyanname zekâsı', status: 'Aktif' },
  { icon: Scale, name: 'Hukuk', desc: 'Sözleşme riski, KVKK, mevzuat takibi', status: 'Yol haritasında' },
  { icon: Users, name: 'İnsan Kaynakları', desc: 'Bordro, SGK, çalışan uyumu', status: 'Aktif' },
  { icon: Boxes, name: 'Operasyon', desc: 'Satın alma, tedarikçi, maliyet', status: 'Yol haritasında' },
  { icon: BarChart3, name: 'Satış ve Teklifler', desc: 'Pipeline, teklif, gelir tahmini', status: 'Yol haritasında' },
  { icon: ShieldCheck, name: 'Denetim ve Uyum', desc: 'Katmanlar arası çakışma tespiti', status: 'Yol haritasında' },
  { icon: Gavel, name: 'Dış Denetim Hazırlığı', desc: 'Vergi denetimi, belge paketleme', status: 'Yol haritasında' },
]

const faqs = [
  ['Mevcut müşavirimin yerini mi alıyor?', 'Hayır. Octo müşavirinizin yerini almaz. Kayıtlarınızı düzenli ve izlenebilir hâle getirir, eksikleri ve yaklaşan yükümlülükleri gösterir. Beyan ve uzmanlık müşavirinizde kalır.'],
  ['Verilerim güvende mi?', 'Octo, verilerinizi güvenli bağlantılar ve şirket bazlı erişim kontrolleriyle koruyacak şekilde tasarlanmıştır. Her kullanıcı yalnızca yetkili olduğu şirket ve verilere erişebilir.'],
  ['Logo veya Paraşüt kullanıyorum, ne olacak?', 'Mevcut verilerinizi Octo’ya aktarabilir ve geçiş sürecini kendi hızınızda yönetebilirsiniz. Octo, dağınık kayıtları tek çalışma alanında bir araya getirmenize yardımcı olur.'],
  ['Kurulum zor mu?', 'Hayır. Teknik kurulum gerektirmez. Hesabınızı açın, şirketinizi oluşturun ve mevcut verilerinizi içe aktarın.'],
]

export default function Landing() {
  const [email, setEmail] = useState('')
  const [leadState, dispatchLead] = useReducer(leadFormReducer, initialLeadFormState)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const navigate = useNavigate()

  // "Demoyu gör": load the seeded demo dataset, then open the dashboard.
  const openDemo = () => {
    enableDemo()
    navigate('/dashboard')
  }

  // "Boş başla": clear to an empty book and open the dashboard (real product).
  const startEmpty = () => {
    disableDemo()
    navigate('/dashboard')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const saved = await runFounder50Submission(email, dispatchLead)
    if (saved) setEmail('')
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
            <button onClick={startEmpty} className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink">
              Octo’ya Gir
            </button>
            <button onClick={openDemo} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-crimson hover:text-crimson">
              Demoyu Gör
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
        <div>
          <div className="animate-rise">
            <Label>Türk KOBİ’leri için bütünleşik arka ofis sistemi</Label>
          </div>
          <h1 className="animate-rise mt-6 font-display text-5xl leading-tight text-ink md:text-6xl" style={{ animationDelay: '60ms' }}>
            Bir şirketi yönetmek için <span className="italic text-crimson">koca bir ekip</span> gerekmez.
          </h1>
          <p className="animate-rise mt-6 text-lg leading-relaxed text-ink-soft" style={{ animationDelay: '140ms' }}>
            Finans, vergi, İK ve diğer arka ofis süreçlerinizi tek yerde yönetin. Octo katmanları birlikte değerlendirir; yaklaşan riskleri, ödeme çakışmalarını ve eksikleri zamanında gösterir.
          </p>

          <div className="animate-rise mt-8" style={{ animationDelay: '220ms' }}>
            {leadState.status !== 'success' ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value)
                    if (leadState.status === 'error') dispatchLead({ type: 'edit' })
                  }}
                  placeholder="Şirket e-postanız"
                  disabled={leadState.status === 'submitting'}
                  className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-sm text-ink outline-none transition-colors focus:border-crimson"
                />
                <button
                  type="submit"
                  disabled={leadState.status === 'submitting'}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                >
                  {leadState.status === 'submitting' ? 'Kaydediliyor…' : 'Kurucu 50’ye katıl'}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3 rounded-full border border-positive/30 bg-positive/10 px-5 py-3">
                <Check size={18} className="text-positive" />
                <span className="text-sm text-ink">Teşekkürler — Kurucu 50 başvurunuzu aldık.</span>
              </div>
            )}
            {leadState.status === 'error' && <p role="alert" className="mt-3 text-sm text-crimson">{leadState.message}</p>}
            <p className="mt-3 text-sm text-ink-mute">
              İlk 50 şirkete <span className="text-ink-soft font-medium">ömür boyu %50 indirim</span> ve ürünü birlikte şekillendirme fırsatı.
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
                Bu hafta üç noktaya dikkat edin. Nakit pozisyonunuz güçlü ancak perşembe iki ödeme üst üste biniyor.
              </p>
              <div className="mt-5 space-y-3">
                <div className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-crimson" />
                  <div>
                    <span className="label text-crimson">Finans</span>
                    <p className="mt-1 text-sm text-ink">Nakit 879.400 TL — 4 aylık hareket alanı. Perşembe 142.800 TL çıkış.</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-warn" />
                  <div>
                    <span className="label text-warn">Vergi</span>
                    <p className="mt-1 text-sm text-ink">KDV beyannamesi 2 gün içinde — 228.300 TL.</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-ink-mute" />
                  <div>
                    <span className="label text-ink-mute">İnsan Kaynakları</span>
                    <p className="mt-1 text-sm text-ink">SGK prim ödeme tarihi 5 gün sonra.</p>
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
                  'Müşavirinizi arayın — geri dönüşünü bekleyin',
                  'Avukatınıza aynı konuyu tekrar anlatın',
                  'Muhasebeden rakamları isteyin',
                  'Parçaları zihninizde birleştirmeye çalışın',
                  'Bir şeyi kaçırdığınızı geç fark edin',
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
                  Telefonunuzu açın. Finans, vergi ve insan kaynakları — hepsi tek bir brifingde, tek bir bakışta.
                </p>
                <p className="mt-4 text-sm text-ink-soft">
                  Birbirinden kopuk süreçler değil, birlikte çalışan tek bir sistem.
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
          <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-ink">Sabah 8’de telefonunuzu açın. Gününüzü tek görünümden yönetin.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              ['01', 'Verileriniz Octo’da', 'Fatura, ödeme, sözleşme ve bordro kayıtları tek sistemde.'],
              ['02', 'Katmanlar değerlendirir', 'Her alan kendi süreçlerini inceler ve eksikleri belirler.'],
              ['03', 'Octo bağlantıları kurar', 'Finans, vergi ve İK verilerini aynı şirket bağlamında değerlendirir.'],
              ['04', 'Siz karar verirsiniz', 'Yaklaşan yükümlülükleri ve gerekli adımları tek görünümde izlersiniz.'],
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
          <Label>Sekiz kol, tek akıl</Label>
          <h2 className="mt-4 max-w-2xl font-display text-4xl text-ink">Bir beyin, sekiz uzmanlık alanı.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {arms.map(({ icon: Icon, name, desc, status }) => (
              <div key={name} className="group bg-surface p-7 transition-colors hover:bg-surface-2">
                <div className="flex items-start justify-between gap-3">
                  <Icon size={22} className="text-crimson" />
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${status === 'Aktif' ? 'border-positive/20 bg-positive/10 text-positive' : 'border-line bg-surface-2 text-ink-mute'}`}>{status}</span>
                </div>
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
                Türkiye için, Türkiye’den.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-ink-soft">
                KOBİ’ler aynı temel sorunla karşılaşıyor: dağınık bilgi, geciken kararlar ve beklenmedik yükümlülükler. Octo, Türk işletmelerinin günlük finans, vergi ve insan kaynakları süreçlerine göre geliştiriliyor.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-6">
              {[
                ['Türk iş süreçlerine göre', 'Vergi, SGK, bordro ve cari süreçleri Türkiye’de kullanılan kavramlar ve iş akışlarıyla ele alınır.'],
                ['Geçiş sizin kontrolünüzde', 'Mevcut kayıtlarınızı içe aktarabilir ve Octo’ya kendi hızınızda geçebilirsiniz.'],
                ['Katmanlar birlikte çalışır', 'Finans, vergi ve İK verileri aynı şirket bağlamında değerlendirilir; yaklaşan yükümlülükler ve çakışmalar tek yerde görünür.'],
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
            Kurucu üyeler ömür boyu %50 indirim alıyor ve ürünü birlikte şekillendiriyor. Erken erişim listesi başvurulara açık.
          </p>
          <p className="mt-8 text-sm text-ink-mute">Erken erişim başvuruları sınırlı sayıda şirket için değerlendiriliyor.</p>
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
          <p className="mt-4 text-sm text-paper/50">İlk 50 şirkete ömür boyu %50 indirim. KVKK gereklilikleri gözetilerek tasarlandı. Teknik kurulum gerektirmez.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={openDemo} className="inline-flex items-center gap-2 rounded-full bg-crimson px-7 py-3.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
              Demoyu Gör <ArrowRight size={16} />
            </button>
            <button onClick={startEmpty} className="text-sm text-paper/50 underline-offset-4 transition-colors hover:text-paper/80 hover:underline">
              Octo’ya Gir
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-ink-mute">
          <div className="flex items-baseline gap-3">
            <Wordmark className="text-xl" />
            <span>Koca bir arka ofis. Tek bir akıl.</span>
          </div>
          <span className="font-mono">2026 Octo · İzmir, Türkiye · KVKK gereklilikleri gözetilerek tasarlandı</span>
        </div>
      </footer>

    </div>
  )
}
