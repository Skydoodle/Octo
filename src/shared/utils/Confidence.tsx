import { AlertCircle, Clock3 } from 'lucide-react'
import type { ReasoningConfidence } from '../../reasoning/types'
import { confidenceLabels } from '../../surfaces/dashboard/ownerHome/ownerHomeViewModel'

const confidenceStyle: Record<ReasoningConfidence, string> = {
  high: 'bg-positive/10 text-positive',
  medium: 'bg-warn/10 text-warn',
  low: 'bg-warn/10 text-warn',
}

export function ConfidenceBadge({ confidence }: { confidence: ReasoningConfidence }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${confidenceStyle[confidence]}`}>
      {confidenceLabels[confidence]}
    </span>
  )
}

export function ConfidenceExplanation({
  explanation,
  repairAction,
}: {
  explanation: string
  repairAction?: string
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm leading-relaxed">
      <p className="text-ink-soft">{explanation}</p>
      {repairAction && <p className="mt-1.5 text-xs font-medium text-ink">{repairAction}</p>}
    </div>
  )
}

export function MissingDataNotice({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-warn/30 bg-warn/5 p-3.5">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <AlertCircle size={15} className="text-warn" /> Eksik bilgiler
      </div>
      <ul className="mt-2 space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
        {items.map(item => <li key={item} className="list-disc">{item}</li>)}
      </ul>
    </div>
  )
}

export function DataFreshnessLabel({ value }: { value: string }) {
  return (
    <span className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-ink-mute">
      <Clock3 size={13} className="mt-0.5 shrink-0" /> Veri güncelliği: {value}
    </span>
  )
}

export function ExcludedDataList({
  items,
}: {
  items: Array<{ id: string; label: string; detail: string }>
}) {
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4">
      <div className="text-sm font-medium text-ink">Hesaba dahil edilmeyen kayıtlar</div>
      <ul className="mt-2 space-y-2 text-sm text-ink-soft">
        {items.map(item => (
          <li key={item.id}>
            <span className="font-medium text-ink">{item.label}:</span> {item.detail}
          </li>
        ))}
      </ul>
    </div>
  )
}
