import { Link, useSearchParams } from 'react-router-dom'
import { useInsightActionStates } from '../../../shared/insights/insightActionStore'
import type { OwnerInsightViewModel } from './ownerHomeViewModel'
import InsightDrawer from './InsightDrawer'
import InsightSummaryCard from './InsightSummaryCard'

export default function AttentionQueue({ items }: { items: OwnerInsightViewModel[] }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const actionStates = useInsightActionStates()
  const selected = items.find(item => item.id === searchParams.get('insight')) ?? null
  const visible = items.slice(0, 3)

  const openInsight = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('insight', id)
    setSearchParams(next)
  }
  const closeInsight = () => {
    const selectedId = selected?.id
    const next = new URLSearchParams(searchParams)
    next.delete('insight')
    setSearchParams(next, { replace: true })
    window.requestAnimationFrame(() => {
      if (selectedId) document.getElementById(`owner-insight-trigger-${encodeURIComponent(selectedId)}`)?.focus()
    })
  }

  return (
    <section aria-labelledby="attention-title">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <div className="label text-crimson">Öncelikler</div>
          <h2 id="attention-title" className="mt-1 font-display text-2xl font-semibold text-ink">Neye dikkat etmelisiniz?</h2>
        </div>
        {items.length > 0 && <Link to="/dashboard/yapilacaklar" className="focus-ring rounded text-xs font-medium text-ink-mute hover:text-crimson">Tümünü gör</Link>}
      </div>
      {visible.length === 0 ? (
        <div className="rounded-card border border-positive/20 bg-positive/5 px-5 py-5 text-sm text-ink-soft">
          Kayıtlı verilerde bugün öncelikli bir içgörü bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {visible.map(item => (
            <InsightSummaryCard
              key={item.id}
              insight={item}
              actionState={actionStates.find(state => state.insightId === item.id)}
              onInspect={() => openInsight(item.id)}
            />
          ))}
        </div>
      )}
      <InsightDrawer key={selected?.id ?? 'closed'} insight={selected} open={Boolean(selected)} onClose={closeInsight} />
    </section>
  )
}
