import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { disableDemo, enableDemo } from '../shared/config'
import { ThemeToggle, Wordmark } from '../shared/utils/ui'
import LandingHero from './landing/LandingHero'
import LandingSections from './landing/LandingSections'

export default function Landing() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()

  const openDemo = () => {
    enableDemo()
    navigate('/dashboard')
  }

  const startEmpty = () => {
    disableDemo()
    navigate('/dashboard')
  }

  const handleSubmit = () => {
    if (!email || !email.includes('@')) return
    setSubmitted(true)
    setEmail('')
  }

  return (
    <div className="relative min-h-screen bg-paper">
      <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <Wordmark className="text-3xl" />
            <span className="hidden text-xs text-ink-mute sm:inline">Düşünen işletme sistemi</span>
          </div>
          <nav className="flex items-center gap-5">
            <a href="#nasil" className="hidden text-sm text-ink-soft hover:text-ink md:inline">Nasıl çalışır?</a>
            <a href="#alanlar" className="hidden text-sm text-ink-soft hover:text-ink md:inline">Neleri görür?</a>
            <a href="#musavir" className="hidden text-sm text-ink-soft hover:text-ink lg:inline">Müşavirler için</a>
            <ThemeToggle />
            <button onClick={startEmpty} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink sm:inline">Boş hesap</button>
            <button onClick={openDemo} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-crimson hover:text-crimson">Demoyu gör</button>
          </nav>
        </div>
      </header>

      <main>
        <LandingHero onDemo={openDemo} />
        <LandingSections email={email} submitted={submitted} onEmail={setEmail} onSubmit={handleSubmit} />
        <section className="border-t border-line bg-ink">
          <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <p className="font-mono text-sm uppercase tracking-widest text-crimson">Sekiz kol. Tek akıl.</p>
            <h2 className="mt-6 font-display text-5xl text-paper">İşletmenizde ne olduğunu değil, sırada ne olduğunu görün.</h2>
            <p className="mt-4 text-sm leading-relaxed text-paper/50">Octo’nun farklı işletme kayıtlarını nasıl bir araya getirdiğini gerçek bir demo üzerinde görün.</p>
            <button onClick={openDemo} className="mt-8 inline-flex items-center gap-2 rounded-full bg-crimson px-7 py-3.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">Demoyu görün <ArrowRight size={16} /></button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-ink-mute sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-3"><Wordmark className="text-xl" /><span>Düşünen işletme sistemi</span></div>
          <span className="font-mono">2026 Octo · İzmir, Türkiye</span>
        </div>
      </footer>
    </div>
  )
}
