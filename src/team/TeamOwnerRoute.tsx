import type { ReactNode } from 'react'
import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCompanies } from '../company/companyContext'
import { ThemeToggle, Wordmark } from '../shared/utils/ui'
import { canManageTeam } from './teamAccess'

export default function TeamOwnerRoute({ children }: { children: ReactNode }) {
  const { activeCompany } = useCompanies()
  if (canManageTeam(activeCompany)) return children

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Link to="/dashboard" className="focus-ring flex items-baseline gap-2 rounded">
          <Wordmark className="text-3xl" /><span className="label text-ink-mute">OS</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className="grid min-h-[calc(100vh-73px)] place-items-center px-5 py-10">
        <section className="w-full max-w-md rounded-card border border-crimson/25 bg-surface p-7 text-center shadow-soft">
          <ShieldX size={28} className="mx-auto text-crimson" />
          <h1 className="mt-4 font-display text-3xl font-semibold text-ink">Erişim izniniz yok</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">Ekip ayarlarını yalnızca aktif şirket sahibi görüntüleyebilir.</p>
          <Link to="/dashboard" className="focus-ring mt-6 inline-flex rounded-lg bg-crimson px-4 py-2.5 text-sm font-medium text-white">Panele dön</Link>
        </section>
      </div>
    </main>
  )
}
