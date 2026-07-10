import { useState, useEffect, useCallback, useRef } from 'react'
import { routeImport, analyzeFile, kindLabels, type ImportSummary, type FileAnalysis } from '../../../import/routeImport'
import type { SheetKind } from '../../../import/buildFinanceExtras'
import Modal from './Modal'
import BankStatementImport from '../../../import/BankStatementImport'
import ExcelImport from '../../../import/ExcelImport'
import ExcelImportVergi from '../../../import/ExcelImportVergi'
import { runReasoningEngine } from '../../../reasoning/engine'

type Phase = 'idle' | 'dragging' | 'analyzing' | 'confirm' | 'working' | 'done' | 'error'
type RouteChoice = 'auto' | 'invoices' | 'transactions' | 'cariler' | 'beyannameler'

const choiceLabels: Record<RouteChoice, string> = {
  auto: 'Otomatik (Octo karar versin)',
  invoices: 'Fatura',
  transactions: 'Banka ekstresi / İşlem',
  cariler: 'Cari',
  beyannameler: 'Beyanname',
}

function useFileImport() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
  const [choice, setChoice] = useState<RouteChoice>('auto')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [manualWizard, setManualWizard] = useState<SheetKind | null>(null)
  const [newCaseCount, setNewCaseCount] = useState(0)

  const handleFile = useCallback(async (f: File) => {
    setFile(f); setPhase('analyzing')
    setSummary(null); setErrorMsg(''); setManualWizard(null)
    try {
      const a = await analyzeFile(f)
      setAnalysis(a); setChoice('auto'); setPhase('confirm')
    } catch {
      setErrorMsg('Dosya okunamadı. Geçerli bir .xlsx, .xls veya .csv dosyası olduğundan emin olun.')
      setPhase('error')
    }
  }, [])

  const confirmAuto = useCallback(async () => {
    if (!file) return
    setPhase('working')
    try {
      const before = new Set(runReasoningEngine().map(item => item.id))
      const result = await routeImport(file)
      const after = runReasoningEngine()
      setNewCaseCount(after.filter(item => !before.has(item.id)).length)
      setSummary(result); setPhase('done')
    } catch {
      setErrorMsg('İçe aktarma sırasında bir hata oluştu.'); setPhase('error')
    }
  }, [file])

  const openManual = useCallback((kind: SheetKind) => {
    setManualWizard(kind); setPhase('idle')
  }, [])

  const reset = useCallback(() => {
    setPhase('idle'); setFile(null); setAnalysis(null); setSummary(null)
    setErrorMsg(''); setManualWizard(null); setChoice('auto'); setNewCaseCount(0)
  }, [])

  return { phase, setPhase, file, analysis, choice, setChoice, summary, newCaseCount, errorMsg, manualWizard, setManualWizard, handleFile, confirmAuto, openManual, reset }
}

function updatedViews(summary: ImportSummary): string[] {
  const kinds = new Set(summary.results.filter(item => item.count > 0).map(item => item.kind))
  const views: string[] = []
  if (['accounts', 'transactions', 'invoices', 'cariler'].some(kind => kinds.has(kind as SheetKind))) views.push('Finans')
  if (kinds.has('beyannameler')) views.push('Vergi')
  if (['accounts', 'transactions', 'invoices', 'beyannameler'].some(kind => kinds.has(kind as SheetKind))) views.push('30 Gün')
  return views
}

function SummaryLines({ summary, newCaseCount }: { summary: ImportSummary; newCaseCount: number }) {
  if (summary.total === 0) {
    return <p className="text-sm text-warn">Dosyada tanınan veri bulunamadı. Türü seçip sütunları kendiniz eşleştirebilirsiniz.</p>
  }
  const views = updatedViews(summary)
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink">{summary.total} kayıt içe aktarıldı.</p>
      <div className="space-y-1.5">
      {summary.results.filter(r => r.count > 0).map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-ink">
          <span className="text-positive">✓</span>
          <span className="font-medium">{r.count}</span>
          <span className="text-ink-soft">{kindLabels[r.kind]} aktarıldı</span>
          <span className="text-xs text-ink-mute">({r.sheetName})</span>
        </div>
      ))}
      {summary.unknownSheets.length > 0 && (
        <div className="mt-2 text-xs text-ink-mute">Atlanan sayfalar: {summary.unknownSheets.join(', ')}</div>
      )}
      </div>
      {views.length > 0 && (
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
          Güncellenen görünümler: {views.join(', ')}.
        </div>
      )}
      {newCaseCount > 0 && (
        <p className="text-xs font-medium text-crimson">{newCaseCount} yeni doğrulanabilir içgörü oluştu.</p>
      )}
    </div>
  )
}

function ConfirmFlow(ctrl: ReturnType<typeof useFileImport>) {
  const { phase, analysis, choice, setChoice, summary, newCaseCount, errorMsg, manualWizard, setManualWizard, confirmAuto, openManual, reset } = ctrl

  if (manualWizard) {
    const close = () => { setManualWizard(null); reset() }
    if (manualWizard === 'transactions') return <BankStatementImport onClose={close} />
    if (manualWizard === 'beyannameler') return <ExcelImportVergi onClose={close} />
    return <ExcelImport onClose={close} />
  }

  if (phase === 'confirm' && analysis) {
    const found = analysis.sheets.filter(s => s.kind !== 'unknown')
    const guess = analysis.primaryKind
    return (
      <Modal title="İçe Aktarma" onClose={reset} width="560px">
        <div className="space-y-4">
          {found.length > 0 ? (
            <div>
              <p className="mb-2 text-sm text-ink-soft">Octo dosyanızı inceledi ve şu kayıt türlerini buldu:</p>
              <div className="space-y-1.5 rounded-card border border-line p-3">
                {found.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{kindLabels[s.kind]}{s.isStatement ? ' (banka ekstresi)' : ''}</span>
                    <span className="text-xs text-ink-mute">{s.rowCount} satır · {s.sheetName}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
              Octo dosya türünü otomatik tanıyamadı. Türü seçip sütunları kendiniz eşleştirebilirsiniz.
            </div>
          )}

          <div>
            <span className="label mb-1.5 block text-ink-mute">Aktarma yöntemi</span>
            <select value={choice} onChange={e => setChoice(e.target.value as RouteChoice)}
              className="w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink">
              <option value="auto">{choiceLabels.auto}{guess !== 'unknown' ? ` — ${kindLabels[guess]} göründü` : ''}</option>
              <option value="invoices">{choiceLabels.invoices}</option>
              <option value="transactions">{choiceLabels.transactions}</option>
              <option value="cariler">{choiceLabels.cariler}</option>
              <option value="beyannameler">{choiceLabels.beyannameler}</option>
            </select>
            <p className="mt-1.5 text-xs text-ink-mute">Otomatik aktarım bulunan türleri yerleştirir. Bir tür seçerseniz sütun eşleştirme ekranına geçersiniz.</p>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button onClick={reset} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">İptal</button>
            <button onClick={() => choice === 'auto' ? confirmAuto() : openManual(choice as SheetKind)}
              disabled={choice === 'auto' && found.length === 0}
              className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {choice === 'auto' ? 'Octo’nun bulduklarını aktar' : 'Türü ve sütunları kendim seçeyim'}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  if (phase === 'analyzing' || phase === 'working') {
    return (
      <Modal title="İçe Aktarma" onClose={reset} width="420px">
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-pulse rounded-full border border-crimson bg-crimson/10" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">{phase === 'analyzing' ? 'Octo dosyanızı inceliyor…' : 'İçe aktarılıyor…'}</p>
        </div>
      </Modal>
    )
  }

  if (phase === 'done' && summary) {
    return (
      <Modal title="İçe Aktarma Tamam" onClose={reset} width="480px">
        <div className="mb-4"><SummaryLines summary={summary} newCaseCount={newCaseCount} /></div>
        <div className="flex justify-end">
          <button onClick={reset} className="rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">Kapat</button>
        </div>
      </Modal>
    )
  }

  if (phase === 'error') {
    return (
      <Modal title="Hata" onClose={reset} width="440px">
        <p className="text-sm text-crimson">{errorMsg}</p>
        <div className="mt-5 flex justify-end">
          <button onClick={reset} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">Kapat</button>
        </div>
      </Modal>
    )
  }

  return null
}

export function DropAnywhere() {
  const ctrl = useFileImport()
  const { phase, setPhase, handleFile } = ctrl
  const dragDepth = useRef(0)

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault(); dragDepth.current++
      setPhase(p => (p === 'idle' ? 'dragging' : p))
    }
    const onDragOver = (e: DragEvent) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() }
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault(); dragDepth.current--
      if (dragDepth.current <= 0) setPhase(p => (p === 'dragging' ? 'idle' : p))
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); dragDepth.current = 0
      const f = e.dataTransfer?.files?.[0]
      if (f) handleFile(f); else setPhase('idle')
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [handleFile, setPhase])

  return (
    <>
      {phase === 'dragging' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}>
          <div className="w-full max-w-md rounded-card border-2 border-dashed p-8 text-center" style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--crimson))' }}>
            <div className="mb-3 text-3xl">↓</div>
            <p className="text-base font-medium text-ink">Dosyanızı bırakın, Octo türünü tanısın</p>
            <p className="mt-1 text-sm text-ink-mute">Octo bulduğu kayıt türlerini onayınıza sunar. İsterseniz türü ve sütunları kendiniz seçebilirsiniz.</p>
          </div>
        </div>
      )}
      <ConfirmFlow {...ctrl} />
    </>
  )
}

export function ImportZone({ compact = false }: { compact?: boolean }) {
  const ctrl = useFileImport()
  const { handleFile } = ctrl
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  return (
    <>
      <div
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click() } }}
        role="button"
        tabIndex={0}
        aria-label="Excel veya CSV dosyası seç"
        className={'cursor-pointer rounded-card border-2 border-dashed text-center transition-colors ' +
          (compact ? 'px-4 py-3 ' : 'px-6 py-10 ') +
          (over ? 'border-crimson bg-crimson/5' : 'border-line hover:border-crimson/40')}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {compact ? (
          <p className="text-sm font-medium text-ink-soft">＋ Excel / CSV içe aktar</p>
        ) : (
          <>
            <div className="mb-2 text-2xl">↓</div>
            <p className="text-base font-medium text-ink">Verilerinizi buraya bırakın</p>
            <p className="mt-1 text-sm text-ink-mute">Fatura, cari, banka ekstresi, işlem veya beyanname — Octo türünü tanır, onayınıza sunar ve gerektiğinde sütunları eşleştirmenizi sağlar.</p>
            <p className="mt-3 text-xs text-ink-mute">Dosya tarayıcınızdan çıkmaz ve sunucuya gönderilmez.</p>
          </>
        )}
      </div>
      <ConfirmFlow {...ctrl} />
    </>
  )
}
