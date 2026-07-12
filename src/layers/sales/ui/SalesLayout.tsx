import { NavLink, Outlet } from 'react-router-dom'

export default function SalesLayout() {
  return (
    <div className="min-w-0">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="label mb-1 text-crimson">İşletme</div>
          <h1 className="font-serif text-2xl text-ink md:text-3xl">Satış ve Teklifler</h1>
          <nav aria-label="Satış ve Teklifler bölümleri" className="mt-5 flex gap-2">
            {[
              ['/dashboard/satis/firmalar', 'Firmalar'],
              ['/dashboard/satis/kisiler', 'Kişiler'],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `focus-ring rounded-full border px-4 py-2 text-sm font-medium ${isActive ? 'border-crimson bg-crimson text-white' : 'border-line bg-paper text-ink-soft hover:border-crimson/40 hover:text-crimson'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
