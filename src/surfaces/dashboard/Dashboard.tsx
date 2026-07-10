import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, Sparkles } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { buildDataCoverage } from '../../coverage/dataCoverage'
import { calculateCashPosition, calculateMonthlyExpenses, calculateRunway } from '../../layers/finance/logic/cashPosition'
import { getUpcomingPayables, getTotalPayables } from '../../layers/finance/logic/apSchedule'
import { getOverdueReceivables, getTotalReceivables } from '../../layers/finance/logic/arAging'
import { momDelta, monthlyTrend as buildTrend } from '../../layers/finance/logic/metrics'
import { useFinanceStore } from '../../layers/finance/financeStore'
import { useIKStore } from '../../layers/hr/hrStore'
import { useOpStore } from '../../layers/operations/opStore'
import { useTaxStore } from '../../layers/tax/taxStore'
import { useBriefing } from '../../orchestrator/useBriefing'
import type { Aciliyet } from '../../orchestrator/orchestrator'
import { runReasoningEngine } from '../../reasoning/engine'
import { buildReasoningSignals } from '../../reasoning/signalAdapters'
import { useCompanyObligationSettings, type CompanyBaseCurrency } from '../../settings/companyObligationSettings'
import EmptyState from '../../shared/utils/EmptyState'
import { Card, Label } from '../../shared/utils/ui'
import { buildAuditSummary } from './dashboardData'
import { useDataManager } from './dataManagerContext'
import DataCoverageCard from './components/DataCoverageCard'
import { ImportZone } from './components/UniversalImport'
import AttentionQueue from './ownerHome/AttentionQueue'
import BusinessStatus from './ownerHome/BusinessStatus'
import ThirtyDayCashStrip from './ownerHome/ThirtyDayCashStrip'
import {
  buildOwnerInsightViewModel,
  deriveBusinessStatus,
  rankOwnerInsights,
} from './ownerHome/ownerHomeViewModel'
import { buildThirtyDayCashSummary } from './horizon/thirtyDayViewModel'

const fmt = (value: number, currency: CompanyBaseCurrency = 'TRY') => {
  const amount = Math.round(value).toLocaleString('tr-TR')
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

function TodayHeader({ now, openData }: { now: Date; openData: () => void }) {
  const date = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(now)
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="label text-crimson">Sizin için</div>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">Bugün</h1>
        <p className="mt-1 capitalize text-sm text-ink-mute">{date}</p>
      </div>
      <button
        type="button"
        onClick={openData}
        className="focus-ring self-start rounded bg-crimson px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 sm:self-auto"
      >
        + Veri ekle
      </button>
    </header>
  )
}

function BusinessPulse({
  items,
}: {
  items: Array<{ label: string; value: string; hint: string; path: string; delta?: number | null }>
}) {
  return (
    <section aria-labelledby="pulse-title">
      <div className="mb-3">
        <div className="label text-ink-mute">İşletme nabzı</div>
        <h2 id="pulse-title" className="mt-1 font-display text-2xl font-semibold text-ink">Temel görünüm</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const up = (item.delta ?? 0) >= 0
          return (
            <Link key={item.label} to={item.path} className="focus-ring rounded-card">
              <Card className="h-full p-5 transition-colors hover:border-crimson/30" delay={index * 40}>
                <Label>{item.label}</Label>
                <div className="mt-3 font-mono text-xl font-medium text-ink">{item.value}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  {item.delta !== null && item.delta !== undefined && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-positive' : 'text-crimson'}`}>
                      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {Math.abs(item.delta).toFixed(1)}%
                    </span>
                  )}
                  <span className="text-xs leading-relaxed text-ink-mute">{item.hint}</span>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default function Dashboard() {
  const now = new Date()
  const openData = useDataManager()
  const { briefing, loading, regenerate } = useBriefing()
  const finance = useFinanceStore()
  const companySettings = useCompanyObligationSettings()
  const tax = useTaxStore()
  const hr = useIKStore()
  const operations = useOpStore()

  const signals = buildReasoningSignals(now)
  const cases = runReasoningEngine(signals, now, companySettings.baseCurrency)
  const coverage = buildDataCoverage(now)
  const ownerInsights = rankOwnerInsights(cases.map(item => buildOwnerInsightViewModel(item, now)))
  const businessStatus = deriveBusinessStatus(cases, coverage, signals, now)
  const cashSummary = buildThirtyDayCashSummary(now, signals, finance, companySettings)

  const baseAccountIds = new Set(finance.accounts
    .filter(account => account.currency === companySettings.baseCurrency)
    .map(account => account.id))
  const baseInvoices = finance.invoices.filter(invoice => invoice.currency === companySettings.baseCurrency)
  const baseTransactions = finance.transactions.filter(transaction => baseAccountIds.has(transaction.accountId))
  const cash = calculateCashPosition(finance.accounts, companySettings.baseCurrency)
  const monthlyExpenses = calculateMonthlyExpenses(baseTransactions)
  const runway = calculateRunway(cash.netCash, monthlyExpenses)
  const totalReceivables = getTotalReceivables(baseInvoices)
  const overdueReceivables = getOverdueReceivables(baseInvoices)
  const totalPayables = getTotalPayables(baseInvoices)
  const upcomingPayables = getUpcomingPayables(baseInvoices)
  const trend = buildTrend(baseTransactions, 6)
  const cashflow = trend.map(point => ({ m: point.month, gelir: point.gelir, gider: point.gider }))
  const audit = buildAuditSummary()
  const last = trend[trend.length - 1]
  const previous = trend[trend.length - 2]
  const monthlyIncome = last?.gelir ?? 0
  const revenueDelta = momDelta(monthlyIncome, previous?.gelir ?? 0)
  const hasTransactions = baseTransactions.length > 0
  const hasAnyData = finance.accounts.length > 0 || finance.invoices.length > 0 || hasTransactions ||
    tax.beyannameler.length > 0 || tax.compliance.length > 0 || hr.personeller.length > 0 ||
    operations.urunler.length > 0 || operations.siparisler.length > 0 || operations.uretimler.length > 0
  const pendingLeave = hr.izinler.filter(item => item.durum === 'beklemede').length

  const pulse = [
    {
      label: `${companySettings.baseCurrency} nakit`,
      value: finance.accounts.some(account => account.currency === companySettings.baseCurrency) ? fmt(cash.netCash, companySettings.baseCurrency) : 'Henüz yok',
      hint: cash.conversionMissing ? 'Diğer para birimleri kura çevrilmedi.' : runway >= 999 ? 'Nakit pisti henüz hesaplanamıyor.' : `${runway} ay nakit pisti.`,
      path: '/dashboard/finans',
      delta: null,
    },
    {
      label: 'Alacaklar',
      value: fmt(totalReceivables, companySettings.baseCurrency),
      hint: `${fmt(overdueReceivables, companySettings.baseCurrency)} gecikmiş.`,
      path: '/dashboard/finans',
      delta: null,
    },
    {
      label: 'Borçlar',
      value: fmt(totalPayables, companySettings.baseCurrency),
      hint: `${fmt(upcomingPayables, companySettings.baseCurrency)} 30 gün içinde.`,
      path: '/dashboard/finans',
      delta: null,
    },
    {
      label: 'Bu ay tahsilat',
      value: fmt(monthlyIncome, companySettings.baseCurrency),
      hint: 'Kayıtlı banka işlemlerine göre.',
      path: '/dashboard/finans',
      delta: revenueDelta,
    },
  ]

  return (
    <div className="space-y-5">
      <TodayHeader now={now} openData={openData} />
      <BusinessStatus status={businessStatus} />

      {!hasAnyData && (
        <div className="space-y-4">
          <ImportZone />
          <DataCoverageCard />
        </div>
      )}

      <AttentionQueue items={ownerInsights} />
      <ThirtyDayCashStrip summary={cashSummary} />

      {pendingLeave > 0 && (
        <Link to="/dashboard/yapilacaklar" className="focus-ring flex items-center justify-between gap-3 rounded-card border border-warn/25 bg-warn/5 px-5 py-4">
          <div>
            <div className="text-sm font-medium text-ink">{pendingLeave} izin talebi kararınızı bekliyor</div>
            <div className="mt-1 text-xs text-ink-mute">Çalışan bilgileri ve izin bakiyesiyle birlikte inceleyebilirsiniz.</div>
          </div>
          <span className="shrink-0 text-xs font-medium text-warn">Karar ver</span>
        </Link>
      )}

      {hasAnyData && <DataCoverageCard compact />}
      <BusinessPulse items={pulse} />

      <Card className="overflow-hidden">
        <section aria-labelledby="briefing-title" className="p-6 md:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-crimson" />
              <h2 id="briefing-title"><Label>Günlük özet</Label></h2>
            </div>
            <button type="button" onClick={regenerate} disabled={loading} className="focus-ring rounded label text-ink-mute transition-colors hover:text-crimson disabled:opacity-40">
              {loading ? 'hazırlanıyor…' : 'Yenile'}
            </button>
          </div>
          {loading ? (
            <p className="text-[0.95rem] italic leading-relaxed text-ink-mute">Günlük özet hazırlanıyor…</p>
          ) : (!briefing.ozet && briefing.kollar.length === 0) ? (
            <EmptyState compact title="Özet için veri yok" hint="Finans, vergi, İK veya operasyon verisi girildiğinde günlük özet hazırlanır." />
          ) : (
            <>
              <p className="text-[0.95rem] leading-relaxed text-ink-soft">{briefing.ozet}</p>
              <div className="mt-5 space-y-3">
                {briefing.kollar.map((item, index) => (
                  <div key={`${item.kol}-${index}`} className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor[item.aciliyet] || 'bg-ink-mute'}`} />
                    <div>
                      <span className="label text-ink-mute">{item.kol}</span>
                      <p className="mt-1 text-sm text-ink">{item.metin}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4"><Label>Nakit akışı · 6 ay</Label></div>
          <div className="mb-3 flex items-center gap-4 text-xs text-ink-mute">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-crimson" />Gelir</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-mute" />Gider</span>
          </div>
          <div className="h-56 min-w-0">
            {hasTransactions ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={224}>
                <AreaChart data={cashflow} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="today-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(195 75 75)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="rgb(195 75 75)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="today-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(138 133 125)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="rgb(138 133 125)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: 'rgb(138 133 125)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 8, fontSize: 12 }} formatter={value => [fmt(Number(value ?? 0), companySettings.baseCurrency), '']} />
                  <Area type="monotone" dataKey="gelir" stroke="rgb(195 75 75)" strokeWidth={2} fill="url(#today-income)" dot={false} />
                  <Area type="monotone" dataKey="gider" stroke="rgb(138 133 125)" strokeWidth={1.5} fill="url(#today-expense)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Nakit akışı verisi yok" hint="İşlem girildiğinde altı aylık akış burada görünür." />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <Label>Denetim özeti</Label>
          {audit.length > 0 ? (
            <div className="mt-4 space-y-3">
              {audit.map(item => (
                <div key={item.area} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-5 w-5 place-items-center rounded-full ${item.status === 'ok' ? 'bg-positive/15 text-positive' : 'bg-warn/15 text-warn'}`}>
                      {item.status === 'ok' ? <Check size={12} /> : <AlertTriangle size={11} />}
                    </span>
                    <span className="text-sm text-ink">{item.area}</span>
                  </div>
                  <span className="text-right text-xs text-ink-mute">{item.note}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact title="Denetim verisi yok" hint="Vergi ve uyumluluk kayıtları girildiğinde özet burada görünür." />
          )}
        </Card>
      </div>
    </div>
  )
}
