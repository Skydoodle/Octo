import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeToggle, Wordmark } from '../shared/utils/ui'

export default function AuthAccessLayout({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Link to="/" className="focus-ring flex items-baseline gap-2 rounded">
          <Wordmark className="text-3xl" />
          <span className="label text-ink-mute">OS</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1fr_28rem] lg:px-8">
        <section className="hidden max-w-xl lg:block">
          <div className="label text-crimson">{eyebrow}</div>
          <h1 className="balanced-wrap mt-4 font-display text-5xl font-semibold leading-[1.05] text-ink">
            Hesabınızın kontrolü sizde.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft">
            Octo hesabınıza güvenli biçimde erişin ve işletme görünümünüze kaldığınız yerden devam edin.
          </p>
        </section>
        <section className="w-full rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-crimson/10 text-crimson">
            <Icon size={19} />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-mute">{description}</p>
          {children}
        </section>
      </div>
    </main>
  )
}
