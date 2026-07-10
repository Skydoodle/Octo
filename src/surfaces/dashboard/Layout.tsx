import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Boxes,
  CalendarDays,
  CalendarRange,
  Database,
  ExternalLink,
  ListTodo,
  Menu,
  Receipt,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle, Wordmark } from '../../shared/utils/ui'
import Drawer from '../../shared/utils/Drawer'
import DataManager from './components/DataManager'
import { DropAnywhere } from './components/UniversalImport'
import { DataManagerContext } from './dataManagerContext'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  end?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Sizin için',
    items: [
      { to: '/dashboard', icon: CalendarDays, label: 'Bugün', end: true },
      { to: '/dashboard/yapilacaklar', icon: ListTodo, label: 'Yapılacaklar' },
      { to: '/dashboard/30-gun', icon: CalendarRange, label: '30 Gün' },
    ],
  },
  {
    label: 'İşletme',
    items: [
      { to: '/dashboard/finans', icon: Wallet, label: 'Finans' },
      { to: '/dashboard/vergi', icon: Receipt, label: 'Vergi' },
      { to: '/dashboard/ik', icon: Users, label: 'İnsan & Bordro' },
      { to: '/dashboard/operasyon', icon: Boxes, label: 'Operasyon' },
    ],
  },
]

const pageTitles: Array<[string, string]> = [
  ['/dashboard/yapilacaklar', 'Yapılacaklar'],
  ['/dashboard/30-gun', '30 Gün'],
  ['/dashboard/finans', 'Finans'],
  ['/dashboard/vergi', 'Vergi'],
  ['/dashboard/ik', 'İnsan & Bordro'],
  ['/dashboard/operasyon', 'Operasyon'],
  ['/dashboard', 'Bugün'],
]

function Navigation({ onNavigate, openData }: { onNavigate?: () => void; openData: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Ana menü" className="space-y-6">
        {navGroups.map(group => (
          <div key={group.label}>
            <div className="mb-2 px-3"><span className="label text-ink-mute">{group.label}</span></div>
            <div className="space-y-1">
              {group.items.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-crimson/10 font-medium text-crimson'
                        : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                    }`
                  }
                >
                  <Icon size={17} className="shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        <div>
          <div className="mb-2 px-3"><span className="label text-ink-mute">Araçlar</span></div>
          <button
            type="button"
            onClick={() => { openData(); onNavigate?.() }}
            className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Database size={17} className="shrink-0" />
            <span>Verileri Yönet</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default function Layout() {
  const [showData, setShowData] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const location = useLocation()
  const currentTitle = pageTitles.find(([path]) => path === '/dashboard'
    ? location.pathname === path
    : location.pathname.startsWith(path))?.[1] ?? 'Octo'
  const openData = () => setShowData(true)

  return (
    <DataManagerContext.Provider value={openData}>
      <div className="min-h-screen bg-paper md:flex">
        <DropAnywhere />
        {showData && <DataManager onClose={() => setShowData(false)} />}

        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/70 px-5 py-6 backdrop-blur md:flex">
          <div className="mb-8 flex items-center justify-between px-2">
            <Link to="/dashboard" className="focus-ring flex items-baseline gap-2 rounded">
              <Wordmark className="text-3xl" />
              <span className="label text-ink-mute">OS</span>
            </Link>
            <ThemeToggle />
          </div>
          <Navigation openData={openData} />
          <div className="mt-4 border-t border-line pt-4">
            <Link to="/" className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink">
              <ExternalLink size={17} className="shrink-0" />
              <span>Ana Sayfa</span>
            </Link>
            <div className="label px-3 pt-3 text-ink-mute">v0.1.0 — alpha</div>
          </div>
        </aside>

        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-paper/95 px-4 backdrop-blur md:hidden">
          <Link to="/dashboard" aria-label="Bugün sayfasına git" className="focus-ring rounded">
            <Wordmark className="text-2xl" />
          </Link>
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{currentTitle}</div>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setShowMobileMenu(true)}
            aria-label="Menüyü aç"
            aria-expanded={showMobileMenu}
            className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft"
          >
            <Menu size={18} />
          </button>
        </header>

        <Drawer open={showMobileMenu} onClose={() => setShowMobileMenu(false)} title="Menü">
          <Navigation openData={openData} onNavigate={() => setShowMobileMenu(false)} />
          <Link to="/" onClick={() => setShowMobileMenu(false)} className="focus-ring mt-8 flex items-center gap-3 rounded-lg border-t border-line px-3 py-4 text-sm text-ink-soft">
            <ExternalLink size={17} /> Ana Sayfa
          </Link>
        </Drawer>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </DataManagerContext.Provider>
  )
}
