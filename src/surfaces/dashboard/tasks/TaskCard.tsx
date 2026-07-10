import { Link } from 'react-router-dom'
import { Calendar, UserRound } from 'lucide-react'
import { Card } from '../../../shared/utils/ui'
import type { OwnerTaskViewModel } from '../ownerHome/taskViewModel'

const severityStyle: Record<OwnerTaskViewModel['severity'], string> = {
  critical: 'bg-crimson/10 text-crimson',
  warning: 'bg-warn/10 text-warn',
  info: 'bg-ink-mute/10 text-ink-soft',
}

export default function TaskCard({
  task,
  onApproveLeave,
  onRejectLeave,
  onReopenInsight,
  onAddData,
}: {
  task: OwnerTaskViewModel
  onApproveLeave: (task: OwnerTaskViewModel) => void
  onRejectLeave: (task: OwnerTaskViewModel) => void
  onReopenInsight: (task: OwnerTaskViewModel) => void
  onAddData: () => void
}) {
  return (
    <Card className="p-5">
      <article>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityStyle[task.severity]}`}>{task.status}</span>
          <span className="text-xs text-ink-mute">
            {task.sourceType === 'insight' ? 'İçgörü' : task.sourceType === 'leave' ? 'İzin talebi' : 'Veri durumu'}
          </span>
        </div>
        <h3 className="mt-3 text-sm font-semibold leading-snug text-ink">{task.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{task.explanation}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
          {task.dueDate && <span className="inline-flex items-center gap-1"><Calendar size={13} /> {task.dueDate}</span>}
          {task.responsible && <span className="inline-flex items-center gap-1"><UserRound size={13} /> {task.responsible}</span>}
          {task.remainingLeave !== undefined && <span>Mevcut yıllık izin: {task.remainingLeave} gün</span>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {task.sourceType === 'leave' && task.category === 'approvals' ? (
            <>
              <button type="button" onClick={() => onApproveLeave(task)} className="focus-ring rounded bg-positive px-3 py-2 text-sm font-medium text-white hover:opacity-90">Onayla</button>
              <button type="button" onClick={() => onRejectLeave(task)} className="focus-ring rounded border border-crimson/30 px-3 py-2 text-sm text-crimson hover:bg-crimson/5">Reddet</button>
              <Link to={task.href} className="focus-ring rounded px-3 py-2 text-sm text-ink-mute hover:text-ink">Detayı gör</Link>
            </>
          ) : task.sourceType === 'insight' && task.category === 'completed' ? (
            <>
              <button type="button" onClick={() => onReopenInsight(task)} className="focus-ring rounded border border-line px-3 py-2 text-sm text-ink-soft hover:text-ink">Yeniden aç</button>
              <Link to={task.href} className="focus-ring rounded px-3 py-2 text-sm text-ink-mute hover:text-ink">Kanıtı gör</Link>
            </>
          ) : task.sourceType === 'coverage' ? (
            <>
              <button type="button" onClick={onAddData} className="focus-ring rounded bg-crimson px-3 py-2 text-sm font-medium text-white hover:opacity-90">Veri ekle</button>
              <Link to={task.href} className="focus-ring rounded px-3 py-2 text-sm text-ink-mute hover:text-ink">Katmana git</Link>
            </>
          ) : (
            <Link to={task.href} className="focus-ring rounded bg-ink px-3 py-2 text-sm font-medium text-paper hover:opacity-90">{task.primaryAction}</Link>
          )}
        </div>
      </article>
    </Card>
  )
}
