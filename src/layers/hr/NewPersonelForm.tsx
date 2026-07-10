import { useState } from 'react'
import Modal from '../../surfaces/dashboard/components/Modal'
import { addPersonel } from './hrStore'
import { brutToNet, netToBrut } from './bordroEngine'
import { departmanlar, personelEksikAlanlar, type Personel, type SgkDurumu } from './types'

interface Props {
  onClose: () => void
}

const inputCls = 'w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-mute'
const labelCls = 'label mb-1.5 block text-ink-mute'

export default function NewPersonelForm({ onClose }: Props) {
  const [personelId] = useState(() => 'per' + Date.now())
  const [ad, setAd] = useState('')
  const [soyad, setSoyad] = useState('')
  const [tcKimlik, setTcKimlik] = useState('')
  const [brutMaas, setBrutMaas] = useState('')
  const [departman, setDepartman] = useState(departmanlar[0])
  const [pozisyon, setPozisyon] = useState('')
  const [iseGirisTarihi, setIseGirisTarihi] = useState(new Date().toISOString().slice(0, 10))
  const [sgkIndirimli, setSgkIndirimli] = useState(true)
  const [ucretTipi, setUcretTipi] = useState<'brut' | 'net'>('brut')
  const [telefon, setTelefon] = useState('')
  const [eposta, setEposta] = useState('')
  const [adres, setAdres] = useState('')
  const [iban, setIban] = useState('')
  const [dogumTarihi, setDogumTarihi] = useState('')
  const [acilKisi, setAcilKisi] = useState('')
  const [acilTelefon, setAcilTelefon] = useState('')
  const [touched, setTouched] = useState(false)

  const girilen = parseFloat(brutMaas) || 0
  // If the user entered a NET figure, solve for the gross that produces it.
  const cozum = girilen > 0 && ucretTipi === 'net' ? netToBrut(girilen, sgkIndirimli) : null
  const brut = ucretTipi === 'net' ? (cozum?.brut ?? 0) : girilen
  const preview = brut > 0 ? brutToNet(brut, sgkIndirimli) : null
  // Required: ad, TC, brüt/net girilen > 0.
  const valid = ad.trim() && tcKimlik.trim() && girilen > 0
  const eksikUyari = personelEksikAlanlar({ telefon, iban })

  const save = () => {
    setTouched(true)
    if (!valid) return
    const p: Personel = {
      id: personelId,
      ad: ad.trim(), soyad: soyad.trim(),
      tcKimlik: tcKimlik.trim(),
      iseGirisTarihi,
      brutMaas: brut,
      departman, pozisyon: pozisyon.trim(),
      sgkDurumu: 'normal' as SgkDurumu,
      calismaSekli: 'tam_zamanli',
      sgkIndirimli,
      telefon: telefon.trim(), eposta: eposta.trim(), adres: adres.trim(),
      iban: iban.trim(), dogumTarihi: dogumTarihi.trim(),
      acilKisi: acilKisi.trim(), acilTelefon: acilTelefon.trim(),
      aktif: true,
    }
    addPersonel(p)
    onClose()
  }

  const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')
  const reqBorder = (cond: boolean) => (touched && cond ? ' border-crimson' : '')

  return (
    <Modal title="Yeni Personel" onClose={onClose} width="660px">
      {/* Kimlik */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Ad <span className="text-crimson">*</span></span>
          <input className={inputCls + reqBorder(!ad.trim())} value={ad} onChange={e => setAd(e.target.value)} />
        </div>
        <div>
          <span className={labelCls}>Soyad</span>
          <input className={inputCls} value={soyad} onChange={e => setSoyad(e.target.value)} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>TC Kimlik No <span className="text-crimson">*</span></span>
          <input className={inputCls + reqBorder(!tcKimlik.trim())} value={tcKimlik} onChange={e => setTcKimlik(e.target.value)} placeholder="11 haneli" />
        </div>
        <div>
          <span className={labelCls}>Doğum Tarihi</span>
          <input type="date" className={inputCls} value={dogumTarihi} onChange={e => setDogumTarihi(e.target.value)} />
        </div>
      </div>

      {/* İş bilgileri */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <span className={labelCls}>Departman</span>
          <select className={inputCls} value={departman} onChange={e => setDepartman(e.target.value)}>
            {departmanlar.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <span className={labelCls}>Pozisyon</span>
          <input className={inputCls} value={pozisyon} onChange={e => setPozisyon(e.target.value)} placeholder="Ünvan" />
        </div>
        <div>
          <span className={labelCls}>İşe Giriş</span>
          <input type="date" className={inputCls} value={iseGirisTarihi} onChange={e => setIseGirisTarihi(e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <span className={labelCls}>Ücret Tipi</span>
        <div className="mb-2 flex gap-2">
          {([['brut', 'Brütten Nete'], ['net', 'Netten Brüte']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setUcretTipi(v)}
              className={'flex-1 rounded border px-3 py-2 text-sm transition-colors ' +
                (ucretTipi === v ? 'border-crimson bg-crimson/5 font-medium text-crimson' : 'border-line text-ink-mute hover:text-ink')}>
              {l}
            </button>
          ))}
        </div>
        <span className={labelCls}>
          {ucretTipi === 'brut' ? 'Brüt Maaş (aylık)' : 'Net Maaş (aylık, ele geçen)'} <span className="text-crimson">*</span>
        </span>
        <input type="number" className={inputCls + reqBorder(girilen <= 0)} value={brutMaas} onChange={e => setBrutMaas(e.target.value)} placeholder={ucretTipi === 'brut' ? '33030' : '28075'} />
        {ucretTipi === 'net' && cozum && (
          <p className="mt-1.5 text-xs text-ink-mute">
            Hesaplanan brüt: <span className="font-mono text-ink">{fmt(cozum.brut)}</span> · işveren maliyeti: <span className="font-mono text-crimson">{fmt(cozum.isverenMaliyeti)}</span>
          </p>
        )}
      </div>

      {/* İletişim & banka */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Telefon</span>
          <input className={inputCls} value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="0(5xx) xxx xx xx" />
        </div>
        <div>
          <span className={labelCls}>E-posta</span>
          <input className={inputCls} value={eposta} onChange={e => setEposta(e.target.value)} placeholder="ornek@firma.com" />
        </div>
      </div>

      <div className="mb-4">
        <span className={labelCls}>IBAN (maaş ödemesi)</span>
        <input className={inputCls} value={iban} onChange={e => setIban(e.target.value)} placeholder="TR.. .... .... .... .... .... .." />
      </div>

      <div className="mb-4">
        <span className={labelCls}>Adres</span>
        <input className={inputCls} value={adres} onChange={e => setAdres(e.target.value)} placeholder="Açık adres" />
      </div>

      {/* Acil durum */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <span className={labelCls}>Acil Durum Kişisi</span>
          <input className={inputCls} value={acilKisi} onChange={e => setAcilKisi(e.target.value)} placeholder="Ad soyad" />
        </div>
        <div>
          <span className={labelCls}>Acil Telefon</span>
          <input className={inputCls} value={acilTelefon} onChange={e => setAcilTelefon(e.target.value)} placeholder="0(5xx) xxx xx xx" />
        </div>
      </div>

      <label className="mb-5 flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={sgkIndirimli} onChange={e => setSgkIndirimli(e.target.checked)} />
        İşveren 5 puanlık SGK indiriminden yararlanıyor (primler düzenli ödeniyor)
      </label>

      {/* Bordro önizleme */}
      {preview && (
        <div className="mb-4 rounded-card border border-line bg-surface-2 p-4">
          <div className="label mb-2 text-ink-mute">Bordro Önizleme (2026)</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><div className="text-xs text-ink-mute">Net Maaş</div><div className="font-mono text-positive">{fmt(preview.net)}</div></div>
            <div><div className="text-xs text-ink-mute">Brüt</div><div className="font-mono text-ink">{fmt(brut)}</div></div>
            <div><div className="text-xs text-ink-mute">İşveren Maliyeti</div><div className="font-mono text-crimson">{fmt(preview.isverenMaliyeti)}</div></div>
          </div>
        </div>
      )}

      {/* Eksik bilgi uyarısı (engelleme değil) */}
      {touched && valid && eksikUyari.length > 0 && (
        <div className="mb-4 rounded border border-warn/30 bg-warn/5 px-4 py-2.5 text-sm text-warn">
          Eksik bilgi: {eksikUyari.map(f => f === 'telefon' ? 'telefon' : 'IBAN').join(', ')}. Personel kaydedilebilir ama maaş ödemesi/ulaşım için tamamlanması önerilir.
        </div>
      )}

      <div className="flex justify-end gap-2.5">
        <button onClick={onClose} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">İptal</button>
        <button onClick={save} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">Personel Ekle</button>
      </div>
    </Modal>
  )
}
