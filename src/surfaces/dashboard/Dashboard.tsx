import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowUpRight, ArrowDownRight, Check, AlertTriangle } from 'lucide-react'
import { Card, Label } from '../../shared/utils/ui'
import EmptyState from '../../shared/utils/EmptyState'
import { useBriefing } from '../../orchestrator/useBriefing'
import type { Aciliyet } from '../../orchestrator/orchestrator'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useFinanceStore } from '../../layers/finance/financeStore'
import { useTaxStore } from '../../layers/tax/taxStore'
import { useIKStore } from '../../layers/hr/hrStore'
import { useOpStore } from '../../layers/operations/opStore'
import { runAllDetectors } from '../../shared/insights/detectors'
import InsightCard from './components/InsightCard'
import { calculateCashPosition, calculateRunway, calculateMonthlyExpenses } from '../../layers/finance/logic/cashPosition'
import { getTotalReceivables, getOverdueReceivables } from '../../layers/finance/logic/arAging'
import { getTotalPayables, getUpcomingPayables } from '../../layers/finance/logic/apSchedule'
import { monthlyTrend as buildTrend, momDelta } from '../../layers/finance/logic/metrics'
import { buildAuditSummary, buildHorizon } from './dashboardData'
import { ImportZone } from './components/UniversalImport'
import DataCoverageCard from './components/DataCoverageCard'
import { useCompanyObligationSettings, type CompanyBaseCurrency } from '../../settings/companyObligationSettings'

const fmt = (n: number, currency: CompanyBaseCurrency = 'TRY') => {
  const amount = Math.round(n).toLocaleString('tr-TR')
  if (currency === 'TRY') return `₺${amount}`
  if (currency === 'USD') return `$${amount}`
  return `€${amount}`
}

const dotColor: Record<Aciliyet, string> = {
  kritik: 'bg-crimson',
  dikkat: 'bg-warn',
  stabil: 'bg-positive',
  notr: 'bg-ink-mute',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { briefing, loading, regenerate } = useBriefing()
  const { accounts, invoices, transactions } = useFinanceStore()
  const companySettings = useCompanyObligationSettings()
  const tax = useTaxStore() // subscribe so audit/horizon re-derive when tax data changes
  const hr = useIKStore()
  const operations = useOpStore()
  const insights = runAllDetectors()

  const baseAccountIds = new Set(accounts
    .filter(account => account.currency === companySettings.baseCurrency)
    .map(account => account.id))
  const baseInvoices = invoices.filter(invoice => invoice.currency === companySettings.baseCurrency)
  const baseTransactions = transactions.filter(transaction => baseAccountIds.has(transaction.accountId))
  const cash = calculateCashPosition(accounts, companySettings.baseCurrency)
  const monthlyExpenses = calculateMonthlyExpenses(baseTransactions)
  const runway = calculateRunway(cash.netCash, monthlyExpenses)
  const totalReceivables = getTotalReceivables(baseInvoices)
  const overdueReceivables = getOverdueReceivables(baseInvoices)
  const totalPayables = getTotalPayables(baseInvoices)
  const upcomingPayables = getUpcomingPayables(baseInvoices)

  // ---- All derived from live stores (no hardcoded data) ----
  const trend = buildTrend(baseTransactions, 6)
  const cashflow = trend.map(p => ({ m: p.month, gelir: p.gelir, gider: p.gider }))
  const audit = buildAuditSummary()
  const horizon = buildHorizon()

  const hasTransactions = baseTransactions.length > 0
  const hasFinanceData = accounts.length > 0 || invoices.length > 0 || hasTransactions

  // Real month-over-month deltas from the trend.
  const last = trend[trend.length - 1]
  const prev = trend[trend.length - 2]
  const revenueDelta = momDelta(last?.gelir ?? 0, prev?.gelir ?? 0)
  const monthlyIncome = last?.gelir ?? 0

  const kpis = [
    {
      label: `${companySettings.baseCurrency} Nakit Pozisyonu`,
      value: fmt(cash.netCash, companySettings.baseCurrency),
      delta: null as number | null,
      hint: cash.conversionMissing ? 'diğer para birimleri kura çevrilmedi' : runway >= 999 ? 'pist hesaplanamadı' : runway + ' ay pist',
      path: '/dashboard/finans',
    },
    { label: 'Toplam Alacak', value: fmt(totalReceivables, companySettings.baseCurrency), delta: null as number | null, hint: fmt(overdueReceivables, companySettings.baseCurrency) + ' gecikmiş', path: '/dashboard/finans' },
    { label: 'Toplam Borç', value: fmt(totalPayables, companySettings.baseCurrency), delta: null as number | null, hint: fmt(upcomingPayables, companySettings.baseCurrency) + ' 30 günde', path: '/dashboard/finans' },
    { label: 'Bu Ay Ciro', value: fmt(monthlyIncome, companySettings.baseCurrency), delta: revenueDelta, hint: 'bu ay tahsilat', path: '/dashboard/finans' },
  ]

  const hasAnyData = hasFinanceData ||
    tax.beyannameler.length > 0 ||
    tax.compliance.length > 0 ||
    hr.personeller.length > 0 ||
    operations.urunler.length > 0 ||
    operations.siparisler.length > 0 ||
    operations.uretimler.length > 0

  return (
    <div className="space-y-5">

      {/* Context-aware import: prominent onboarding when empty, quiet when not */}
      {!hasAnyData ? (
        <ImportZone />
      ) : (
        <div className="flex justify-end">
          <div className="w-auto"><ImportZone compact /></div>
        </div>
      )}

      <DataCoverageCard />

      <Card className="overflow-hidden" delay={0}>
        <div className="p-7">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-crimson" />
              <Label>Günlük Brifing</Label>
            </div>
            <button
              onClick={regenerate}
              disabled={loading}
              className="label text-ink-mute hover:text-crimson transition-colors disabled:opacity-40"
            >
              {loading ? 'oluşturuluyor...' : 'Yenile'}
            </button>
          </div>

          {loading ? (
            <p className="text-[0.95rem] italic leading-relaxed text-ink-mute">Yapay zeka brifing hazırlıyor...</p>
          ) : (!briefing.ozet && briefing.kollar.length === 0) ? (
            <EmptyState compact title="Brifing için veri yok" hint="Finans, vergi, İK veya operasyon verisi girildiğinde brifing otomatik oluşturulur." />
          ) : (
            <>
              <p className="text-[0.95rem] leading-relaxed text-ink-soft">{briefing.ozet}</p>
              <div className="mt-5 space-y-3">
                {briefing.kollar.map((k, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                    <span className={'mt-1 h-2 w-2 shrink-0 rounded-full ' + (dotColor[k.aciliyet] || 'bg-ink-mute')} />
                    <div>
                      <span className="label text-ink-mute">{k.kol}</span>
                      <p className="mt-1 text-sm text-ink">{k.metin}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5">
            <span className="label text-ink-mute">Müşaviriniz için hazırlandı</span>
          </div>
        </div>
      </Card>

      {insights.length > 0 && (
        <div className="space-y-3">
          <Label>Denetlenebilir İçgörüler</Label>
          {insights.map(ins => <InsightCard key={ins.id} insight={ins} />)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const up = (k.delta ?? 0) >= 0
          return (
            <Card key={k.label} className="p-5 cursor-pointer hover:border-crimson/40 transition-colors" delay={80 + i * 60}>
              <div onClick={() => navigate(k.path)}>
                <Label>{k.label}</Label>
                <div className="mt-3 font-mono text-2xl font-medium tracking-tight text-ink">{k.value}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  {k.delta !== null && (
                    <span className={'inline-flex items-center gap-0.5 text-xs font-medium ' + (up ? 'text-positive' : 'text-crimson')}>
                      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {Math.abs(k.delta).toFixed(1)}%
                    </span>
                  )}
                  <span className="text-xs text-ink-mute">{k.hint}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2" delay={160}>
          <div className="mb-4"><Label>Nakit Akışı 6 Ay</Label></div>
          <div className="mb-3 flex items-center gap-4 text-xs text-ink-mute">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-crimson" />Gelir</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-mute" />Gider</span>
          </div>
          <div className="h-56" style={{ minHeight: 224, minWidth: 0 }}>
            {hasTransactions ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={224}>
                <AreaChart data={cashflow} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="g-gelir" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(195 75 75)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="rgb(195 75 75)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-gider" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(138 133 125)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="rgb(138 133 125)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: 'rgb(138 133 125)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'rgb(255 254 251)', border: '1px solid rgb(226 221 211)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [fmt(Number(v ?? 0), companySettings.baseCurrency), '']} />
                  <Area type="monotone" dataKey="gelir" stroke="rgb(195 75 75)" strokeWidth={2} fill="url(#g-gelir)" dot={false} />
                  <Area type="monotone" dataKey="gider" stroke="rgb(138 133 125)" strokeWidth={1.5} fill="url(#g-gider)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Nakit akışı verisi yok" hint="İşlem girildiğinde 6 aylık akış burada görünecek." />
            )}
          </div>
        </Card>

        <Card className="p-6" delay={200}>
          <Label>Denetim Özeti</Label>
          {audit.length > 0 ? (
            <div className="mt-4 space-y-3">
              {audit.map(a => (
                <div key={a.area} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={'grid h-5 w-5 place-items-center rounded-full ' + (a.status === 'ok' ? 'bg-positive/15 text-positive' : 'bg-warn/15 text-warn')}>
                      {a.status === 'ok' ? <Check size={12} /> : <AlertTriangle size={11} />}
                    </span>
                    <span className="text-sm text-ink">{a.area}</span>
                  </div>
                  <span className="text-xs text-ink-mute">{a.note}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact title="Denetim verisi yok" hint="Vergi ve uyumluluk kayıtları girildiğinde özet burada çıkar." />
          )}
        </Card>
      </div>

      <Card className="p-6" delay={240}>
        <Label>30 Günlük Ufuk</Label>
        {horizon.length > 0 ? (
          <div className="relative mt-5 pl-4">
            <span className="absolute left-[3px] top-1 bottom-1 w-px bg-line" />
            <div className="space-y-5">
              {horizon.map((h, i) => (
                <div key={i} className="relative">
                  <span className={'absolute -left-[13px] top-1 h-2 w-2 rounded-full border-2 bg-paper ' + (h.tone === 'crimson' ? 'border-crimson' : h.tone === 'warn' ? 'border-warn' : h.tone === 'positive' ? 'border-positive' : 'border-line')} />
                  <div className="font-mono text-xs text-ink-mute">{h.day}</div>
                  <div className="mt-0.5 text-sm text-ink">{h.event}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState compact title="Yaklaşan kayıt yok" hint="Beyanname ve fatura vadeleri girildiğinde 30 günlük ufuk burada belirir." />
        )}
      </Card>

    </div>
  )
}
