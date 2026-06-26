import { useState } from 'react'
import Modal from '../surfaces/dashboard/components/Modal'
import { addInvoice } from '../layers/finance/financeStore'
import { addCari, findCariByVkn } from '../layers/finance/cari/cariStore'
import { faturaCikar, type CikarilmisFatura } from './faturaCikar'
import type { Invoice } from '../layers/finance/types'
import type { Cari } from '../layers/finance/cari/types'

interface Props {
  onClose: () => void
  onDone?: () => void
}

type Stage = 'upload' | 'working' | 'review' | 'done' | 'error'

const inputCls = 'w-full rounded border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink-mute'
const labelCls = 'label mb-1 block text-ink-mute'

export default function FaturaFotoImport({ onClose, onDone }: Props) {
  const [stage, setStage] = useState<Stage>('upload')
  const [preview, setPreview] = useState<string>('')
  const [hata, setHata] = useState('')
  const [f, setF] = useState<CikarilmisFatura | null>(null)

  const handleFile = async (file: File) => {
    setHata('')
    setStage('working')
    setPreview(URL.createObjectURL(file))
    const res = await faturaCikar(file)
    if (!res.ok || !res.fatura) {
      setHata(res.hata ?? 'Okunamadı'); setStage('error'); return
    }
    setF(res.fatura)
    setStage('review')
  }

  // Editable field setter
  const upd = (patch: Partial<CikarilmisFatura>) => setF(prev => prev ? { ...prev, ...patch } : prev)

  const kaydet = () => {
    if (!f) return
    // Cari: match by VKN or create a light one (kept editable later in Cariler).
    let cariUnvan = f.cariUnvan
    if (f.vkn) {
      const mevcut = findCariByVkn(f.vkn)
      if (!mevcut && f.cariUnvan) {
        const yeni: Cari = {
          id: 'cari-foto-' + Date.now(),
          unvan: f.cariUnvan, vkn: f.vkn,
          tip: f.tur === 'purchase' ? 'tedarikci' : 'musteri',
          telefon: '', adres: '', vergiDairesi: '', yetkili: '', eposta: '',
          olusturulma: new Date().toISOString().slice(0, 10),
        }
        addCari(yeni)
      } else if (mevcut) {
        cariUnvan = mevcut.unvan
      }
    }

    const net = f.tutar ?? (f.toplam && f.kdvOrani ? f.toplam / (1 + f.kdvOrani / 100) : f.toplam ?? 0)
    const kdv = f.kdvTutari ?? (net && f.kdvOrani ? net * f.kdvOrani / 100 : 0)
    const toplam = f.toplam ?? (net + kdv)

    const inv: Invoice = {
      id: 'inv-foto-' + Date.now(),
      type: f.tur,
      contactName: cariUnvan || 'Bilinmeyen',
      contactTaxId: f.vkn,
      amount: net,
      vatAmount: kdv,
      total: toplam,
      vatRate: f.kdvOrani ?? 20,
      currency: 'TRY',
      issueDate: f.faturaTarihi || new Date().toISOString().slice(0, 10),
      dueDate: f.faturaTarihi || new Date().toISOString().slice(0, 10),
      status: 'sent',
      description: f.aciklama,
    }
    addInvoice(inv)
    setStage('done')
    onDone?.()
  }

  const guvenRenk = f?.guven === 'yuksek' ? 'text-positive' : f?.guven === 'dusuk' ? 'text-crimson' : 'text-warn'

  return (
    <Modal title="Fatura Fotoğrafından Oku" onClose={onClose} width="640px">
      {stage === 'upload' && (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-line bg-surface-2 px-6 py-12 text-center transition-colors hover:border-crimson/40">
            <span className="text-sm font-medium text-ink">Fatura fotoğrafı (JPG/PNG) seç veya bırak</span>
            <span className="mt-1 text-xs text-ink-mute">Octo görseli okur, fatura alanlarını otomatik çıkarır. Sen kontrol edip kaydedersin.</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
          <p className="mt-3 text-xs text-ink-mute">PDF için şimdilik ekran görüntüsü al ve yükle. (PDF desteği backend ile gelecek.)</p>
        </div>
      )}

      {stage === 'working' && (
        <div className="py-10 text-center">
          <div className="mb-3 text-2xl">⏳</div>
          <p className="text-sm font-medium text-ink">Octo faturayı okuyor…</p>
          <p className="mt-1 text-xs text-ink-mute">Görsel yapay zeka ile analiz ediliyor.</p>
        </div>
      )}

      {stage === 'review' && f && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink-soft">Octo şunları okudu. <strong>Kontrol et ve düzelt</strong>, sonra kaydet:</p>
            <span className={'text-xs ' + guvenRenk}>güven: {f.guven}</span>
          </div>

          <div className="grid grid-cols-[1fr_1.2fr] gap-4">
            {preview && (
              <img src={preview} alt="fatura" className="max-h-[300px] w-full rounded-card border border-line object-contain" />
            )}
            <div className="space-y-2.5">
              <div>
                <span className={labelCls}>Cari Ünvan</span>
                <input className={inputCls} value={f.cariUnvan} onChange={e => upd({ cariUnvan: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className={labelCls}>VKN</span>
                  <input className={inputCls} value={f.vkn} onChange={e => upd({ vkn: e.target.value })} />
                </div>
                <div>
                  <span className={labelCls}>Tarih</span>
                  <input type="date" className={inputCls} value={f.faturaTarihi} onChange={e => upd({ faturaTarihi: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className={labelCls}>Matrah</span>
                  <input type="number" className={inputCls} value={f.tutar ?? ''} onChange={e => upd({ tutar: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
                <div>
                  <span className={labelCls}>KDV %</span>
                  <input type="number" className={inputCls} value={f.kdvOrani ?? ''} onChange={e => upd({ kdvOrani: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
                <div>
                  <span className={labelCls}>Toplam</span>
                  <input type="number" className={inputCls} value={f.toplam ?? ''} onChange={e => upd({ toplam: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
              </div>
              <div>
                <span className={labelCls}>Tür</span>
                <div className="flex gap-2">
                  {([['sales', 'Satış'], ['purchase', 'Alış']] as const).map(([v, l]) => (
                    <button key={v} onClick={() => upd({ tur: v })}
                      className={'flex-1 rounded border px-3 py-1.5 text-sm ' + (f.tur === v ? 'border-crimson bg-crimson/5 text-crimson' : 'border-line text-ink-mute')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={labelCls}>Açıklama</span>
                <input className={inputCls} value={f.aciklama} onChange={e => upd({ aciklama: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-between">
            <button onClick={() => setStage('upload')} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">← Başka fatura</button>
            <button onClick={kaydet} disabled={!f.cariUnvan} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              Faturayı Kaydet
            </button>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="py-8 text-center">
          <div className="mb-3 text-2xl">⚠️</div>
          <p className="text-sm text-crimson">{hata}</p>
          <button onClick={() => setStage('upload')} className="mt-5 rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">Tekrar dene</button>
        </div>
      )}

      {stage === 'done' && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-positive/15 text-positive">✓</div>
          <p className="text-lg font-medium text-ink">Fatura kaydedildi</p>
          <p className="mt-1 text-sm text-ink-mute">Faturalar listesinde ve muhasebede görünür.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => { setF(null); setPreview(''); setStage('upload') }} className="rounded border border-line px-5 py-2.5 text-sm text-ink-soft hover:text-ink">Başka fatura oku</button>
            <button onClick={onClose} className="rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">Kapat</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
