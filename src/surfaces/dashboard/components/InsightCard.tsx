import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '../../../shared/utils/ui'
import type { Insight } from '../../../shared/insights/types'
import { confidenceLabels } from '../../../shared/insights/types'

const dotColor: Record<string, string> = {
  kritik: 'bg-crimson',
  dikkat: 'bg-warn',
  stabil: 'bg-positive',
}

function Field({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label text-ink-mute">{k}</span>
      <div className="mt-1 text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  )
}

export default function InsightCard({ insight }: { insight: Insight }) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex items-start gap-3">
          <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + dotColor[insight.severity]} />
          <div>
            <div className="text-sm font-medium text-ink">{insight.baslik}</div>
            <div className="mt-0.5 text-sm text-ink-soft">{insight.ozet}</div>
          </div>
        </div>
        <span className="mt-1 shrink-0 text-ink-mute">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-5 py-4">
          <Field k="Kaynak Kayıtlar">
            <ul className="space-y-1">
              {insight.kaynaklar.map(s => (
                <li key={s.recordId + s.label} className="flex justify-between gap-3">
                  <span>
                    <span className="font-mono text-xs uppercase text-ink-mute">[{s.layer}]</span> {s.label}
                  </span>
                  {s.value && <span className="font-mono text-xs text-ink">{s.value}</span>}
                </li>
              ))}
            </ul>
          </Field>

          <Field k="Hesaplama">
            <span className="font-mono text-xs leading-relaxed">{insight.hesaplama}</span>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field k="Veri Güncelliği">{insight.veriGuncelligi}</Field>
            <Field k="Güven">{confidenceLabels[insight.guven]}</Field>
          </div>

          {insight.eksikVeri.length > 0 && (
            <Field k="Eksik Bilgi">
              <ul className="list-inside list-disc space-y-1">
                {insight.eksikVeri.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </Field>
          )}

          <Field k="Uygulanan Kural">{insight.kural}</Field>

          <div className="rounded-card border border-line bg-surface-2 px-4 py-3">
            <Field k="Önerilen Aksiyon">{insight.oneri}</Field>
            <div className="mt-2 text-xs text-ink-mute">Sorumlu: {insight.sorumlu}</div>
          </div>
        </div>
      )}
    </Card>
  )
}
