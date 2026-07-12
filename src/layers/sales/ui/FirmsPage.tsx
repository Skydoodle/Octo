import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Plus, Search } from 'lucide-react'
import { useCompanies } from '../../../company/companyContext'
import Modal from '../../../surfaces/dashboard/components/Modal'
import { createBusinessParty, listBusinessParties } from '../crm/crmRepository'
import type { BusinessParty, BusinessPartyCreateInput, BusinessPartyRoleName, BusinessRelationshipStatus } from '../crm/types'
import FirmForm from './FirmForm'
import { Badge, PageState, buttonPrimary, inputClass } from './CRMUI'
import { canWriteCRM, filterFirms, formatDate, maskTaxId, roleLabels, statusLabels } from './salesViewModel'

export default function FirmsPage() {
  const { activeCompany } = useCompanies()
  const canWrite = canWriteCRM(activeCompany)
  const [parties, setParties] = useState<BusinessParty[]>([])
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filters, setFilters] = useState<{ search: string; role: '' | BusinessPartyRoleName; status: '' | BusinessRelationshipStatus; includeArchived: boolean }>({ search: '', role: '', status: '', includeArchived: false })
  const load = useCallback(async () => {
    if (!activeCompany) return
    const result = await listBusinessParties(activeCompany.id, { includeArchived: true })
    if (result.error) return setState('error')
    setParties(result.data); setState('ready')
  }, [activeCompany])
  // The effect synchronizes this route with the active company's remote CRM records.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  const visible = useMemo(() => filterFirms(parties, filters), [parties, filters])
  const clear = () => setFilters({ search: '', role: '', status: '', includeArchived: false })
  const create = async (input: BusinessPartyCreateInput) => {
    if (!activeCompany) return
    setSaving(true); setFormError(null)
    const result = await createBusinessParty(activeCompany.id, input)
    setSaving(false)
    if (result.error) return setFormError(result.error.message)
    setCreateOpen(false); setNotice('Firma oluşturuldu.'); await load()
  }
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-serif text-2xl text-ink">Firmalar</h2><p className="mt-1 text-sm text-ink-soft">Ticari ilişkilerinizi tek ve güvenilir firma kaydında yönetin.</p></div>{canWrite && <button type="button" onClick={() => { setFormError(null); setCreateOpen(true) }} className={buttonPrimary}><Plus size={16} className="mr-2 inline" />Yeni firma</button>}</div>
    {notice && <div role="status" className="rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    <section aria-label="Firma filtreleri" className="grid gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-2 lg:grid-cols-5">
      <label className="relative lg:col-span-2"><span className="sr-only">Firma ara</span><Search size={16} className="pointer-events-none absolute left-3 top-3 text-ink-mute" /><input className={`${inputClass} pl-9`} placeholder="Ad, unvan, VKN veya e-posta ara" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} /></label>
      <label><span className="sr-only">Rol</span><select className={inputClass} value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value as typeof f.role }))}><option value="">Tüm roller</option>{Object.entries(roleLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label><span className="sr-only">İlişki durumu</span><select className={inputClass} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as typeof f.status }))}><option value="">Tüm durumlar</option>{Object.entries(statusLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={filters.includeArchived} onChange={e => setFilters(f => ({ ...f, includeArchived: e.target.checked }))} />Arşivdekiler</label><button type="button" onClick={clear} className="text-xs font-medium text-crimson hover:underline">Filtreleri temizle</button></div>
    </section>
    {state === 'loading' && <PageState kind="loading" message="Firmalar yükleniyor…" />}
    {state === 'error' && <PageState kind="error" message="Firmalar yüklenemedi. Şirket bağlantınızı kontrol edip yeniden deneyin." retry={() => { setState('loading'); void load() }} />}
    {state === 'ready' && visible.length === 0 && <PageState kind="empty" message={parties.length === 0 ? (canWrite ? 'Henüz firma yok. İlk firma kaydınızı oluşturarak başlayabilirsiniz.' : 'Bu şirkette henüz firma kaydı bulunmuyor.') : 'Filtrelerle eşleşen firma bulunamadı.'} />}
    {state === 'ready' && visible.length > 0 && <div className="grid gap-3 lg:grid-cols-2">{visible.map(party => <Link key={party.id} to={`/dashboard/satis/firmalar/${party.id}`} className="focus-ring group min-w-0 rounded-card border border-line bg-surface p-5 hover:border-crimson/30 hover:shadow-soft">
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-crimson/10 text-crimson"><Building2 size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-medium text-ink group-hover:text-crimson">{party.displayName}</h3>{party.archivedAt && <Badge muted>Arşivde</Badge>}<Badge>{statusLabels[party.relationshipStatus]}</Badge></div>{party.legalName && party.legalName !== party.displayName && <p className="mt-1 truncate text-sm text-ink-soft">{party.legalName}</p>}</div></div>
      <div className="mt-4 flex flex-wrap gap-2">{party.roles.map(role => <Badge key={role}>{roleLabels[role]}</Badge>)}</div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-ink-mute">Sektör / şehir</dt><dd className="mt-1 text-ink-soft">{[party.sector, party.city].filter(Boolean).join(' · ') || '—'}</dd></div><div><dt className="text-ink-mute">İletişim</dt><dd className="mt-1 truncate text-ink-soft">{party.mainEmail || party.mainPhone || '—'}</dd></div><div><dt className="text-ink-mute">Vergi kimliği</dt><dd className="mt-1 text-ink-soft">{maskTaxId(party.taxId)}</dd></div><div><dt className="text-ink-mute">Son güncelleme</dt><dd className="mt-1 text-ink-soft">{formatDate(party.updatedAt)}</dd></div></dl>
    </Link>)}</div>}
    {createOpen && <Modal title="Yeni firma" onClose={() => !saving && setCreateOpen(false)} width="780px"><FirmForm saving={saving} serverError={formError} onCancel={() => setCreateOpen(false)} onCreate={input => void create(input)} /></Modal>}
  </main>
}
