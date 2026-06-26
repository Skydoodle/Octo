import { useState } from 'react'
import Modal from '../../surfaces/dashboard/components/Modal'
import { addUrun, addHareket } from './opStore'
import { urunTipiLabels, birimLabels, type Urun, type UrunTipi, type StokBirimi } from './types'

interface Props { onClose: () => void }

const inputCls = 'w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-mute'
const labelCls = 'label mb-1.5 block text-ink-mute'

export default function NewUrunForm({ onClose }: Props) {
  const [kod, setKod] = useState('')
  const [ad, setAd] = useState('')
  const [tip, setTip] = useState<UrunTipi>('ticari')
  const [birim, setBirim] = useState<StokBirimi>('adet')
  const [kdvOrani, setKdvOrani] = useState('20')
  const [alisFiyati, setAlisFiyati] = useState('')
  const [satisFiyati, setSatisFiyati] = useState('')
  const [kritikSeviye, setKritikSeviye] = useState('0')
  const [tedarikSuresiGun, setTedarikSuresiGun] = useState('7')
  const [baslangicStok, setBaslangicStok] = useState('')
  const [touched, setTouched] = useState(false)

  const valid = kod.trim() && ad.trim()

  const save = () => {
    setTouched(true)
    if (!valid) return
    const id = 'urun' + Date.now()
    const alis = parseFloat(alisFiyati) || 0
    const u: Urun = {
      id, kod: kod.trim(), ad: ad.trim(), tip, birim,
      kdvOrani: parseFloat(kdvOrani) || 0,
      alisFiyati: alis,
      satisFiyati: parseFloat(satisFiyati) || 0,
      kritikSeviye: parseFloat(kritikSeviye) || 0,
      tedarikSuresiGun: parseInt(tedarikSuresiGun) || 0,
      aktif: true,
      olusturulma: new Date().toISOString().slice(0, 10),
    }
    addUrun(u)
    // Başlangıç stoğu girildiyse bir giriş hareketi oluştur.
    const bas = parseFloat(baslangicStok) || 0
    if (bas > 0) {
      addHareket({
        id: 'sh' + Date.now(), urunId: id, tip: 'giris_sayim',
        miktar: bas, birimMaliyet: alis, tarih: new Date().toISOString().slice(0, 10),
        aciklama: 'Başlangıç stoğu',
      })
    }
    onClose()
  }

  return (
    <Modal title="Yeni Ürün / Stok Kartı" onClose={onClose} width="600px">
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Stok Kodu <span className="text-crimson">*</span></span>
          <input className={inputCls + (touched && !kod.trim() ? ' border-crimson' : '')} value={kod} onChange={e => setKod(e.target.value)} placeholder="TM-001" />
        </div>
        <div>
          <span className={labelCls}>Ürün Adı <span className="text-crimson">*</span></span>
          <input className={inputCls + (touched && !ad.trim() ? ' border-crimson' : '')} value={ad} onChange={e => setAd(e.target.value)} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <span className={labelCls}>Tip</span>
          <select className={inputCls} value={tip} onChange={e => setTip(e.target.value as UrunTipi)}>
            {Object.entries(urunTipiLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <span className={labelCls}>Birim</span>
          <select className={inputCls} value={birim} onChange={e => setBirim(e.target.value as StokBirimi)}>
            {Object.entries(birimLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <span className={labelCls}>KDV %</span>
          <select className={inputCls} value={kdvOrani} onChange={e => setKdvOrani(e.target.value)}>
            {['0', '1', '10', '20'].map(v => <option key={v} value={v}>%{v}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Alış Fiyatı (KDV hariç)</span>
          <input type="number" className={inputCls} value={alisFiyati} onChange={e => setAlisFiyati(e.target.value)} />
        </div>
        <div>
          <span className={labelCls}>Satış Fiyatı (KDV hariç)</span>
          <input type="number" className={inputCls} value={satisFiyati} onChange={e => setSatisFiyati(e.target.value)} />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <div>
          <span className={labelCls}>Kritik Seviye</span>
          <input type="number" className={inputCls} value={kritikSeviye} onChange={e => setKritikSeviye(e.target.value)} />
        </div>
        <div>
          <span className={labelCls}>Tedarik Süresi (gün)</span>
          <input type="number" className={inputCls} value={tedarikSuresiGun} onChange={e => setTedarikSuresiGun(e.target.value)} />
        </div>
        <div>
          <span className={labelCls}>Başlangıç Stoğu</span>
          <input type="number" className={inputCls} value={baslangicStok} onChange={e => setBaslangicStok(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="flex justify-end gap-2.5">
        <button onClick={onClose} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">İptal</button>
        <button onClick={save} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">Ürün Ekle</button>
      </div>
    </Modal>
  )
}
