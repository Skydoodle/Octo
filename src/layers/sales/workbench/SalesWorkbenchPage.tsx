import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Clock3, Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCompanies } from '../../../company/companyContext'
import { listBusinessParties } from '../crm/crmRepository'
import type { BusinessParty } from '../crm/types'
import { listSalesActivities, listSalesLeads, listSalesOpportunities, listSalesPipelineStages, listSalesPipelines } from '../execution/salesExecutionRepository'
import type { SalesActivity, SalesLead, SalesOpportunity, SalesPipelineStage } from '../execution/types'
import { listCurrentCustomerHealth } from '../health/customerHealthRepository'
import type { CustomerHealthAssessment } from '../health/types'
import { healthLabels } from '../health/customerHealthViewModel'
import { listSalesOrders } from '../orders/salesOrderRepository'
import type { SalesOrder } from '../orders/types'
import { listSalesQuotes } from '../quotes/quoteRepository'
import type { SalesQuote } from '../quotes/types'
import { PageState, buttonSecondary } from '../ui/CRMUI'
import { buildWorkbenchAttention, buildWorkbenchFlow, buildWorkbenchTimeline, pendingQuoteApprovals } from './salesWorkbenchModel'

type State = 'loading' | 'error' | 'ready'
const date = (value: string | null) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value)) : 'Tarih belirtilmedi'
const writable = (role: string | null | undefined) => role === 'owner' || role === 'employee'

function SectionHeader({ title, description }: { title: string; description?: string }) { return <div><h2 className="font-serif text-xl text-ink">{title}</h2>{description && <p className="mt-1 text-sm text-ink-mute">{description}</p>}</div> }
function FlowCard({ label, value, href, hint }: { label: string; value: number; href: string; hint: string }) { return <Link to={href} className="focus-ring rounded-card border border-line bg-surface p-4 hover:border-crimson/30"><p className="text-xs font-medium uppercase tracking-wide text-ink-mute">{label}</p><p className="mt-2 font-mono text-2xl text-ink">{value}</p><p className="mt-1 text-xs text-ink-mute">{hint}</p></Link> }

export default function SalesWorkbenchPage() {
  const { activeCompany } = useCompanies(); const requestId = useRef(0)
  const [state, setState] = useState<State>('loading'); const [partialErrors, setPartialErrors] = useState(0)
  const [parties, setParties] = useState<BusinessParty[]>([]); const [leads, setLeads] = useState<SalesLead[]>([]); const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]); const [stages, setStages] = useState<SalesPipelineStage[]>([]); const [activities, setActivities] = useState<SalesActivity[]>([]); const [quotes, setQuotes] = useState<SalesQuote[]>([]); const [orders, setOrders] = useState<SalesOrder[]>([]); const [health, setHealth] = useState<CustomerHealthAssessment[]>([])
  const load = useCallback(async () => {
    if (!activeCompany) return; const request = ++requestId.current; setState('loading'); setPartialErrors(0)
    const results = await Promise.all([listBusinessParties(activeCompany.id), listSalesLeads(activeCompany.id), listSalesPipelines(activeCompany.id), listSalesOpportunities(activeCompany.id), listSalesActivities(activeCompany.id), listSalesQuotes(activeCompany.id), listSalesOrders(activeCompany.id), listCurrentCustomerHealth(activeCompany.id)])
    if (request !== requestId.current) return
    const [partyResult, leadResult, pipelineResult, opportunityResult, activityResult, quoteResult, orderResult, healthResult] = results
    const failures = results.filter(result => result.error).length
    if (failures === results.length) return setState('error')
    const stageResults = pipelineResult.data ? await Promise.all(pipelineResult.data.filter(pipeline => pipeline.isActive && !pipeline.archivedAt).map(pipeline => listSalesPipelineStages(activeCompany.id, pipeline.id))) : []
    if (request !== requestId.current) return
    setParties(partyResult.data ?? []); setLeads(leadResult.data ?? []); setOpportunities(opportunityResult.data ?? []); setActivities(activityResult.data ?? []); setQuotes(quoteResult.data ?? []); setOrders(orderResult.data ?? []); setHealth(healthResult.data ?? []); setStages(stageResults.flatMap(result => result.data ?? [])); setPartialErrors(failures + stageResults.filter(result => result.error).length); setState('ready')
  }, [activeCompany])
  // Synchronize the workbench with the active company and ignore stale requests.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); return () => { requestId.current += 1 } }, [load])
  const input = useMemo(() => ({ parties, leads, opportunities, stages, activities, quotes, orders, health }), [parties, leads, opportunities, stages, activities, quotes, orders, health])
  const attention = useMemo(() => buildWorkbenchAttention(input).slice(0, 12), [input]); const flow = useMemo(() => buildWorkbenchFlow(input), [input]); const timeline = useMemo(() => buildWorkbenchTimeline(input), [input]); const approvals = useMemo(() => pendingQuoteApprovals(quotes), [quotes]); const canWrite = writable(activeCompany?.role)
  if (state === 'loading') return <main className="mx-auto max-w-7xl px-4 py-8 md:px-8"><PageState kind="loading" message="Satış çalışma alanı hazırlanıyor…" /></main>
  if (state === 'error') return <main className="mx-auto max-w-7xl px-4 py-8 md:px-8"><PageState kind="error" message="Satış çalışma alanı yüklenemedi." retry={() => void load()} /></main>
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="label text-crimson">Genel Bakış</div><h1 className="mt-1 font-serif text-3xl text-ink">Satış çalışma alanı</h1><p className="mt-2 max-w-2xl text-sm text-ink-soft">Güncel ticari kayıtlardan türetilen, nedenleri görünür ve eyleme dönük çalışma sırası.</p></div>{!canWrite && <p className="rounded-lg border border-line px-3 py-2 text-sm text-ink-mute">Salt okunur görünüm</p>}</header>
    {partialErrors > 0 && <div role="alert" className="rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-ink-soft">Bazı satış kaynakları yüklenemedi. Mevcut bölümler eksiksiz oldukları ölçüde gösteriliyor. <button type="button" className="font-medium text-crimson" onClick={() => void load()}>Yeniden dene</button></div>}
    <section className="rounded-card border border-line bg-surface p-5 md:p-6"><SectionHeader title="Bugün dikkat gerektirenler" description="Gecikme, blokaj ve açık takip ihtiyacına göre deterministik sırada." />{attention.length === 0 ? <div className="mt-5 rounded-lg bg-paper p-5 text-sm text-ink-soft"><CheckCircle2 size={18} className="mr-2 inline text-positive" />Bugün gecikmiş veya bloke olmuş satış takibi yok.</div> : <div className="mt-5 divide-y divide-line">{attention.map((item, index) => <article key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-crimson/10 text-xs font-medium text-crimson">{index + 1}</span><h3 className="truncate font-medium text-ink">{item.title}</h3></div><p className="mt-1 pl-8 text-sm text-ink-soft">{item.reason}</p><p className="mt-1 pl-8 text-xs text-ink-mute">{date(item.date)}</p></div><Link className={`${buttonSecondary} shrink-0 self-start`} to={item.href}>{item.action}<ArrowRight size={14} className="ml-2 inline" /></Link></article>)}</div>}</section>
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-card border border-line bg-surface p-5"><SectionHeader title="Octo hazırladı" /><div className="mt-4 rounded-lg border border-dashed border-line p-5 text-sm text-ink-soft"><Layers3 size={18} className="mb-3 text-ink-mute"/><p>Henüz hazırlanmış iş bulunmuyor. Teklif Hazırlama Asistanı devreye alındığında incelemeye hazır taslaklar burada görünecek.</p></div></section><section className="rounded-card border border-line bg-surface p-5"><SectionHeader title="Onayınızı bekliyor" description="Yalnız mevcut teklif onay kayıtları." />{approvals.length === 0 ? <p className="mt-4 rounded-lg bg-paper p-5 text-sm text-ink-soft">Onay bekleyen teklif yok.</p> : <div className="mt-4 space-y-2">{approvals.map(quote => <Link key={quote.id} to={`/dashboard/satis/teklifler/${quote.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 text-sm hover:border-crimson/30"><span><ClipboardCheck size={15} className="mr-2 inline text-crimson" />{quote.quoteNumber}</span><span className="text-ink-mute">{date(quote.updatedAt)}</span></Link>)}</div>}</section></div>
    <section><SectionHeader title="Ticari akış" description="Kayıt adetleri gösterilir; para birimleri ve parasal değerler birleştirilmez." /><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><FlowCard label="Aktif potansiyel" value={flow.activeLeads} href="/dashboard/satis/potansiyel-musteriler" hint="Dönüştürülmemiş ve elenmemiş"/><FlowCard label="Açık fırsat" value={flow.openOpportunities} href="/dashboard/satis/firsatlar" hint="Kapalı aşamada olmayan"/><FlowCard label="Yanıt bekleyen teklif" value={flow.awaitingResponseQuotes} href="/dashboard/satis/teklifler" hint="Gönderilmiş veya görüntülenmiş"/><FlowCard label="Sipariş bekleyen kabul" value={flow.acceptedAwaitingOrder} href="/dashboard/satis/teklifler" hint="Henüz siparişe dönüşmemiş"/><FlowCard label="Aktif sipariş" value={flow.activeOrders} href="/dashboard/satis/satis-siparisleri" hint="Tamamlanmamış veya iptal edilmemiş"/><FlowCard label="Riskli / kritik sağlık" value={flow.health.risky + flow.health.critical} href="/dashboard/satis/musteri-sagligi" hint={`${healthLabels.risky}: ${flow.health.risky} · ${healthLabels.critical}: ${flow.health.critical}`}/></div></section>
    <section className="rounded-card border border-line bg-surface p-5"><SectionHeader title="Son hareketler" description="Özel içerik içermeyen yapılandırılmış satış olayları." />{timeline.length === 0 ? <p className="mt-4 text-sm text-ink-soft">Gösterilebilecek güvenli satış hareketi bulunmuyor.</p> : <div className="mt-4 space-y-2">{timeline.map(item => <Link key={item.id} to={item.href} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3 text-sm hover:border-crimson/30"><span><Clock3 size={15} className="mr-2 inline text-ink-mute" /><strong>{item.label}</strong> · {item.context}</span><span className="text-xs text-ink-mute">{date(item.occurredAt)}</span></Link>)}</div>}</section>
    <aside className="rounded-lg border border-line bg-paper px-4 py-3 text-xs text-ink-mute"><AlertTriangle size={14} className="mr-2 inline" />Bu çalışma alanı gizli skor, tahmin, birleşik para tutarı veya hazırlanmış sahte iş üretmez. Kaynak kayıtlar mevcut domain sayfalarında ve RLS kuralları altında kalır.</aside>
  </main>
}
