import { useState } from 'react'
import Modal from '../../surfaces/dashboard/components/Modal'
import { addIzin, useIKStore } from './hrStore'
import { izinTuruLabels, type IzinTalebi, type IzinTuru } from './attendanceTypes'

interface Props {
  onClose: () => void
}

const inputCls = 'w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-mute'
const labelCls = 'label mb-1.5 block text-ink-mute'

function gunFarki(a: string, b: string): number {
  if (!a || !b) return 0
  const d = (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  return d >= 0 ? Math.round(d) + 1 : 0
}

export default function NewIzinForm({ onClose }: Props) {
  const { personeller } = useIKStore()
  const [personelId, setPersonelId] = useState('')
  const [tur, setTur] = useState<IzinTuru>('yillik')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [touched, setTouched] = useState(false)

  const gunSayisi = gunFarki(baslangic, bitis)
  const valid = personelId && baslangic && bitis && gunSayisi > 0

  const save = () => {
    setTouched(true)
    if (!valid) return
    const izin: IzinTalebi = {
      id: 'izin' + Date.now(),
      personelId, tur, baslangic, bitis, gunSayisi,
      durum: 'beklemede',
      aciklama: aciklama.trim(),
      olusturulma: new Date().toISOString().slice(0, 10),
    }
    addIzin(izin)
    onClose()
  }

  return (
    <Modal title="Yeni İzin Talebi" onClose={onClose} width="560px">
      <div className="mb-4">
        <span className={labelCls}>Personel <span className="text-crimson">*</span></span>
        <select className={inputCls + (touched && !personelId ? ' border-crimson' : '')} value={personelId} onChange={e => setPersonelId(e.target.value)}>
          <option value="">Seç…</option>
          {personeller.filter(p => p.aktif).map(p => <option key={p.id} value={p.id}>{p.ad} {p.soyad}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <span className={labelCls}>İzin Türü</span>
        <select className={inputCls} value={tur} onChange={e => setTur(e.target.value as IzinTuru)}>
          {Object.entries(izinTuruLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Başlangıç <span className="text-crimson">*</span></span>
          <input type="date" className={inputCls + (touched && !baslangic ? ' border-crimson' : '')} value={baslangic} onChange={e => setBaslangic(e.target.value)} />
        </div>
        <div>
          <span className={labelCls}>Bitiş <span className="text-crimson">*</span></span>
          <input type="date" className={inputCls + (touched && !bitis ? ' border-crimson' : '')} value={bitis} onChange={e => setBitis(e.target.value)} />
        </div>
      </div>

      {gunSayisi > 0 && (
        <div className="mb-4 rounded border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink">
          Toplam <span className="font-medium">{gunSayisi} gün</span> izin
        </div>
      )}

      <div className="mb-6">
        <span className={labelCls}>Açıklama</span>
        <input className={inputCls} value={aciklama} onChange={e => setAciklama(e.target.value)} placeholder="İsteğe bağlı" />
      </div>

      <div className="flex justify-end gap-2.5">
        <button onClick={onClose} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">İptal</button>
        <button onClick={save} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">Talep Oluştur</button>
      </div>
    </Modal>
  )
}
