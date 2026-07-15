import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, CircleDot } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFinanceData } from '../../../layers/finance/ui/FinanceDataContext'
import { productionSignalsOnly } from '../../../layers/finance/ui/productionFinanceSignals'
import { useIKStore } from '../../../layers/hr/hrStore'
import { useOpStore } from '../../../layers/operations/opStore'
import { useTaxStore } from '../../../layers/tax/taxStore'
import { runReasoningEngine } from '../../../reasoning/engine'
import { buildReasoningSignalsWithoutLegacyFinance } from '../../../reasoning/signalAdapters'
import { useCompanyObligationSettings } from '../../../settings/companyObligationSettings'
import { ExcludedDataList } from '../../../shared/utils/Confidence'
import EmptyState from '../../../shared/utils/EmptyState'
import { Card, Label } from '../../../shared/utils/ui'
import ThirtyDayCashStrip from '../ownerHome/ThirtyDayCashStrip'
import { domainLabels } from '../ownerHome/ownerHomeViewModel'
import {
  buildThirtyDayCashSummary,
  buildThirtyDayTimeline,
  type ThirtyDayCashEvent,
  type ThirtyDayCashSummary,
} from './thirtyDayViewModel'

function money(value: number, currency: string): string {
  const amount = Math.round(value).toLocaleString('tr-TR')
  if (currency === 'USD') return `$${amount}`
  if (currency === 'EUR') return `€${amount}`
  return `₺${amount}`
}

interface ChartPoint {
  key: string
  date: string
  event: string
  amount: number | null
  direction: ThirtyDayCashEvent['direction'] | null
  sourceType: string
  confirmedBalance: number | null
  projectedBalance: number | null
}

function buildChartData(summary: ThirtyDayCashSummary): ChartPoint[] {
  if (summary.currentCash === null) return []
  let confirmed = summary.currentCash
  let projected = summary.currentCash
  const points: ChartPoint[] = [{
    key: 'opening',
    date: summary.startDate,
    event: 'Başlangıç bakiyesi',
    amount: null,
    direction: null,
    sourceType: 'Kayıt',
    confirmedBalance: confirmed,
    projectedBalance: projected,
  }]
  for (const event of summary.events) {
    const change = event.direction === 'inflow' ? event.amount : -event.amount
    projected += change
    if (event.certainty === 'confirmed') confirmed += change
    points.push({
      key: event.id,
      date: event.date,
      event: event.label,
      amount: event.amount,
      direction: event.direction,
      sourceType: event.certainty === 'confirmed' ? 'Teyitli' : `Beklenen · ${event.sourceType}`,
      confirmedBalance: confirmed,
      projectedBalance: projected,
    })
  }
  return points
}

export default function ThirtyDayPage() {
  const now = new Date()
  const { snapshot: finance } = useFinanceData()
  useTaxStore()
  useIKStore()
  useOpStore()
  const settings = useCompanyObligationSettings()
  const signals = productionSignalsOnly(buildReasoningSignalsWithoutLegacyFinance(now), finance)
  const cases = runReasoningEngine(signals, now, settings.baseCurrency)
  const summary = buildThirtyDayCashSummary(now, signals, null, settings)
  const timeline = buildThirtyDayTimeline(now, signals)
  const chartData = buildChartData(summary)
  const timelineSignalIds = new Set(timeline.map(event => event.id))
  const relevantCases = cases.filter(item => item.signals.some(signal => timelineSignalIds.has(signal.id)))

  return (
    <div className="space-y-7">
      <header>
        <div className="label text-crimson">Sizin için</div>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">30 Gün</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Nakit, vergi, bordro, tahsilat ve operasyon kayıtlarının aynı zaman çizelgesindeki etkisi.
        </p>
      </header>

      <ThirtyDayCashStrip summary={summary} />

      <section aria-labelledby="balance-chart-title">
        <Card className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <Label>Koşan bakiye</Label>
              <h2 id="balance-chart-title" className="mt-1 font-display text-2xl font-semibold text-ink">Teyitli ve beklenen görünüm</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-ink-mute">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-ink" /> Yalnız teyitli</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-crimson" /> Beklenenlerle birlikte</span>
            </div>
          </div>
          {chartData.length > 1 ? (
            <div className="mt-5 h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 6, left: 4 }}>
                  <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--ink-mute))', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} width={58} tick={{ fill: 'rgb(var(--ink-mute))', fontSize: 10 }} tickFormatter={value => `${Math.round(Number(value) / 1000)}b`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]?.payload) return null
                      const point = payload[0].payload as ChartPoint
                      return (
                        <div className="max-w-xs rounded-lg border border-line bg-surface p-3 text-xs shadow-soft">
                          <div className="font-mono text-ink-mute">{point.date}</div>
                          <div className="mt-1 font-medium text-ink">{point.event}</div>
                          {point.amount !== null && (
                            <div className="mt-1 font-mono text-ink-soft">
                              {point.direction === 'inflow' ? '+' : '−'}{money(point.amount, summary.currency)}
                            </div>
                          )}
                          <div className="mt-1 text-ink-mute">{point.sourceType}</div>
                        </div>
                      )
                    }}
                  />
                  <Line type="stepAfter" dataKey="confirmedBalance" name="Teyitli bakiye" stroke="rgb(var(--ink))" strokeWidth={1.5} dot={false} connectNulls />
                  <Line type="stepAfter" dataKey="projectedBalance" name="Beklenen bakiye" stroke="rgb(var(--crimson))" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="Koşan bakiye henüz hesaplanamıyor" hint="Güncel ana para birimi bakiyesi ve 30 gün içinde tarihli nakit olayları ekleyin." />
            </div>
          )}
          {summary.state === 'partial' && (
            <p className="mt-3 text-xs leading-relaxed text-warn">Grafik yalnızca geçerli tarih, tutar ve ana para birimindeki kayıtları içeriyor.</p>
          )}
        </Card>
      </section>

      <section aria-labelledby="timeline-title">
        <div className="mb-3">
          <div className="label text-ink-mute">Zaman çizelgesi</div>
          <h2 id="timeline-title" className="mt-1 font-display text-2xl font-semibold text-ink">Yaklaşan olaylar</h2>
        </div>
        {timeline.length === 0 ? (
          <Card className="p-6"><EmptyState title="Yaklaşan kayıt yok" hint="Fatura vadeleri, beyannameler, bordro, sipariş veya üretim tarihleri eklendiğinde burada görünür." /></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-line">
              {timeline.map(event => (
                <div key={event.id} className="grid grid-cols-[6.5rem_1fr] gap-3 px-5 py-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                  <div className="font-mono text-xs text-ink-mute">{event.date}</div>
                  <div className="min-w-0">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 shrink-0 ${event.effect === 'inflow' ? 'text-positive' : event.effect === 'outflow' ? 'text-crimson' : 'text-warn'}`}>
                        {event.effect === 'inflow' ? <ArrowUp size={14} /> : event.effect === 'outflow' ? <ArrowDown size={14} /> : <CircleDot size={13} />}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-ink">{event.label}</div>
                        <div className="mt-1 text-xs text-ink-mute">
                          {domainLabels[event.domain]} · {event.certainty === 'confirmed' ? 'Teyitli' : 'Beklenen'} · {event.sourceType}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`col-start-2 font-mono text-sm sm:col-start-auto ${event.effect === 'inflow' ? 'text-positive' : event.effect === 'outflow' ? 'text-crimson' : 'text-ink-soft'}`}>
                    {event.amount !== undefined && event.currency
                      ? `${event.effect === 'inflow' ? '+' : event.effect === 'outflow' ? '−' : ''}${money(event.amount, event.currency)}`
                      : 'Operasyonel etki'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      <ExcludedDataList items={summary.excluded} />

      {relevantCases.length > 0 && (
        <section aria-labelledby="horizon-insights-title">
          <h2 id="horizon-insights-title" className="font-display text-2xl font-semibold text-ink">İlgili içgörüler</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {relevantCases.map(item => (
              <Link key={item.id} to={`/dashboard?insight=${encodeURIComponent(item.id)}`} className="focus-ring rounded-card border border-line bg-surface p-4 transition-colors hover:border-crimson/30">
                <div className="text-sm font-medium text-ink">{item.title}</div>
                <p className="line-clamp-2 mt-1.5 text-xs leading-relaxed text-ink-mute">{item.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
