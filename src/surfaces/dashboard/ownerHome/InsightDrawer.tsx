import { useState } from 'react'
import { Check, Clipboard, RotateCcw, UserRound } from 'lucide-react'
import Drawer from '../../../shared/utils/Drawer'
import {
  ConfidenceBadge,
  ConfidenceExplanation,
  DataFreshnessLabel,
  MissingDataNotice,
} from '../../../shared/utils/Confidence'
import {
  insightActionStatusLabels,
  setInsightActionState,
  useInsightActionStates,
  type InsightActionStatus,
} from '../../../shared/insights/insightActionStore'
import {
  domainLabels,
  severityLabels,
  type OwnerInsightViewModel,
} from './ownerHomeViewModel'

const severityStyle: Record<OwnerInsightViewModel['severity'], string> = {
  critical: 'bg-crimson/10 text-crimson',
  warning: 'bg-warn/10 text-warn',
  info: 'bg-ink-mute/10 text-ink-soft',
}

function formatMoney(value: number, currency?: string): string {
  const formatted = Math.round(value).toLocaleString('tr-TR')
  if (currency === 'USD') return `$${formatted}`
  if (currency === 'EUR') return `€${formatted}`
  return `₺${formatted}`
}

function sourceLabel(source?: 'recorded' | 'derived' | 'forecast'): string {
  if (source === 'derived') return 'Türetilmiş'
  if (source === 'forecast') return 'Tahmin'
  return 'Kaynak kayıt'
}

export default function InsightDrawer({
  insight,
  open,
  onClose,
}: {
  insight: OwnerInsightViewModel | null
  open: boolean
  onClose: () => void
}) {
  const actionStates = useInsightActionStates()
  const actionState = insight ? actionStates.find(item => item.insightId === insight.id) : undefined
  const [assignedTo, setAssignedTo] = useState(actionState?.assignedTo ?? '')
  const [feedback, setFeedback] = useState('')

  if (!insight) return null

  const updateStatus = (status: InsightActionStatus) => {
    setInsightActionState(insight.id, { status })
    setFeedback(`Durum “${insightActionStatusLabels[status]}” olarak güncellendi.`)
  }
  const saveOwner = () => {
    setInsightActionState(insight.id, { assignedTo })
    setFeedback(assignedTo.trim() ? 'Sorumlu kaydedildi.' : 'Sorumlu kaldırıldı.')
  }
  const copySummary = async () => {
    if (!navigator.clipboard?.writeText) {
      setFeedback('Tarayıcınız kopyalamayı desteklemiyor.')
      return
    }
    try {
      await navigator.clipboard.writeText(`${insight.title}\n${insight.summary}\nÖneri: ${insight.recommendation}`)
      setFeedback('Özet kopyalandı.')
    } catch {
      setFeedback('Özet kopyalanamadı.')
    }
  }
  const signals = [...insight.signals].sort((a, b) =>
    (a.eventDate ?? '9999-12-31').localeCompare(b.eventDate ?? '9999-12-31') || a.id.localeCompare(b.id),
  )
  const currentStatus = actionState?.status ?? 'new'

  return (
    <Drawer open={open} onClose={onClose} title={insight.title}>
      <div className="space-y-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityStyle[insight.severity]}`}>
              {severityLabels[insight.severity]}
            </span>
            <ConfidenceBadge confidence={insight.confidence} />
            <span className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft">
              {insightActionStatusLabels[currentStatus]}
            </span>
            {insight.eventDate && <span className="font-mono text-xs text-ink-mute">{insight.eventDate}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {insight.domains.map(domain => (
              <span key={domain} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-soft">
                {domainLabels[domain]}
              </span>
            ))}
          </div>
        </div>

        <section aria-labelledby="what-happening">
          <h3 id="what-happening" className="font-display text-xl font-semibold text-ink">Ne oluyor?</h3>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{insight.summary}</p>
          {(insight.horizonStart || insight.horizonEnd) && (
            <p className="mt-3 font-mono text-xs text-ink-mute">
              Dönem: {insight.horizonStart ?? '—'} – {insight.horizonEnd ?? insight.horizonStart ?? '—'}
            </p>
          )}
        </section>

        <section aria-labelledby="event-flow">
          <h3 id="event-flow" className="font-display text-xl font-semibold text-ink">Ödeme ve olay akışı</h3>
          {signals.length === 0 ? (
            <p className="mt-3 text-sm text-ink-mute">Bu sonuç için tarihli bir olay sinyali bulunmuyor.</p>
          ) : (
            <div className="mt-4 divide-y divide-line rounded-card border border-line bg-surface">
              {signals.map(signal => (
                <div key={signal.id} className="grid grid-cols-[6.5rem_1fr] gap-3 px-4 py-3.5 sm:grid-cols-[7rem_1fr_auto]">
                  <div className="font-mono text-xs text-ink-mute">{signal.eventDate ?? 'Tarih yok'}</div>
                  <div>
                    <div className="text-sm font-medium text-ink">{signal.label}</div>
                    <div className="mt-1 text-xs text-ink-mute">
                      {domainLabels[signal.domain]} · {sourceLabel(signal.obligation?.source)}
                    </div>
                  </div>
                  <div className={`col-start-2 font-mono text-sm sm:col-start-auto ${signal.kind === 'cash_inflow' ? 'text-positive' : signal.kind === 'cash_outflow' ? 'text-crimson' : 'text-ink-soft'}`}>
                    {typeof signal.amount === 'number' && Number.isFinite(signal.amount)
                      ? `${signal.kind === 'cash_inflow' ? '+' : signal.kind === 'cash_outflow' ? '−' : ''}${formatMoney(signal.amount, signal.currency)}`
                      : signal.quantity !== undefined ? `${signal.quantity.toLocaleString('tr-TR')} birim` : 'Operasyonel etki'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="next-actions">
          <h3 id="next-actions" className="font-display text-xl font-semibold text-ink">Ne yapabilirsiniz?</h3>
          <div className="mt-3 rounded-card border border-line bg-surface p-4">
            <p className="text-sm leading-relaxed text-ink-soft">{insight.recommendation}</p>
            <p className="mt-3 text-xs text-ink-mute">Sorumlu: {actionState?.assignedTo || insight.owner}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {currentStatus === 'resolved' || currentStatus === 'dismissed' ? (
              <button type="button" onClick={() => updateStatus('reviewed')} className="focus-ring inline-flex items-center gap-1.5 rounded border border-line px-3 py-2 text-sm text-ink-soft hover:text-ink">
                <RotateCcw size={14} /> Yeniden aç
              </button>
            ) : (
              <>
                <button type="button" onClick={() => updateStatus('reviewed')} className="focus-ring inline-flex items-center gap-1.5 rounded border border-line px-3 py-2 text-sm text-ink-soft hover:text-ink">
                  <Check size={14} /> İncelendi olarak işaretle
                </button>
                <button type="button" onClick={() => updateStatus('resolved')} className="focus-ring rounded bg-ink px-3 py-2 text-sm text-paper hover:opacity-90">Çözüldü olarak işaretle</button>
                <button type="button" onClick={() => updateStatus('dismissed')} className="focus-ring rounded px-3 py-2 text-sm text-ink-mute hover:text-ink">İlgili değil</button>
              </>
            )}
            <button type="button" onClick={copySummary} className="focus-ring inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm text-ink-mute hover:text-ink">
              <Clipboard size={14} /> Özeti kopyala
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-center">
            <label htmlFor="insight-owner" className="inline-flex shrink-0 items-center gap-2 text-sm text-ink-soft"><UserRound size={15} /> Sorumlu belirle</label>
            <input
              id="insight-owner"
              value={assignedTo}
              onChange={event => setAssignedTo(event.target.value)}
              placeholder="Kişi veya rol"
              className="min-w-0 flex-1 rounded border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-crimson"
            />
            <button type="button" onClick={saveOwner} className="focus-ring rounded border border-line px-3 py-2 text-sm text-ink-soft hover:text-ink">Kaydet</button>
          </div>
          {feedback && <p role="status" className="mt-2 text-xs text-positive">{feedback}</p>}
        </section>

        <section aria-labelledby="evidence-calculation">
          <h3 id="evidence-calculation" className="font-display text-xl font-semibold text-ink">Kanıt ve hesaplama</h3>
          <div className="mt-4 space-y-5">
            <div>
              <h4 className="label text-ink-mute">Kayıtlar</h4>
              <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface px-4">
                {insight.sources.length === 0 ? (
                  <li className="py-3 text-sm text-ink-mute">Kaynak kayıt referansı bulunmuyor.</li>
                ) : insight.sources.map(source => (
                  <li key={`${source.domain}:${source.recordType}:${source.recordId}`} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:justify-between">
                    <span className="text-ink-soft">{source.label}</span>
                    {source.value && <span className="font-mono text-xs text-ink">{source.value}</span>}
                  </li>
                ))}
              </ul>
              <div className="mt-2"><DataFreshnessLabel value={insight.freshness} /></div>
            </div>

            <div>
              <h4 className="label text-ink-mute">Yöntem</h4>
              <div className="mt-2 space-y-3 rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-ink-soft">
                <p className="font-mono text-xs">{insight.calculation}</p>
                <p>{insight.rule}</p>
              </div>
            </div>

            <div>
              <h4 className="label text-ink-mute">Güvenilirlik</h4>
              <div className="mt-2 space-y-3">
                <ConfidenceExplanation explanation={insight.confidenceExplanation} repairAction={insight.confidenceRepairAction} />
                <MissingDataNotice items={insight.missingData} />
              </div>
            </div>

            <div>
              <h4 className="label text-ink-mute">Sorumluluk</h4>
              <div className="mt-2 rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-ink-soft">
                <p>{insight.recommendation}</p>
                <p className="mt-2 text-xs text-ink-mute">Sorumlu: {actionState?.assignedTo || insight.owner}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Drawer>
  )
}
