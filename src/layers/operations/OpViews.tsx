import { Card, Label } from '../../shared/utils/ui'
import EmptyState from '../../shared/utils/EmptyState'
import { useOpStore } from './opStore'
import {
  sevkiyatDurumuLabels, eIrsaliyeDurumuLabels,
  type SevkiyatDurumu, type EIrsaliyeDurumu,
} from './types'

const sevkRenk: Record<SevkiyatDurumu, string> = {
  hazirlaniyor: 'bg-warn/15 text-warn',
  yolda: 'bg-warn/15 text-warn',
  teslim: 'bg-positive/15 text-positive',
  iptal: 'bg-crimson/15 text-crimson',
}

const eIrsRenk: Record<EIrsaliyeDurumu, string> = {
  yok: 'bg-ink-mute/15 text-ink-mute',
  taslak: 'bg-ink-mute/15 text-ink-mute',
  gonderildi: 'bg-warn/15 text-warn',
  kabul: 'bg-positive/15 text-positive',
  red: 'bg-crimson/15 text-crimson',
}

// ── Sevkiyat ────────────────────────────────────────────────────────────────
export function SevkiyatView() {
  const { sevkiyatlar } = useOpStore()

  return (
    <div className="space-y-4">
      <Label>Sevkiyatlar</Label>
      {sevkiyatlar.length === 0 ? (
        <Card className="p-6"><EmptyState title="Sevkiyat yok" hint="Satış siparişinden sevkiyat oluşturunca e-İrsaliye durumu ve teslim takibi burada görünür." /></Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2">
                <tr>
                  <th className="px-5 py-3 text-left"><span className="label text-ink-mute">İrsaliye</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Cari</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Tarih</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Taşıyıcı</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Durum</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">e-İrsaliye</span></th>
                </tr>
              </thead>
              <tbody>
                {sevkiyatlar.map((s, i) => (
                  <tr key={s.id} className={i > 0 ? 'border-t border-line' : ''}>
                    <td className="px-5 py-3 font-mono text-xs text-ink">{s.no}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.cariUnvan}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-mute">{s.tarih}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.tasiyici ?? '—'}</td>
                    <td className="px-4 py-3"><span className={'rounded px-2 py-0.5 text-xs ' + sevkRenk[s.durum]}>{sevkiyatDurumuLabels[s.durum]}</span></td>
                    <td className="px-4 py-3"><span className={'rounded px-2 py-0.5 text-xs ' + eIrsRenk[s.eIrsaliye]}>{eIrsaliyeDurumuLabels[s.eIrsaliye]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="text-xs text-ink-mute">e-İrsaliye GİB entegrasyonu backend ile gelecek; şu an durum takibi yapılır (şema + state machine hazır).</p>
    </div>
  )
}

// ── Tedarikçi ─────────────────────────────────────────────────────────────────
export function TedarikciView() {
  const { tedarikciler, urunler } = useOpStore()
  const urunAd = (id: string) => urunler.find(u => u.id === id)?.ad ?? id

  return (
    <div className="space-y-4">
      <Label>Tedarikçiler</Label>
      {tedarikciler.length === 0 ? (
        <Card className="p-6"><EmptyState title="Tedarikçi yok" hint="Tedarikçi ekleyince sağladıkları ürünler ve tedarik süreleri stok/üretim planlamasına bağlanır." /></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {tedarikciler.map(t => (
            <Card key={t.id} className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{t.unvan}</span>
                <span className="font-mono text-xs text-ink-mute">{t.ortTedarikSuresiGun}g tedarik</span>
              </div>
              <div className="text-xs text-ink-mute">VKN {t.vkn} · {t.telefon}</div>
              {t.adres && <div className="mt-0.5 text-xs text-ink-mute">{t.adres}</div>}
              {t.saglananUrunler.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.saglananUrunler.map(uid => (
                    <span key={uid} className="rounded bg-surface-2 px-2 py-0.5 text-[11px] text-ink-soft">{urunAd(uid)}</span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
