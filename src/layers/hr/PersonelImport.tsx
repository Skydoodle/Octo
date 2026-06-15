import { useState } from 'react'
import * as XLSX from 'xlsx'
import Modal from '../../surfaces/dashboard/components/Modal'
import { addPersonel } from './hrStore'
import { brutToNet } from './bordroEngine'
import { departmanlar, type Personel } from './types'

interface Props {
  onClose: () => void
}

// Lightweight header normalizer (matches the import module's behavior).
function norm(h: string): string {
  return String(h ?? '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '').trim()
}

function parseNum(v: unknown): number {
  if (v == null) return 0
  const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

type Stage = 'upload' | 'preview' | 'done'

interface Row {
  personel: Personel | null
  error?: string
}

export default function PersonelImport({ onClose }: Props) {
  const [stage, setStage] = useState<Stage>('upload')
  const [rows, setRows] = useState<Row[]>([])
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const m = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
      const headerIdx = m.findIndex(r => r && r.some(c => c != null && String(c).trim() !== ''))
      const headers = (m[headerIdx] ?? []).map(h => norm(String(h)))
      const dataRows = m.slice(headerIdx + 1).filter(r => r && r.some(c => c != null && String(c).trim() !== ''))

      const col = (...keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)))
      const cAd = col('ad', 'isim', 'adsoyad')
      const cSoyad = col('soyad')
      const cTc = col('tc', 'kimlik', 'tckimlik')
      const cBrut = col('brut', 'maas', 'ucret')
      const cDep = col('departman', 'birim')
      const cPoz = col('pozisyon', 'unvan', 'gorev')
      const cGiris = col('isegiris', 'giristarihi', 'baslangic')
      const cTel = col('telefon', 'tel', 'gsm')
      const cIban = col('iban', 'hesapno')
      const cEposta = col('eposta', 'email', 'mail')

      const built: Row[] = dataRows.map((r, i) => {
        const adRaw = cAd >= 0 ? String(r[cAd] ?? '').trim() : ''
        let ad = adRaw, soyad = cSoyad >= 0 ? String(r[cSoyad] ?? '').trim() : ''
        // If a single "Ad Soyad" column, split it.
        if (cSoyad < 0 && adRaw.includes(' ')) {
          const parts = adRaw.split(' ')
          soyad = parts.pop() ?? ''
          ad = parts.join(' ')
        }
        const brut = cBrut >= 0 ? parseNum(r[cBrut]) : 0
        if (!ad || brut <= 0) return { personel: null, error: 'Ad veya brüt maaş eksik' }
        const dep = cDep >= 0 ? String(r[cDep] ?? '').trim() : 'Diğer'
        return {
          personel: {
            id: 'per-imp-' + Date.now() + '-' + i,
            ad, soyad,
            tcKimlik: cTc >= 0 ? String(r[cTc] ?? '').trim() : '',
            iseGirisTarihi: cGiris >= 0 ? String(r[cGiris] ?? '').trim() : new Date().toISOString().slice(0, 10),
            brutMaas: brut,
            departman: departmanlar.includes(dep) ? dep : 'Diğer',
            pozisyon: cPoz >= 0 ? String(r[cPoz] ?? '').trim() : '',
            sgkDurumu: 'normal',
            calismaSekli: 'tam_zamanli',
            sgkIndirimli: true,
            telefon: cTel >= 0 ? String(r[cTel] ?? '').trim() : '',
            iban: cIban >= 0 ? String(r[cIban] ?? '').trim() : '',
            eposta: cEposta >= 0 ? String(r[cEposta] ?? '').trim() : '',
            aktif: true,
          },
        }
      })
      setRows(built)
      setStage('preview')
    } catch {
      setError('Dosya okunamadı. Geçerli bir .xlsx veya .csv dosyası seç.')
    }
  }

  const commit = () => {
    let n = 0
    for (const r of rows) { if (r.personel) { addPersonel(r.personel); n++ } }
    setCount(n)
    setStage('done')
  }

  const valid = rows.filter(r => r.personel)
  const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

  return (
    <Modal title="Personel İçe Aktar" onClose={onClose} width="720px">
      {error && <div className="mb-4 rounded border border-crimson/30 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</div>}

      {stage === 'upload' && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-line bg-surface-2 px-6 py-12 text-center transition-colors hover:border-crimson/40">
          <span className="text-sm font-medium text-ink">Personel listesi (.xlsx / .csv) seç veya bırak</span>
          <span className="mt-1 text-xs text-ink-mute">Beklenen sütunlar: Ad, Soyad, TC, Brüt Maaş, Departman, Pozisyon, İşe Giriş</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      )}

      {stage === 'preview' && (
        <div>
          <div className="mb-3 text-sm"><span className="text-positive">{valid.length} geçerli</span>{rows.length - valid.length > 0 && <span className="ml-3 text-ink-mute">{rows.length - valid.length} hatalı</span>}</div>
          <div className="max-h-[340px] overflow-auto rounded-card border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="px-3 py-2 text-left"><span className="label text-ink-mute">Ad Soyad</span></th>
                  <th className="px-3 py-2 text-left"><span className="label text-ink-mute">Departman</span></th>
                  <th className="px-3 py-2 text-right"><span className="label text-ink-mute">Brüt</span></th>
                  <th className="px-3 py-2 text-right"><span className="label text-ink-mute">Net</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={'border-t border-line ' + (!r.personel ? 'bg-crimson/5' : '')}>
                    <td className="px-3 py-2 text-ink">{r.personel ? `${r.personel.ad} ${r.personel.soyad}` : <span className="text-crimson text-xs">{r.error}</span>}</td>
                    <td className="px-3 py-2 text-ink-soft">{r.personel?.departman ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-ink">{r.personel ? fmt(r.personel.brutMaas) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-positive">{r.personel ? fmt(brutToNet(r.personel.brutMaas, r.personel.sgkIndirimli).net) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between">
            <button onClick={() => setStage('upload')} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">← Geri</button>
            <button onClick={commit} disabled={valid.length === 0} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">{valid.length} Personeli Aktar</button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-positive/15 text-positive">✓</div>
          <p className="text-lg font-medium text-ink">{count} personel içe aktarıldı</p>
          <p className="mt-1 text-sm text-ink-mute">Bordroları otomatik hesaplandı, SGK/maaş yükümlülükleri diğer katmanlara işlendi.</p>
          <button onClick={onClose} className="mt-5 rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">Kapat</button>
        </div>
      )}
    </Modal>
  )
}
