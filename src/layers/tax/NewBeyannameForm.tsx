import { useState } from 'react'
import Modal from '../../surfaces/dashboard/components/Modal'
import { computeDeadline } from './logic/taxLogic'
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

  const handleTypeChange = (t: BeyannameType) => {
    setType(t)
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
