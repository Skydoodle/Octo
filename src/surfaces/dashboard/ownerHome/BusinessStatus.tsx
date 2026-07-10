import { AlertCircle, CheckCircle2, CircleDashed, TriangleAlert } from 'lucide-react'
import type { BusinessStatusViewModel } from './ownerHomeViewModel'

const toneStyle: Record<BusinessStatusViewModel['tone'], string> = {
  critical: 'border-crimson/30 bg-crimson/5',
  warning: 'border-warn/30 bg-warn/5',
  stable: 'border-positive/25 bg-positive/5',
  insufficient: 'border-line bg-surface-2',
}

function StatusIcon({ tone }: { tone: BusinessStatusViewModel['tone'] }) {
  if (tone === 'critical') return <AlertCircle size={20} className="text-crimson" />
  if (tone === 'warning') return <TriangleAlert size={20} className="text-warn" />
  if (tone === 'stable') return <CheckCircle2 size={20} className="text-positive" />
  return <CircleDashed size={20} className="text-ink-mute" />
}

export default function BusinessStatus({ status }: { status: BusinessStatusViewModel }) {
  return (
    <section aria-labelledby="business-status-title" className={`rounded-card border px-5 py-4 md:px-6 ${toneStyle[status.tone]}`}>
      <div className="flex items-start gap-3.5">
        <span className="mt-1 shrink-0"><StatusIcon tone={status.tone} /></span>
        <div>
          <h2 id="business-status-title" className="label text-ink-mute">İşletme durumu</h2>
          <p className="balanced-wrap mt-1.5 font-display text-2xl font-medium leading-tight text-ink md:text-[1.65rem]">
            {status.message}
          </p>
        </div>
      </div>
    </section>
  )
}
