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
          <nav aria-label="Satış ve Teklifler bölümleri" className="mt-5 space-y-3">
            {[
              ['Genel Bakış', [['/dashboard/satis', 'Genel Bakış']]],
              ['Müşteriler', [['/dashboard/satis/firmalar', 'Firmalar'], ['/dashboard/satis/kisiler', 'Kişiler'], ['/dashboard/satis/musteri-sagligi', 'Müşteri Sağlığı']]],
              ['Satış Süreci', [['/dashboard/satis/potansiyel-musteriler', 'Potansiyel Müşteriler'], ['/dashboard/satis/firsatlar', 'Fırsatlar'], ['/dashboard/satis/pipeline', 'Pipeline'], ['/dashboard/satis/aktiviteler', 'Aktiviteler']]],
              ['Ticari İşlemler', [['/dashboard/satis/hazirlanan-isler', 'Hazırlanan İşler'], ['/dashboard/satis/teklifler', 'Teklifler'], ['/dashboard/satis/satis-siparisleri', 'Satış Siparişleri']]],
            ].map(([group, links]) => <div key={group as string} className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center"><span className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mute">{group as string}</span><div className="flex gap-2 overflow-x-auto pb-1">{(links as string[][]).map(([to, label]) => <NavLink key={to} end={to === '/dashboard/satis'} to={to} className={({ isActive }) => `focus-ring whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${isActive ? 'border-crimson bg-crimson text-white' : 'border-line bg-paper text-ink-soft hover:border-crimson/40 hover:text-crimson'}`}>{label}</NavLink>)}</div></div>)}
          </nav>
        </div>
      </header>
      <Outlet />
      {importOpen && activeCompany && <SalesImportModal companyId={activeCompany.id} onClose={() => setImportOpen(false)} />}
    </div>
  )
}
