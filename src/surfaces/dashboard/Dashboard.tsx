import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react'
import { buildDataCoverageWithoutLegacyFinance } from '../../coverage/dataCoverage'
import { useFinanceData } from '../../layers/finance/ui/FinanceDataContext'
import { currencyOverview, productionFinanceCoverage } from '../../layers/finance/ui/financeUIModel'
import { productionSignalsOnly } from '../../layers/finance/ui/productionFinanceSignals'
import { useIKStore } from '../../layers/hr/hrStore'
import { useOpStore } from '../../layers/operations/opStore'
import { useTaxStore } from '../../layers/tax/taxStore'
import { useBriefing } from '../../orchestrator/useBriefing'
import type { Aciliyet } from '../../orchestrator/orchestrator'
import { runReasoningEngine } from '../../reasoning/engine'
import { buildReasoningSignalsWithoutLegacyFinance } from '../../reasoning/signalAdapters'
import { useCompanyObligationSettings, type CompanyBaseCurrency } from '../../settings/companyObligationSettings'
import EmptyState from '../../shared/utils/EmptyState'
import { Card, Label } from '../../shared/utils/ui'
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
  const { snapshot: finance, loading: financeLoading } = useFinanceData()
  const companySettings = useCompanyObligationSettings()
  const tax = useTaxStore()
  const hr = useIKStore()
  const operations = useOpStore()

  const signals = productionSignalsOnly(buildReasoningSignalsWithoutLegacyFinance(now), finance)
  const { briefing, loading, regenerate } = useBriefing(signals)
  const cases = runReasoningEngine(signals, now, companySettings.baseCurrency)
  const legacyCoverage = buildDataCoverageWithoutLegacyFinance(now)
  const financeCoverage = productionFinanceCoverage(finance)
  const coverage = {...legacyCoverage,domains:legacyCoverage.domains.map(domain=>domain.domain==='finance'?{...domain,...financeCoverage,freshness:'Supabase şirket kayıtları'}:domain)}
  const ownerInsights = rankOwnerInsights(cases.map(item => buildOwnerInsightViewModel(item, now)))
  const businessStatus = deriveBusinessStatus(cases, coverage, signals, now)
  const cashSummary = buildThirtyDayCashSummary(now, signals, null, companySettings)
  const base = currencyOverview(finance,now).find(row=>row.currency===companySettings.baseCurrency)
  const hasAnyData = finance.accounts.length > 0 || finance.invoices.length > 0 || finance.payments.length > 0 ||
    tax.beyannameler.length > 0 || tax.compliance.length > 0 || hr.personeller.length > 0 ||
    operations.urunler.length > 0 || operations.siparisler.length > 0 || operations.uretimler.length > 0
  const pendingLeave = hr.izinler.filter(item => item.durum === 'beklemede').length

  const pulse = [
    {
      label: 'Açık alacak',
      value: base ? fmt(base.openReceivable, companySettings.baseCurrency) : 'Henüz yok',
      hint: 'Yalnız ana para birimindeki Supabase alacakları.',
      path: '/dashboard/finans/alacaklar',
      delta: null,
    },
    {
      label: 'Gecikmiş alacak',
      value: base ? fmt(base.overdueReceivable, companySettings.baseCurrency) : 'Henüz yok',
      hint: 'Vadesi geçmiş açık faturalar.',
      path: '/dashboard/finans/alacaklar',
      delta: null,
    },
    {
      label: '30 gün içinde vadesi gelen',
      value: base ? fmt(base.dueWithin30Days, companySettings.baseCurrency) : 'Henüz yok',
      hint: 'Kesinleşmiş ve kısmen tahsil edilmiş faturalar.',
      path: '/dashboard/finans/alacaklar',
      delta: null,
    },
    {
      label: 'Bu ay tahsilat',
      value: base ? fmt(base.collectionsThisMonth, companySettings.baseCurrency) : 'Henüz yok',
      hint: 'Octo’da kaydedilen tahsilatlar.',
      path: '/dashboard/finans/tahsilatlar',
      delta: null,
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

      <Card className="p-6"><Label>Finans veri sınırı</Label><p className="mt-3 text-sm text-ink-soft">{financeLoading?'Supabase Finans kayıtları yükleniyor…':'Octo kayıt bakiyesi doğrulanmış banka bakiyesi değildir. Gider ödemeleri, borçlar, banka mutabakatı ve güvenilir nakit pisti bu aşamada hesaplanmaz.'}</p></Card>
    </div>
  )
}
