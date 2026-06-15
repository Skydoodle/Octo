import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import {
  LayoutGrid, Wallet, Receipt, Scale,
  Users, Boxes, ShieldCheck, Mic, ExternalLink, Database
} from 'lucide-react'
import { Wordmark, ThemeToggle } from '../../shared/utils/ui'
import DataManager from './components/DataManager'
import { DropAnywhere } from './components/UniversalImport'

const navItems = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard', end: true },
  { to: '/dashboard/finans', icon: Wallet, label: 'Finans' },
  { to: '/dashboard/vergi', icon: Receipt, label: 'Vergi' },
  { to: '/dashboard/hukuk', icon: Scale, label: 'Hukuk' },
  { to: '/dashboard/ik', icon: Users, label: 'İnsan Kaynakları' },
  { to: '/dashboard/operasyon', icon: Boxes, label: 'Operasyon' },
  { to: '/dashboard/voice', icon: Mic, label: 'Octo Voice' },
  { to: '/dashboard/denetim', icon: ShieldCheck, label: 'Denetim' },
]

export default function Layout() {
  const [showData, setShowData] = useState(false)
  return (
    <div className="flex min-h-screen bg-paper">
      <DropAnywhere />
      {showData && <DataManager onClose={() => setShowData(false)} />}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/60 px-5 py-6 backdrop-blur md:flex">
        <div className="mb-8 flex items-center justify-between px-2">
          <Link to="/dashboard" className="flex items-baseline gap-2">
            <Wordmark className="text-3xl" />
            <span className="label text-ink-mute">OS</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mb-3 px-2">
          <span className="label text-ink-mute">Beyin Kolları</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-crimson/10 text-crimson font-medium'
                    : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-line pt-4">
          <button
            onClick={() => setShowData(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Database size={17} className="shrink-0" />
            <span>Verileri Yönet</span>
          </button>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ExternalLink size={17} className="shrink-0" />
            <span>Ana Sayfa</span>
          </Link>
          <div className="label text-ink-mute px-3 pt-3">v0.1.0 — alpha</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
