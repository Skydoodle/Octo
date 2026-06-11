import { useState } from 'react'
import Modal from '../../surfaces/dashboard/components/Modal'
import { computeDeadline } from './logic/taxLogic'
import { deriveKdv, type KdvResult } from './logic/kdvEngine'
import {
  beyannameLabels,
  type Beyanname,
  type BeyannameType,
  type Period,
} from './types'

interface Props {
  onClose: () => void
  onSave: (b: Beyanname) => void
}

const inputCls = 'w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-mute'

const periodOf: Record<BeyannameType, Period> = {
  kdv: 'aylik',
  muhtasar: 'aylik',
  sgk: 'aylik',
  damga: 'aylik',
  stopaj: 'aylik',
  gecici: 'ucaylik',
  kurumlar: 'yillik',
}

function currentDonem(period: Period): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  if (period === 'yillik') return String(y - 1)
  if (period === 'ucaylik') return `${y}-Q${Math.ceil(m / 3)}`
  // aylik: previous month (beyan donemi)
  const pm = m === 1 ? 12 : m - 1
  const py = m === 1 ? y - 1 : y
  return `${py}-${String(pm).padStart(2, '0')}`
}

export default function NewBeyannameForm({ onClose, onSave }: Props) {
  const [type, setType] = useState<BeyannameType>('kdv')
  const [donem, setDonem] = useState(currentDonem('aylik'))
  const [matrah, setMatrah] = useState(0)
  const [vergi, setVergi] = useState(0)
  const [sonTarih, setSonTarih] = useState(computeDeadline('kdv', currentDonem('aylik')))
  const [aciklama, setAciklama] = useState('')
  const [kdv, setKdv] = useState<KdvResult | null>(null)

  const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

  const hesaplaKdv = () => {
    const r = deriveKdv(donem)
    setKdv(r)
    setMatrah(r.satisMatrah)
    setVergi(r.toplamOdenecek ?? r.odenecekKDV)
    setSonTarih(computeDeadline('kdv', donem))
  }

  const handleTypeChange = (t: BeyannameType) => {
    setType(t)
    setKdv(null)
    const d = currentDonem(periodOf[t])
    setDonem(d)
    setSonTarih(computeDeadline(t, d))
  }

  const handleDonemChange = (d: string) => {
    setDonem(d)
    setSonTarih(computeDeadline(type, d))
  }

  const handleSave = () => {
    if (!donem || !sonTarih || vergi <= 0) return
    onSave({
      id: `${type}-${donem}-${Date.now()}`,
      type,
      donem,
      period: periodOf[type],
      status: 'taslak',
      matrah,
      hesaplananVergi: vergi,
      sonTarih,
      aciklama: aciklama || `${donem} ${beyannameLabels[type]}`,
    })
    onClose()
  }

  return (
    <Modal title="Yeni Beyanname" onClose={onClose} width="560px">
      {/* Type */}
      <div className="mb-5">
        <span className="label mb-1.5 block text-ink-mute">Beyanname Türü</span>
        <select
          className={inputCls + ' cursor-pointer'}
          value={type}
          onChange={e => handleTypeChange(e.target.value as BeyannameType)}
        >
          {(Object.keys(beyannameLabels) as BeyannameType[]).map(t => (
            <option key={t} value={t}>{beyannameLabels[t]}</option>
          ))}
        </select>
      </div>

      {/* Donem + deadline */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <span className="label mb-1.5 block text-ink-mute">Dönem</span>
          <input
            className={inputCls}
            value={donem}
            onChange={e => handleDonemChange(e.target.value)}
            placeholder="2026-05 / 2026-Q1 / 2025"
          />
        </div>
        <div>
          <span className="label mb-1.5 block text-ink-mute">Son Tarih</span>
          <input
            type="date"
            className={inputCls}
            value={sonTarih}
            onChange={e => setSonTarih(e.target.value)}
          />
        </div>
      </div>

      {/* KDV otomatik hesaplama */}
      {type === 'kdv' && (
        <div className="mb-5 rounded-card border border-line bg-surface-2 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="label text-ink-mute">Faturalardan KDV Hesapla</span>
              <p className="mt-1 text-xs text-ink-mute">{donem} dönemindeki satış ve alış faturalarından otomatik hesaplar.</p>
            </div>
            <button
              onClick={hesaplaKdv}
              className="rounded bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Hesapla
            </button>
          </div>

          {kdv && (
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Hesaplanan KDV (satış · {kdv.satisKaynaklar.length} fatura)</span>
                <span className="font-mono text-ink">{fmt(kdv.hesaplananKDV)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">İndirilecek KDV (alış · {kdv.alisKaynaklar.length} fatura)</span>
                <span className="font-mono text-ink">- {fmt(kdv.indirilecekKDV)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-sm">
                <span className="font-medium text-ink">{kdv.odenecekKDV > 0 ? 'Ödenecek KDV (1 No\u2019lu)' : 'Sonraki Döneme Devreden'}</span>
                <span className={'font-mono font-medium ' + (kdv.odenecekKDV > 0 ? 'text-crimson' : 'text-positive')}>
                  {fmt(kdv.odenecekKDV > 0 ? kdv.odenecekKDV : kdv.devredenSonraki)}
                </span>
              </div>
              {kdv.sorumluKDV > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">Sorumlu Sıfatıyla KDV (2 No\u2019lu)</span>
                  <span className="font-mono text-crimson">{fmt(kdv.sorumluKDV)}</span>
                </div>
              )}
              {kdv.istisnaMatrah > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">İstisna Matrah (KDV\u2019siz)</span>
                  <span className="font-mono text-ink">{fmt(kdv.istisnaMatrah)}</span>
                </div>
              )}
              {kdv.satisKaynaklar.length === 0 && kdv.alisKaynaklar.length === 0 && (
                <p className="text-xs text-warn">Bu dönemde fatura bulunamadı. Dönemi kontrol et veya manuel gir.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Amounts */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <span className="label mb-1.5 block text-ink-mute">Matrah (₺)</span>
          <input
            type="number"
            className={inputCls + ' text-right'}
            value={matrah || ''}
            onChange={e => setMatrah(parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
        <div>
          <span className="label mb-1.5 block text-ink-mute">Hesaplanan Vergi (₺)</span>
          <input
            type="number"
            className={inputCls + ' text-right'}
            value={vergi || ''}
            onChange={e => setVergi(parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <span className="label mb-1.5 block text-ink-mute">Açıklama</span>
        <input
          className={inputCls}
          value={aciklama}
          onChange={e => setAciklama(e.target.value)}
          placeholder="Opsiyonel açıklama"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2.5">
        <button
          onClick={onClose}
          className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink"
        >
          İptal
        </button>
        <button
          onClick={handleSave}
          className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Beyanname Ekle
        </button>
      </div>
    </Modal>
  )
}
