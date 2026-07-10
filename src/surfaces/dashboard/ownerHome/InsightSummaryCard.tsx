import { useState } from 'react'
import { ArrowRight, Copy, Clock3 } from 'lucide-react'
import { Card } from '../../../shared/utils/ui'
import { ConfidenceBadge } from '../../../shared/utils/Confidence'
import type { InsightActionState } from '../../../shared/insights/insightActionStore'
import { insightActionStatusLabels } from '../../../shared/insights/insightActionStore'
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

async function copyText(value: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export default function InsightSummaryCard({
  insight,
  actionState,
  onInspect,
}: {
  insight: OwnerInsightViewModel
  actionState?: InsightActionState
  onInspect: () => void
}) {
  const [copyStatus, setCopyStatus] = useState('')
  const handleCopy = async () => {
    const copied = await copyText(`${insight.title}\n${insight.summary}\nÖneri: ${insight.recommendation}`)
    setCopyStatus(copied ? 'Özet kopyalandı' : 'Kopyalama desteklenmiyor')
  }

  return (
    <Card className="p-4 md:p-5">
      <article>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityStyle[insight.severity]}`}>
            {severityLabels[insight.severity]}
          </span>
          <ConfidenceBadge confidence={insight.confidence} />
          {actionState && actionState.status !== 'new' && (
            <span className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft">
              {insightActionStatusLabels[actionState.status]}
            </span>
          )}
          {insight.timeLabel && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-mute">
              <Clock3 size={13} /> {insight.timeLabel}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold leading-snug text-ink">{insight.title}</h3>
        <p className="line-clamp-2 mt-1 text-sm leading-relaxed text-ink-soft">{insight.summary}</p>
        <p className="line-clamp-2 mt-2 text-xs leading-relaxed text-ink-mute">{insight.confidenceExplanation}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {insight.domains.map(domain => (
            <span key={domain} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-ink-soft">
              {domainLabels[domain]}
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <button
            type="button"
            id={`owner-insight-trigger-${encodeURIComponent(insight.id)}`}
            onClick={onInspect}
            className="focus-ring inline-flex items-center gap-2 rounded bg-crimson px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            İncele <ArrowRight size={15} />
          </button>
          <div className="flex items-center gap-2">
            {copyStatus && <span role="status" className="text-xs text-ink-mute">{copyStatus}</span>}
            <button
              type="button"
              onClick={handleCopy}
              className="focus-ring inline-flex items-center gap-1.5 rounded px-2 py-2 text-xs text-ink-mute hover:text-ink"
            >
              <Copy size={13} /> Özeti kopyala
            </button>
          </div>
        </div>
      </article>
    </Card>
  )
}
