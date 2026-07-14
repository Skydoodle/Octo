import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useCompanies } from '../../../company/companyContext'
import SalesImportModal from '../import/SalesImportModal'
import { canWriteCRM } from './salesViewModel'

export default function SalesLayout() {
  const { activeCompany } = useCompanies()
  const [importOpen, setImportOpen] = useState(false)
  const canImport = canWriteCRM(activeCompany)
  return (
    <div className="min-w-0">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="label mb-1 text-crimson">İşletme</div>
          <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-2xl text-ink md:text-3xl">Satış ve Teklifler</h1>{canImport && <button type="button" onClick={() => setImportOpen(true)} className="focus-ring rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink-soft hover:border-crimson/35 hover:text-crimson"><FileSpreadsheet size={16} className="mr-2 inline" />Excel’den aktar</button>}</div>
          <nav aria-label="Satış ve Teklifler bölümleri" className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {[
              ['/dashboard/satis/firmalar', 'Firmalar'],
              ['/dashboard/satis/kisiler', 'Kişiler'],
              ['/dashboard/satis/potansiyel-musteriler', 'Potansiyel Müşteriler'],
              ['/dashboard/satis/firsatlar', 'Fırsatlar'],
              ['/dashboard/satis/pipeline', 'Pipeline'],
              ['/dashboard/satis/aktiviteler', 'Aktiviteler ve Görevler'],
              ['/dashboard/satis/teklifler', 'Teklifler'],
              ['/dashboard/satis/satis-siparisleri', 'Satış Siparişleri'],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `focus-ring rounded-full border px-4 py-2 text-sm font-medium ${isActive ? 'border-crimson bg-crimson text-white' : 'border-line bg-paper text-ink-soft hover:border-crimson/40 hover:text-crimson'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <Outlet />
      {importOpen && activeCompany && <SalesImportModal companyId={activeCompany.id} onClose={() => setImportOpen(false)} />}
    </div>
  )
}
