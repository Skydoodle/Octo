import { useState } from 'react'
import { Card, Label } from '../../../shared/utils/ui'
import EmptyState from '../../../shared/utils/EmptyState'
import { useCariStore, cariBakiye, deleteCari } from '../cari/cariStore'
import NewCariForm from '../cari/NewCariForm'
import { eksikAlanlar, cariAlanLabels, type Cari } from '../cari/types'

const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

export default function Cariler() {
  const { cariler } = useCariStore()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const selectedCari = cariler.find(c => c.id === selected) ?? null

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <Label>Cariler ({cariler.length})</Label>
        <button onClick={() => setShowForm(true)} className="rounded bg-crimson px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          + Yeni Cari
        </button>
      </div>

      {cariler.length === 0 ? (
        <Card className="p-6">
          <EmptyState title="Cari yok" hint="Yeni cari ekleyince müşteri ve tedarikçiler burada listelenir." />
        </Card>
      ) : (
        <div className="grid grid-cols-[1.4fr_1fr] gap-4">
          {/* List */}
          <Card className="p-0">
            <div className="max-h-[560px] overflow-y-auto">
              {cariler.map((c, i) => {
                const b = cariBakiye(c)
                const eksik = eksikAlanlar(c)
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={'cursor-pointer px-5 py-3.5 ' + (i > 0 ? 'border-t border-line ' : '') + (selected === c.id ? 'bg-surface-2' : 'hover:bg-surface-2/50')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{c.unvan}</span>
                        {c.perakende && <span className="rounded bg-ink-mute/15 px-1.5 py-0.5 text-[10px] text-ink-mute">perakende</span>}
                        {eksik.length > 0 && <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn" title={'Eksik: ' + eksik.join(', ')}>eksik bilgi</span>}
                      </div>
                      <span className={'font-mono text-sm ' + (b.net > 0 ? 'text-positive' : b.net < 0 ? 'text-crimson' : 'text-ink-mute')}>
                        {b.net !== 0 ? fmt(Math.abs(b.net)) : '—'}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="font-mono text-xs text-ink-mute">{c.vkn}</span>
                      {b.acikFaturaSayisi > 0 && <span className="text-xs text-ink-mute">{b.acikFaturaSayisi} açık fatura</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Detail card */}
          {selectedCari ? (
            <CariDetail cari={selectedCari} onDeleted={() => setSelected(null)} />
          ) : (
            <Card className="p-6">
              <EmptyState compact title="Cari seç" hint="Detayları görmek için soldan bir cari seç." />
            </Card>
          )}
        </div>
      )}

      {showForm && <NewCariForm onClose={() => setShowForm(false)} onSaved={c => setSelected(c.id)} />}
    </div>
  )
}

function CariDetail({ cari, onDeleted }: { cari: Cari; onDeleted: () => void }) {
  const b = cariBakiye(cari)
  const eksik = eksikAlanlar(cari)
  const row = (label: string, value: string, missing = false) => (
    <div className="flex justify-between border-b border-line py-2.5">
      <span className="text-xs text-ink-mute">{label}</span>
      <span className={'text-sm ' + (missing ? 'text-warn' : 'text-ink')}>{value || (missing ? 'eksik' : '—')}</span>
    </div>
  )

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-base font-medium text-ink">{cari.unvan}</div>
          <div className="font-mono text-xs text-ink-mute">{cari.vkn}</div>
        </div>
        {!cari.perakende && (
          <button onClick={() => { deleteCari(cari.id); onDeleted() }} className="text-xs text-ink-mute hover:text-crimson">sil</button>
        )}
      </div>

      {/* Balance */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded border border-line p-3">
          <div className="label text-ink-mute">Alacak</div>
          <div className="mt-1 font-mono text-sm text-positive">{fmt(b.alacak)}</div>
        </div>
        <div className="rounded border border-line p-3">
          <div className="label text-ink-mute">Borç</div>
          <div className="mt-1 font-mono text-sm text-crimson">{fmt(b.borc)}</div>
        </div>
      </div>

      {eksik.length > 0 && (
        <div className="mb-4 rounded border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
          Eksik bilgi: {eksik.map(f => cariAlanLabels[f] ?? f).join(', ')}. Borç takibinde ulaşabilmek için tamamlanmalı.
        </div>
      )}

      {/* Contact details — the card you open to call the company */}
      {!cari.perakende && (
        <div>
          {row('Telefon', cari.telefon, !cari.telefon)}
          {row('Adres', cari.adres, !cari.adres)}
          {row('Yetkili', cari.yetkili)}
          {row('Vergi Dairesi', cari.vergiDairesi)}
          {row('E-posta', cari.eposta)}
        </div>
      )}
    </Card>
  )
}
