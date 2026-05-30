import { Link } from 'react-router-dom'
import { ArrowRight, Wallet, Receipt, Scale, Users, Boxes, ShieldCheck, BarChart3, Gavel } from 'lucide-react'
import { Wordmark, ThemeToggle, Label } from '../shared/utils/ui'

const arms = [
  { icon: Wallet, name: 'Finans', desc: 'Nakit akışı, mutabakat, anomali tespiti' },
  { icon: Receipt, name: 'Vergi', desc: 'KDV, Muhtasar, beyanname zekasi' },
  { icon: Scale, name: 'Hukuk', desc: 'Sözleşme riski, KVKK, mevzuat takibi' },
  { icon: Users, name: 'İnsan Kaynakları', desc: 'Bordro, SGK, çalışan uyumu' },
  { icon: Boxes, name: 'Operasyon', desc: 'Satın alma, tedarikçi, maliyet' },
  { icon: BarChart3, name: 'Satış ve Teklifler', desc: 'Pipeline, teklif, gelir tahmini' },
  { icon: ShieldCheck, name: 'Denetim ve Uyum', desc: 'Katmanlar arası çakışma, GİB hazırlığı' },
  { icon: Gavel, name: 'Dış Denetim Hazırligi', desc: 'Vergi denetimi, belge paketleme' },
]

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-paper">

      <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-2">
            <Wordmark className="text-3xl" />
            <span className="label text-ink-mute">OS</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#kollar" className="hidden text-sm text-ink-soft hover:text-ink sm:inline transition-colors">Katmanlar</a>
            <a href="#neden" className="hidden text-sm text-ink-soft hover:text-ink sm:inline transition-colors">Neden Octo</a>
            <ThemeToggle />
            <Link
              to="/dashboard"
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-all hover:opacity-80"
            >
              Panele gir
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-32">
        <div className="animate-rise">
          <Label>AI-native işletim sistemi · Turk KOBİleri için</Label>
        </div>
        <h1
          className="animate-rise mt-6 max-w-4xl font-display text-5xl leading-tight text-ink md:text-7xl"
          style={{ animationDelay: '60ms' }}
        >
          işletmenizin{' '}
          <span className="italic text-crimson">beyni</span>.
          <br />
          Araçlarınızın{' '}
          <span className="italic">üstünde</span> düşünen katman.
        </h1>
        <p
          className="animate-rise mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft"
          style={{ animationDelay: '140ms' }}
        >
          Finans, vergi, hukuk, IK ve operasyon — birbirinden kopuk uzmanlar değil,
          birlikte akıl yürüten tek bir zeka. Octo mevcut araçlarınızı okur ve
          onlarin söylemediğini size söyler.
        </p>
        <div
          className="animate-rise mt-9 flex flex-wrap items-center gap-4"
          style={{ animationDelay: '220ms' }}
        >
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            Paneli keşfedin
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <span className="font-mono text-sm text-ink-mute">
            "Octo, Logo verinizi okur ve eksigini söyler."
          </span>
        </div>
      </section>

      <section id="kollar" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Label>Dokuz kol · Tek orkestrasyon</Label>
          <h2 className="mt-4 max-w-2xl font-display text-4xl text-ink">
            Bir beyin, dokuz uzmanlık alanı.
          </h2>
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

      <section id="neden">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <Label>Bileşik veri hendeği</Label>
              <h2 className="mt-4 font-display text-4xl leading-tight text-ink">
                6. aydan sonra Octo işletmenizi sıfırdan başlayan herkesten daha iyi tanır.
              </h2>
            </div>
            <div className="flex flex-col justify-center gap-6">
              {[
                ['Türkiye-yerli mevzuat derinliği', '300+ yıllık düzenleme değişikliği takip edilir.'],
                ['Akıl yürütenkatman', 'ERP’leri değiştirmez — aralarındaki boşlukta kaybolan degeri kurtarır.'],
                ['Müşavirinizin yanında', 'Insan ilişkisinin altındaki zeka katmanı — yerine geçen değil.'],
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

      <section className="border-t border-line bg-ink">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-5xl italic text-paper">
            İşletmeniz düşünmeye başlasın.
          </h2>
          <p className="mt-4 text-sm text-paper/50">Ilk 50 şirket için 3 ay ücretsiz.</p>
          <Link
            to="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-crimson px-7 py-3.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            Octo paneline gir <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-ink-mute">
          <Wordmark className="text-xl" />
          <span className="font-mono">2026 Octo · İzmir, Türkiye</span>
        </div>
      </footer>

    </div>
  )
}