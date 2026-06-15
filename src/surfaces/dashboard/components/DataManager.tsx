import { useState } from 'react'
import Modal from './Modal'
import { disableDemo } from '../../../shared/config'

interface Props {
  onClose: () => void
}

// Data actions surfaced as buttons so nobody touches the browser console.
// The one thing that genuinely needs a control here is clearing data; loading
// the demo dataset lives on the landing page ("Demoyu gör"), where it has
// context. Keeping this panel focused avoids "is this my data or fake data?".
export default function DataManager({ onClose }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState<string>('')

  const clearAll = () => {
    disableDemo()
    try {
      localStorage.removeItem('finance')
      localStorage.removeItem('tax')
      localStorage.removeItem('ledger')
      localStorage.removeItem('cari')
      localStorage.removeItem('hr')
      sessionStorage.clear()
    } catch { /* ignore */ }
    setDone('Tüm veriler temizlendi.')
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <Modal title="Verileri Yönet" onClose={onClose} width="520px">
      {done ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-positive/15 text-positive">✓</div>
          <p className="text-sm font-medium text-ink">{done}</p>
          <p className="mt-1 text-xs text-ink-mute">Sayfa yenileniyor…</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Octo'daki tüm verileri buradan temizleyebilirsin. Demo verisini görmek için ana sayfadaki "Demoyu gör" düğmesini kullan.
          </p>

          <div className="rounded-card border border-crimson/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-ink">Tüm verileri temizle</div>
                <div className="mt-0.5 text-xs text-ink-mute">Tüm faturalar, hesaplar, işlemler ve muhasebe kayıtları silinir. Geri alınamaz.</div>
              </div>
              {confirming ? (
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setConfirming(false)} className="rounded border border-line px-3 py-2 text-xs text-ink-mute hover:text-ink">
                    Vazgeç
                  </button>
                  <button onClick={clearAll} className="rounded bg-crimson px-3 py-2 text-xs font-medium text-white hover:opacity-90">
                    Evet, sil
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="shrink-0 rounded border border-crimson/40 px-4 py-2 text-sm font-medium text-crimson transition-colors hover:bg-crimson hover:text-white"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
