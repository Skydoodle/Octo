import { useState } from 'react'
import { Card } from '../../shared/utils/ui'
import EmptyState from '../../shared/utils/EmptyState'
import {
  useOpStore, setSiparisDurum, deleteSiparis, acikAlisSiparisYukumlulukleri,
} from './opStore'
import {
  siparisToplam, siparisDurumuLabels, siparisGecisleri,
  type SiparisDurumu,
} from './types'
import NewSiparisForm from './NewSiparisForm'

const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

const durumRenk: Record<SiparisDurumu, string> = {
  taslak: 'bg-ink-mute/15 text-ink-mute',
  onaylandi: 'bg-warn/15 text-warn',
  kismi: 'bg-warn/15 text-warn',
  tamamlandi: 'bg-positive/15 text-positive',
  iptal: 'bg-crimson/15 text-crimson',
}

export function SiparisView() {
  const { siparisler } = useOpStore()
  const [showForm, setShowForm] = useState(false)
  const [tur, setTur] = useState<'hepsi' | 'satis' | 'alis'>('hepsi')

  const filtered = tur === 'hepsi' ? siparisler : siparisler.filter(s => s.tur === tur)
  const yukumluluker = acikAlisSiparisYukumlulukleri()
  const toplamAlisYuk = yukumluluker.reduce((s, y) => s + y.amount, 0)

  return (
    <div className="space-y-5">
      {/* Açık alış siparişi nakit yükümlülüğü — cross-arm → Finans */}
      {toplamAlisYuk > 0 && (
        <Card className="border-warn/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-ink">Açık Alış Siparişi Yükümlülüğü</span>
              <div className="mt-0.5 text-xs text-ink-mute">{yukumluluker.length} sipariş · gelecek nakit çıkışı (Finans projeksiyonuna işlenir)</div>
            </div>
            <span className="font-mono text-lg text-warn">{fmt(toplamAlisYuk)}</span>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['hepsi', 'satis', 'alis'] as const).map(t => (
            <button key={t} onClick={() => setTur(t)}
              className={'rounded px-3.5 py-1.5 text-xs ' + (tur === t ? 'bg-ink text-paper font-medium' : 'border border-line text-ink-mute hover:text-ink')}>
              {t === 'hepsi' ? 'Tümü' : t === 'satis' ? 'Satış' : 'Alış'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="rounded bg-crimson px-4 py-2 text-sm font-medium text-white hover:opacity-90">+ Yeni Sipariş</button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6"><EmptyState title="Sipariş yok" hint="Satış/alış siparişi oluşturunca durum takibi, sevkiyat ve fatura bağlanır." /></Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2">
                <tr>
                  <th className="px-5 py-3 text-left"><span className="label text-ink-mute">Sipariş</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Cari</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Tür</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Teslim</span></th>
                  <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Tutar</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Durum</span></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const t = siparisToplam(s)
                  const sonraki = siparisGecisleri[s.durum]
                  return (
                    <tr key={s.id} className={i > 0 ? 'border-t border-line' : ''}>
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs text-ink">{s.no}</div>
                        <div className="text-xs text-ink-mute">{s.satirlar.length} kalem · {s.tarih}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{s.cariUnvan}</td>
                      <td className="px-4 py-3">
                        <span className={'rounded px-2 py-0.5 text-xs ' + (s.tur === 'satis' ? 'bg-positive/10 text-positive' : 'bg-warn/10 text-warn')}>
                          {s.tur === 'satis' ? 'Satış' : 'Alış'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-mute">{s.teslimTarihi}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-ink">{fmt(t.genelToplam)}</td>
                      <td className="px-4 py-3">
                        <span className={'rounded px-2 py-0.5 text-xs ' + durumRenk[s.durum]}>{siparisDurumuLabels[s.durum]}</span>
                        {s.faturalandi && <span className="ml-1 rounded bg-positive/10 px-1.5 py-0.5 text-[10px] text-positive">faturalı</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {sonraki.filter(d => d !== 'iptal').map(d => (
                            <button key={d} onClick={() => setSiparisDurum(s.id, d)} className="rounded border border-line px-2 py-1 text-[11px] text-ink-soft hover:border-crimson hover:text-crimson">
                              → {siparisDurumuLabels[d]}
                            </button>
                          ))}
                          {(s.durum === 'taslak' || s.durum === 'iptal') && (
                            <button onClick={() => deleteSiparis(s.id)} className="text-xs text-ink-mute hover:text-crimson">sil</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && <NewSiparisForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
