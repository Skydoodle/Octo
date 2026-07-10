import { useState } from 'react'
import Modal from '../../surfaces/dashboard/components/Modal'
import { useOpStore, addSiparis } from './opStore'
import {
  siparisToplam,
  type Siparis,
  type SiparisOdemeDurumu,
  type SiparisParaBirimi,
  type SiparisTuru,
  type SiparisSatiri,
} from './types'
import { dateOnlyFromLocalDate } from '../../shared/dateOnly'
import { useCompanyObligationSettings } from '../../settings/companyObligationSettings'

interface Props { onClose: () => void }

const inputCls = 'w-full rounded border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink-mute'
const labelCls = 'label mb-1.5 block text-ink-mute'

export default function NewSiparisForm({ onClose }: Props) {
  const { urunler } = useOpStore()
  const settings = useCompanyObligationSettings()
  const [tur, setTur] = useState<SiparisTuru>('satis')
  const [cariUnvan, setCariUnvan] = useState('')
  const [tarih, setTarih] = useState(dateOnlyFromLocalDate(new Date()))
  const [teslimTarihi, setTeslimTarihi] = useState(dateOnlyFromLocalDate(new Date()))
  const [odemeTarihi, setOdemeTarihi] = useState('')
  const [paraBirimi, setParaBirimi] = useState<SiparisParaBirimi>(settings.baseCurrency)
  const [odemeDurumu, setOdemeDurumu] = useState<SiparisOdemeDurumu>('bekliyor')
  const [satirlar, setSatirlar] = useState<SiparisSatiri[]>([])
  const [touched, setTouched] = useState(false)

  const aktifUrunler = urunler.filter(u => u.aktif)

  const addSatir = () => {
    const ilk = aktifUrunler[0]
    if (!ilk) return
    setSatirlar([...satirlar, {
      urunId: ilk.id, miktar: 1,
      birimFiyat: tur === 'satis' ? ilk.satisFiyati : ilk.alisFiyati,
      kdvOrani: ilk.kdvOrani, sevkEdilen: 0,
    }])
  }
  const updSatir = (i: number, patch: Partial<SiparisSatiri>) => {
    setSatirlar(satirlar.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }
  const delSatir = (i: number) => setSatirlar(satirlar.filter((_, idx) => idx !== i))

  const onUrunChange = (i: number, urunId: string) => {
    const u = aktifUrunler.find(x => x.id === urunId)
    if (u) updSatir(i, { urunId, birimFiyat: tur === 'satis' ? u.satisFiyati : u.alisFiyati, kdvOrani: u.kdvOrani })
  }

  const valid = cariUnvan.trim() && satirlar.length > 0

  const fakeSiparis: Siparis = {
    id: '_', no: '_', tur, cariId: '', cariUnvan, tarih, teslimTarihi,
    odemeTarihi: tur === 'alis' && odemeTarihi ? odemeTarihi : undefined,
    paraBirimi,
    odemeDurumu: tur === 'alis' ? odemeDurumu : 'bekliyor',
    durum: 'taslak', satirlar, faturalandi: false,
  }
  const toplam = siparisToplam(fakeSiparis)

  const save = () => {
    setTouched(true)
    if (!valid) return
    const yil = new Date().getFullYear()
    const s: Siparis = {
      id: 'sip' + Date.now(),
      no: `SIP-${yil}-${String(Date.now()).slice(-4)}`,
      tur, cariId: 'cari-' + Date.now(), cariUnvan: cariUnvan.trim(),
      tarih, teslimTarihi,
      odemeTarihi: tur === 'alis' && odemeTarihi ? odemeTarihi : undefined,
      paraBirimi,
      odemeDurumu: tur === 'alis' ? odemeDurumu : 'bekliyor',
      durum: 'taslak', satirlar, faturalandi: false,
    }
    addSiparis(s)
    onClose()
  }

  const fmt = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ${paraBirimi === 'TRY' ? 'TL' : paraBirimi}`

  return (
    <Modal title="Yeni Sipariş" onClose={onClose} width="720px">
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Sipariş Türü</span>
          <div className="flex gap-2">
            {([['satis', 'Satış'], ['alis', 'Alış']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setTur(v)}
                className={'flex-1 rounded border px-3 py-2 text-sm ' + (tur === v ? 'border-crimson bg-crimson/5 text-crimson font-medium' : 'border-line text-ink-mute')}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={labelCls}>{tur === 'satis' ? 'Müşteri' : 'Tedarikçi'} <span className="text-crimson">*</span></span>
          <input className={inputCls + (touched && !cariUnvan.trim() ? ' border-crimson' : '')} value={cariUnvan} onChange={e => setCariUnvan(e.target.value)} placeholder="Ünvan" />
        </div>
      </div>

      {tur === 'alis' && (
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <span className={labelCls}>Ödeme Tarihi</span>
            <input type="date" className={inputCls} value={odemeTarihi} onChange={e => setOdemeTarihi(e.target.value)} />
            <span className="mt-1 block text-[10px] text-ink-mute">Boşsa nakit projeksiyonuna tarihli çıkış eklenmez.</span>
          </div>
          <div>
            <span className={labelCls}>Para Birimi</span>
            <select className={inputCls} value={paraBirimi} onChange={e => setParaBirimi(e.target.value as SiparisParaBirimi)}>
              <option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <span className={labelCls}>Ödeme Durumu</span>
            <select className={inputCls} value={odemeDurumu} onChange={e => setOdemeDurumu(e.target.value as SiparisOdemeDurumu)}>
              <option value="bekliyor">Bekliyor</option><option value="odendi">Ödendi</option>
            </select>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Sipariş Tarihi</span>
          <input type="date" className={inputCls} value={tarih} onChange={e => setTarih(e.target.value)} />
        </div>
        <div>
          <span className={labelCls}>Teslim Tarihi</span>
          <input type="date" className={inputCls} value={teslimTarihi} onChange={e => setTeslimTarihi(e.target.value)} />
        </div>
      </div>

      {/* Satırlar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className={labelCls + ' mb-0'}>Kalemler</span>
          <button type="button" onClick={addSatir} disabled={aktifUrunler.length === 0} className="rounded border border-line px-3 py-1 text-xs text-ink-soft hover:border-crimson hover:text-crimson disabled:opacity-40">+ Kalem Ekle</button>
        </div>
        {aktifUrunler.length === 0 ? (
          <p className="rounded border border-line bg-surface-2 px-4 py-3 text-xs text-ink-mute">Önce ürün eklemelisin (Stok sekmesi).</p>
        ) : satirlar.length === 0 ? (
          <p className="rounded border border-dashed border-line px-4 py-3 text-xs text-ink-mute">Henüz kalem yok. "Kalem Ekle" ile başla.</p>
        ) : (
          <div className="space-y-2">
            {satirlar.map((s, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-2">
                <select className={inputCls} value={s.urunId} onChange={e => onUrunChange(i, e.target.value)}>
                  {aktifUrunler.map(u => <option key={u.id} value={u.id}>{u.ad} ({u.kod})</option>)}
                </select>
                <input type="number" className={inputCls} value={s.miktar} onChange={e => updSatir(i, { miktar: parseFloat(e.target.value) || 0 })} placeholder="Miktar" />
                <input type="number" className={inputCls} value={s.birimFiyat} onChange={e => updSatir(i, { birimFiyat: parseFloat(e.target.value) || 0 })} placeholder="Birim Fiyat" />
                <button onClick={() => delSatir(i)} className="px-2 text-ink-mute hover:text-crimson">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {satirlar.length > 0 && (
        <div className="mb-5 flex justify-end gap-6 rounded border border-line bg-surface-2 px-4 py-2.5 text-sm">
          <span className="text-ink-mute">Net: <span className="font-mono text-ink">{fmt(toplam.netToplam)}</span></span>
          <span className="text-ink-mute">KDV: <span className="font-mono text-ink">{fmt(toplam.kdvToplam)}</span></span>
          <span className="text-ink-mute">Toplam: <span className="font-mono text-crimson">{fmt(toplam.genelToplam)}</span></span>
        </div>
      )}

      <div className="flex justify-end gap-2.5">
        <button onClick={onClose} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">İptal</button>
        <button onClick={save} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">Sipariş Oluştur</button>
      </div>
    </Modal>
  )
}
