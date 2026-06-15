import { useState } from 'react'
import Modal from '../../../surfaces/dashboard/components/Modal'
import { addCari } from './cariStore'
import { eksikAlanlar, type Cari, type CariTip } from './types'

interface Props {
  onClose: () => void
  onSaved?: (cari: Cari) => void
  initialVkn?: string
  initialUnvan?: string
}

const inputCls = 'w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-mute'
const labelCls = 'label mb-1.5 block text-ink-mute'

export default function NewCariForm({ onClose, onSaved, initialVkn = '', initialUnvan = '' }: Props) {
  const [unvan, setUnvan] = useState(initialUnvan)
  const [vkn, setVkn] = useState(initialVkn)
  const [tip, setTip] = useState<CariTip>('musteri')
  const [telefon, setTelefon] = useState('')
  const [adres, setAdres] = useState('')
  const [vergiDairesi, setVergiDairesi] = useState('')
  const [yetkili, setYetkili] = useState('')
  const [eposta, setEposta] = useState('')
  const [touched, setTouched] = useState(false)

  const draft: Partial<Cari> = { unvan, vkn, telefon, adres }
  const eksik = eksikAlanlar(draft)
  const gecerli = eksik.length === 0

  const save = () => {
    setTouched(true)
    if (!gecerli) return
    const cari: Cari = {
      id: 'cari' + Date.now(),
      unvan: unvan.trim(),
      vkn: vkn.trim(),
      tip,
      telefon: telefon.trim(),
      adres: adres.trim(),
      vergiDairesi: vergiDairesi.trim(),
      yetkili: yetkili.trim(),
      eposta: eposta.trim(),
      olusturulma: new Date().toISOString().slice(0, 10),
    }
    addCari(cari)
    onSaved?.(cari)
    onClose()
  }

  // Show a red border on a required field only after a save attempt.
  const reqBorder = (field: keyof Cari) =>
    touched && eksik.includes(field) ? ' border-crimson' : ''

  return (
    <Modal title="Yeni Cari" onClose={onClose} width="620px">
      <div className="mb-5">
        <span className={labelCls}>Cari Tipi</span>
        <div className="flex gap-2">
          {([['musteri', 'Müşteri'], ['tedarikci', 'Tedarikçi'], ['her_ikisi', 'Her İkisi']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTip(v)}
              className={'flex-1 rounded border px-3 py-2 text-sm transition-colors ' +
                (tip === v ? 'border-crimson bg-crimson/5 font-medium text-crimson' : 'border-line text-ink-mute hover:text-ink')}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Unvan / Ad <span className="text-crimson">*</span></span>
          <input className={inputCls + reqBorder('unvan')} value={unvan} onChange={e => setUnvan(e.target.value)} placeholder="Firma veya kişi adı" />
        </div>
        <div>
          <span className={labelCls}>VKN / TCKN <span className="text-crimson">*</span></span>
          <input className={inputCls + reqBorder('vkn')} value={vkn} onChange={e => setVkn(e.target.value)} placeholder="Vergi / TC kimlik no" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Telefon <span className="text-crimson">*</span></span>
          <input className={inputCls + reqBorder('telefon')} value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="0(5xx) xxx xx xx" />
        </div>
        <div>
          <span className={labelCls}>Yetkili Kişi</span>
          <input className={inputCls} value={yetkili} onChange={e => setYetkili(e.target.value)} placeholder="İlgili kişi" />
        </div>
      </div>

      <div className="mb-4">
        <span className={labelCls}>Adres <span className="text-crimson">*</span></span>
        <input className={inputCls + reqBorder('adres')} value={adres} onChange={e => setAdres(e.target.value)} placeholder="Açık adres" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Vergi Dairesi</span>
          <input className={inputCls} value={vergiDairesi} onChange={e => setVergiDairesi(e.target.value)} placeholder="Vergi dairesi" />
        </div>
        <div>
          <span className={labelCls}>E-posta</span>
          <input className={inputCls} value={eposta} onChange={e => setEposta(e.target.value)} placeholder="ornek@firma.com" />
        </div>
      </div>

      {touched && !gecerli && (
        <div className="mb-4 rounded border border-crimson/30 bg-crimson/5 px-4 py-2.5 text-sm text-crimson">
          Zorunlu alanlar eksik: telefon ve adres dahil işaretli alanları doldurun. Borç takibinde firmaya ulaşabilmek için bu bilgiler gerekli.
        </div>
      )}

      <div className="flex justify-end gap-2.5">
        <button onClick={onClose} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">
          İptal
        </button>
        <button onClick={save} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
          Cari Oluştur
        </button>
      </div>
    </Modal>
  )
}
