import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ThirtyDayCashSummary } from '../horizon/thirtyDayViewModel'

function money(value: number | null, currency: ThirtyDayCashSummary['currency']): string {
  if (value === null) return 'Henüz hesaplanamıyor'
  const formatted = Math.abs(Math.round(value)).toLocaleString('tr-TR')
  const sign = value < 0 ? '−' : ''
  if (currency === 'USD') return `${sign}$${formatted}`
  if (currency === 'EUR') return `${sign}€${formatted}`
  return `${sign}₺${formatted}`
}

export default function ThirtyDayCashStrip({ summary }: { summary: ThirtyDayCashSummary }) {
  const items = [
    { label: 'Mevcut nakit', value: money(summary.currentCash, summary.currency) },
    { label: 'Beklenen giriş', value: money(summary.expectedInflows, summary.currency) },
    { label: 'Planlanan çıkış', value: money(summary.knownOutflows, summary.currency) },
    {
      label: 'En düşük nokta',
      value: summary.lowestProjectedBalance === null
        ? 'Henüz hesaplanamıyor'
        : `${money(summary.lowestProjectedBalance, summary.currency)}${summary.lowestProjectedDate ? ` · ${summary.lowestProjectedDate}` : ''}`,
    },
  ]

  return (
    <section aria-labelledby="cash-strip-title">
      <Link
        to="/dashboard/30-gun"
        className="focus-ring block rounded-card border border-line bg-surface shadow-soft transition-colors hover:border-crimson/30"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <span id="cash-strip-title" className="label text-ink-mute">30 günlük nakit ve yükümlülük görünümü</span>
            {summary.state === 'no_data' && <p className="mt-1 text-xs text-ink-mute">Hesaplama için güncel bakiye ve tarihli kayıtlar gerekli.</p>}
          </div>
          <ArrowRight size={17} className="shrink-0 text-crimson" />
        </div>
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {items.map(item => (
            <div key={item.label} className="px-5 py-4">
              <div className="text-xs text-ink-mute">{item.label}</div>
              <div className="mt-1.5 font-mono text-base font-medium text-ink">{item.value}</div>
            </div>
          ))}
        </div>
        {summary.excluded.length > 0 && (
          <div className="border-t border-line px-5 py-2.5 text-xs text-warn">
            {summary.excluded.length} kayıt eksik bilgi veya para birimi nedeniyle hesaba dahil değil.
          </div>
        )}
      </Link>
    </section>
  )
}
