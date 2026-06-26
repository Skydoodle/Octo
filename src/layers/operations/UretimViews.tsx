import { Card, Label } from '../../shared/utils/ui'
import EmptyState from '../../shared/utils/EmptyState'
import {
  useOpStore, stokMiktari, uretimEksikMalzemeler, setUretimDurum,
} from './opStore'
import { uretimDurumuLabels, type UretimDurumu } from './types'

const durumRenk: Record<UretimDurumu, string> = {
  planlandi: 'bg-warn/15 text-warn',
  devam: 'bg-warn/15 text-warn',
  tamamlandi: 'bg-positive/15 text-positive',
  iptal: 'bg-crimson/15 text-crimson',
}

export function UretimView() {
  const { uretimler, receteler, urunler } = useOpStore()
  const eksikler = uretimEksikMalzemeler()
  const urunAd = (id: string) => urunler.find(u => u.id === id)?.ad ?? id

  return (
    <div className="space-y-5">
      {/* Üretim hammadde eksiği — cross-arm sinyali */}
      {eksikler.length > 0 && (
        <Card className="border-crimson/30 p-0">
          <div className="border-b border-line bg-crimson/5 px-5 py-3">
            <span className="text-sm font-medium text-crimson">⚠ Üretim için Yetersiz Hammadde</span>
            <span className="ml-2 text-xs text-ink-mute">aktif üretim emirleri stoğu aşıyor — alış siparişi gerekebilir</span>
          </div>
          <div className="divide-y divide-line">
            {eksikler.map((e, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="text-ink"><span className="font-mono text-xs text-ink-mute">{e.uretimNo}</span> · {e.urunAd}</span>
                <span className="text-xs text-ink-mute">gereken <span className="font-mono text-ink">{e.gereken}</span> · mevcut <span className="font-mono text-ink">{e.mevcut}</span> · eksik <span className="font-mono text-crimson">{e.eksik}</span></span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Üretim emirleri */}
      <div>
        <Label>Üretim Emirleri</Label>
        {uretimler.length === 0 ? (
          <Card className="mt-3 p-6"><EmptyState title="Üretim emri yok" hint="Reçete tanımlayıp üretim emri açınca hammadde ihtiyacı ve stok düşüşü otomatik hesaplanır." /></Card>
        ) : (
          <Card className="mt-3 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2">
                  <tr>
                    <th className="px-5 py-3 text-left"><span className="label text-ink-mute">Emir</span></th>
                    <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Mamul</span></th>
                    <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Miktar</span></th>
                    <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Hedef</span></th>
                    <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Durum</span></th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {uretimler.map((u, i) => (
                    <tr key={u.id} className={i > 0 ? 'border-t border-line' : ''}>
                      <td className="px-5 py-3 font-mono text-xs text-ink">{u.no}</td>
                      <td className="px-4 py-3 text-ink-soft">{urunAd(u.mamulId)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-ink">{u.miktar}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-mute">{u.hedefTarih}</td>
                      <td className="px-4 py-3"><span className={'rounded px-2 py-0.5 text-xs ' + durumRenk[u.durum]}>{uretimDurumuLabels[u.durum]}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {u.durum === 'planlandi' && <button onClick={() => setUretimDurum(u.id, 'devam')} className="rounded border border-line px-2 py-1 text-[11px] text-ink-soft hover:border-crimson hover:text-crimson">→ Başlat</button>}
                          {u.durum === 'devam' && <button onClick={() => setUretimDurum(u.id, 'tamamlandi')} className="rounded border border-line px-2 py-1 text-[11px] text-positive hover:underline">→ Tamamla</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Reçeteler (BOM) */}
      <div>
        <Label>Reçeteler (BOM)</Label>
        {receteler.length === 0 ? (
          <Card className="mt-3 p-6"><EmptyState compact title="Reçete yok" hint="Bir mamulün hangi hammaddelerden üretildiğini tanımla." /></Card>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {receteler.map(r => (
              <Card key={r.id} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{urunAd(r.mamulId)}</span>
                  <span className="text-xs text-ink-mute">{r.iscilikSaati} sa işçilik</span>
                </div>
                <div className="space-y-1">
                  {r.bilesenler.map((b, i) => {
                    const mevcut = stokMiktari(b.urunId)
                    const yetersiz = mevcut < b.miktar
                    return (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-ink-soft">{urunAd(b.urunId)}</span>
                        <span className={'font-mono ' + (yetersiz ? 'text-crimson' : 'text-ink-mute')}>{b.miktar} / birim</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
