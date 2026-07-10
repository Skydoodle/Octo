import { useState } from 'react'
import * as XLSX from 'xlsx'
import Modal from '../surfaces/dashboard/components/Modal'
import { addInvoice, settleInvoice, addAccount, addTransaction, getFinanceState } from '../layers/finance/financeStore'
import { parseSheetMatrix, autoMap, fieldLabels, type InvoiceField, type ParsedSheet } from './automap'
import { buildRows, type BuiltRow } from './buildRows'
import { detectSheetKind, buildAccounts, buildTransactions } from './buildFinanceExtras'

interface Props {
  onClose: () => void
  onDone?: (count: number) => void
}

const FIELD_ORDER: InvoiceField[] = [
  'contactName', 'contactTaxId', 'issueDate', 'dueDate',
  'amount', 'vatRate', 'vatAmount', 'total', 'description', 'type', 'status', 'ignore',
]

type Stage = 'upload' | 'map' | 'preview' | 'done'

export default function ExcelImport({ onClose, onDone }: Props) {
  const [stage, setStage] = useState<Stage>('upload')
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<InvoiceField[]>([])
  const [defaultType, setDefaultType] = useState<'sales' | 'purchase'>('sales')
  const [built, setBuilt] = useState<BuiltRow[]>([])
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState('')
  // Extra sheets found in the same workbook (accounts / transactions), imported
  // alongside invoices so one file populates the whole dashboard.
  const [extraAccounts, setExtraAccounts] = useState<XLSX.WorkSheet | null>(null)
  const [extraTransactions, setExtraTransactions] = useState<XLSX.WorkSheet | null>(null)
  const [extrasSummary, setExtrasSummary] = useState<string>('')

  const loadSheet = (wb: XLSX.WorkBook, name: string) => {
    const ws = wb.Sheets[name]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
    const parsed = parseSheetMatrix(matrix)
    setSheet(parsed)
    setMapping(autoMap(parsed))
    setStage('map')
  }

  const handleFile = async (file: File) => {
    setError('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: false })
      setWorkbook(wb)
      setSheetNames(wb.SheetNames)

      // Scan every sheet: pick the first invoice sheet to map interactively,
      // and stash any account/transaction sheets to import automatically.
      let invoiceSheetName = wb.SheetNames[0]
      let accSheet: XLSX.WorkSheet | null = null
      let txSheet: XLSX.WorkSheet | null = null
      const found: string[] = []
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name]
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
        const kind = detectSheetKind(parseSheetMatrix(matrix))
        if (kind === 'invoices') invoiceSheetName = name
        else if (kind === 'accounts') { accSheet = ws; found.push('banka hesapları') }
        else if (kind === 'transactions') { txSheet = ws; found.push('işlemler') }
      }
      setExtraAccounts(accSheet)
      setExtraTransactions(txSheet)
      setExtrasSummary(found.length ? `Ayrıca bulundu: ${found.join(', ')} — birlikte aktarılacak.` : '')
      loadSheet(wb, invoiceSheetName)
    } catch {
      setError('Dosya okunamadı. Geçerli bir .xlsx veya .csv dosyası seçin.')
    }
  }

  const runPreview = () => {
    if (!sheet) return
    setBuilt(buildRows(sheet, mapping, defaultType))
    setExcluded(new Set())
    setStage('preview')
  }

  const commit = () => {
    // 1) Accounts first, so settlements and transactions have an account to hit.
    let firstAccountId = ''
    if (extraAccounts) {
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(extraAccounts, { header: 1, raw: true, defval: null })
      const accs = buildAccounts(parseSheetMatrix(matrix))
      accs.forEach(a => { if (a.account) { addAccount(a.account); if (!firstAccountId) firstAccountId = a.account.id } })
    }
    if (!firstAccountId) firstAccountId = getFinanceState().accounts[0]?.id ?? ''

    // 2) Invoices. Paid ones auto-settle so cash + a transaction appear.
    let n = 0
    built.forEach(b => {
      if (b.invoice && !excluded.has(b.index)) {
        const wasPaid = b.invoice.status === 'paid'
        // Add as unsettled first, then settle, so the settlement transaction
        // and cash movement are generated through the normal path.
        const inv = wasPaid ? { ...b.invoice, status: 'sent' as const } : b.invoice
        if (addInvoice(inv)) {
          if (wasPaid) settleInvoice(inv.id, firstAccountId || undefined)
          n++
        }
      }
    })

    // 3) Standalone bank transactions from the İşlemler sheet.
    if (extraTransactions && firstAccountId) {
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(extraTransactions, { header: 1, raw: true, defval: null })
      const txs = buildTransactions(parseSheetMatrix(matrix), firstAccountId)
      txs.forEach(t => { if (t.transaction) addTransaction(t.transaction) })
    }

    setImportedCount(n)
    setStage('done')
    onDone?.(n)
  }

  const validCount = built.filter(b => b.invoice && !excluded.has(b.index)).length
  const errorCount = built.filter(b => !b.invoice).length

  return (
    <Modal title="Excel'den İçe Aktar" onClose={onClose} width="820px">
      {/* progress */}
      <div className="mb-5 flex items-center gap-2 text-xs">
        {(['upload', 'map', 'preview'] as Stage[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={'flex h-6 w-6 items-center justify-center rounded-full font-medium ' +
              (stage === s ? 'bg-crimson text-white' :
                ['upload', 'map', 'preview'].indexOf(stage) > i ? 'bg-positive/20 text-positive' : 'bg-surface-2 text-ink-mute')}>
              {i + 1}
            </span>
            <span className={stage === s ? 'text-ink font-medium' : 'text-ink-mute'}>
              {s === 'upload' ? 'Dosya' : s === 'map' ? 'Eşleştir' : 'Önizle'}
            </span>
            {i < 2 && <span className="text-line">→</span>}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded border border-crimson/30 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</div>}

      {/* STAGE 1: upload */}
      {stage === 'upload' && (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-line bg-surface-2 px-6 py-12 text-center transition-colors hover:border-crimson/40">
            <span className="text-sm font-medium text-ink">Excel dosyasını seç veya buraya bırak</span>
            <span className="mt-1 text-xs text-ink-mute">.xlsx, .xls veya .csv · Dosya tarayıcından çıkmaz, sunucuya gitmez</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <p className="mt-4 text-xs text-ink-mute">
            Octo dosyanı analiz eder, sütunları otomatik tanır ve Türkçe sayı/tarih biçimlerini düzeltir. Sonra onayına sunar.
          </p>
        </div>
      )}

      {/* STAGE 2: map */}
      {stage === 'map' && sheet && (
        <div>
          {sheetNames.length > 1 && (
            <div className="mb-4">
              <span className="label mb-1.5 block text-ink-mute">Sayfa</span>
              <select
                className="rounded border border-line bg-surface px-3 py-2 text-sm text-ink"
                onChange={e => workbook && loadSheet(workbook, e.target.value)}
              >
                {sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}

          <p className="mb-3 text-sm text-ink-soft">
            Octo sütunları otomatik tanıdı. Yanlış olanları düzelt:
          </p>
          {extrasSummary && (
            <div className="mb-3 rounded border border-positive/30 bg-positive/5 px-4 py-2.5 text-xs text-positive">
              {extrasSummary}
            </div>
          )}

          <div className="max-h-[320px] overflow-y-auto rounded-card border border-line">
            <div className="grid grid-cols-[1fr_1fr] gap-px bg-line">
              <div className="bg-surface-2 px-4 py-2"><span className="label text-ink-mute">Excel Sütunu</span></div>
              <div className="bg-surface-2 px-4 py-2"><span className="label text-ink-mute">Octo Alanı</span></div>
              {sheet.headers.map((h, col) => (
                <div key={col} className="contents">
                  <div className="bg-surface px-4 py-2.5">
                    <div className="text-sm text-ink">{h}</div>
                    <div className="truncate text-xs text-ink-mute">
                      {sheet.rows.slice(0, 1).map(r => r[col] !== null && r[col] !== undefined ? String(r[col]) : '—').join('')}
                    </div>
                  </div>
                  <div className="bg-surface px-4 py-2.5">
                    <select
                      className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                      value={mapping[col]}
                      onChange={e => {
                        const next = [...mapping]; next[col] = e.target.value as InvoiceField; setMapping(next)
                      }}
                    >
                      {FIELD_ORDER.map(f => <option key={f} value={f}>{fieldLabels[f]}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <span className="label mb-1 block text-ink-mute">Tür belirtilmemişse</span>
              <div className="flex">
                {(['sales', 'purchase'] as const).map(t => (
                  <button key={t} onClick={() => setDefaultType(t)}
                    className={'border border-line px-3 py-1.5 text-xs ' + (t === 'sales' ? 'rounded-l border-r-0 ' : 'rounded-r ') +
                      (defaultType === t ? 'bg-ink text-paper' : 'bg-surface text-ink-mute')}>
                    {t === 'sales' ? 'Satış' : 'Alış'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={runPreview} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
              Önizle →
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: preview */}
      {stage === 'preview' && (
        <div>
          <div className="mb-3 flex gap-4 text-sm">
            <span className="text-positive">{validCount} geçerli</span>
            {errorCount > 0 && <span className="text-crimson">{errorCount} hatalı (atlanır)</span>}
            <span className="text-ink-mute">{built.length} toplam satır</span>
          </div>

          <div className="max-h-[340px] overflow-auto rounded-card border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="px-3 py-2 text-left"><span className="label text-ink-mute">Müşteri</span></th>
                  <th className="px-3 py-2 text-left"><span className="label text-ink-mute">Tarih</span></th>
                  <th className="px-3 py-2 text-right"><span className="label text-ink-mute">Tutar</span></th>
                  <th className="px-3 py-2 text-right"><span className="label text-ink-mute">KDV</span></th>
                  <th className="px-3 py-2 text-right"><span className="label text-ink-mute">Toplam</span></th>
                  <th className="px-3 py-2 text-left"><span className="label text-ink-mute">Durum</span></th>
                </tr>
              </thead>
              <tbody>
                {built.map(b => {
                  const bad = !b.invoice
                  const off = excluded.has(b.index)
                  return (
                    <tr key={b.index} className={'border-t border-line ' + (bad ? 'bg-crimson/5' : off ? 'opacity-40' : '')}>
                      <td className="px-3 py-2 text-ink">{b.raw.contactName || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink-soft">{b.raw.issueDate || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-ink">{b.raw.amount}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-ink-soft">{b.raw.vatAmount}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-ink">{b.raw.total}</td>
                      <td className="px-3 py-2">
                        {bad ? (
                          <span className="text-xs text-crimson">{b.errors.join(', ')}</span>
                        ) : b.warnings.length > 0 ? (
                          <span className="text-xs text-warn" title={b.warnings.join(', ')}>uyarı</span>
                        ) : (
                          <button onClick={() => {
                            const n = new Set(excluded)
                            if (off) n.delete(b.index)
                            else n.add(b.index)
                            setExcluded(n)
                          }} className="text-xs text-ink-mute hover:text-ink">
                            {off ? 'geri al' : 'çıkar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between">
            <button onClick={() => setStage('map')} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">
              ← Geri
            </button>
            <button onClick={commit} disabled={validCount === 0}
              className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {validCount} Faturayı İçe Aktar
            </button>
          </div>
        </div>
      )}

      {/* STAGE 4: done */}
      {stage === 'done' && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-positive/15 text-positive">✓</div>
          <p className="text-lg font-medium text-ink">{importedCount} fatura içe aktarıldı</p>
          <p className="mt-1 text-sm text-ink-mute">Faturalar listende ve KDV hesabında görünür.</p>
          <button onClick={onClose} className="mt-5 rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">
            Kapat
          </button>
        </div>
      )}
    </Modal>
  )
}
