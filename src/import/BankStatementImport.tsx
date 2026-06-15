import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import Modal from '../surfaces/dashboard/components/Modal'
import { addTransaction, addAccount, getFinanceState } from '../layers/finance/financeStore'
import { parseTurkishNumber, parseTurkishDate, detectColumnNumberFormat } from './clean'
import { findStatementHeader, guessCategory } from './bankStatement'
import type { Transaction } from '../layers/finance/types'

interface Props {
  onClose: () => void
  onDone?: (count: number) => void
}

type Stage = 'upload' | 'map' | 'preview' | 'done'
type ColRole = 'date' | 'desc' | 'amount' | 'debit' | 'credit' | 'balance' | 'ignore'

const roleLabels: Record<ColRole, string> = {
  date: 'Tarih',
  desc: 'Açıklama',
  amount: 'Tutar (tek sütun)',
  debit: 'Borç (çıkış)',
  credit: 'Alacak (giriş)',
  balance: 'Bakiye',
  ignore: '— Kullanma —',
}
const ROLE_ORDER: ColRole[] = ['date', 'desc', 'amount', 'debit', 'credit', 'balance', 'ignore']

export default function BankStatementImport({ onClose, onDone }: Props) {
  const [stage, setStage] = useState<Stage>('upload')
  const [matrix, setMatrix] = useState<unknown[][]>([])
  const [headerRow, setHeaderRow] = useState(0)
  const [roles, setRoles] = useState<ColRole[]>([])
  const [accountName, setAccountName] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState('')

  const headers = matrix[headerRow] ?? []
  const dataRows = useMemo(() => matrix.slice(headerRow + 1).filter(r => r && r.some(c => c != null && String(c).trim() !== '')), [matrix, headerRow])

  const handleFile = async (file: File) => {
    setError('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const m = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
      setMatrix(m)
      setAccountName(wb.SheetNames[0])

      // Auto-detect header row + columns; user can correct.
      const found = findStatementHeader(m)
      const hr = found?.headerRow ?? m.findIndex(r => r && r.some(c => c != null && String(c).trim() !== ''))
      setHeaderRow(hr >= 0 ? hr : 0)
      const cols = (m[hr >= 0 ? hr : 0] ?? [])
      const auto: ColRole[] = cols.map((_, i) => {
        if (found) {
          const c = found.cols
          if (i === c.date) return 'date'
          if (i === c.desc) return 'desc'
          if (i === c.amount) return 'amount'
          if (i === c.debit) return 'debit'
          if (i === c.credit) return 'credit'
          if (i === c.balance) return 'balance'
        }
        return 'ignore'
      })
      setRoles(auto)
      setStage('map')
    } catch {
      setError('Dosya okunamadı. Geçerli bir .xlsx, .xls veya .csv dosyası seç.')
    }
  }

  // Re-derive default roles when the user changes the header row.
  const onHeaderRowChange = (newRow: number) => {
    setHeaderRow(newRow)
    const cols = matrix[newRow] ?? []
    setRoles(cols.map(() => 'ignore'))
  }

  const built = useMemo(() => {
    const col = (role: ColRole) => roles.indexOf(role)
    const dateCol = col('date'), descCol = col('desc')
    const amountCol = col('amount'), debitCol = col('debit'), creditCol = col('credit')
    const sampleCol = amountCol >= 0 ? amountCol : creditCol >= 0 ? creditCol : debitCol
    const hint = sampleCol >= 0 ? detectColumnNumberFormat(dataRows.map(r => r[sampleCol])) : 'auto'

    const rows = dataRows.map((r, index) => {
      const date = dateCol >= 0 ? parseTurkishDate(r[dateCol]) : null
      const description = descCol >= 0 ? String(r[descCol] ?? '').trim() : ''
      let amount: number | null = null
      if (amountCol >= 0) amount = parseTurkishNumber(r[amountCol], hint)
      else {
        const d = debitCol >= 0 ? (parseTurkishNumber(r[debitCol], hint) ?? 0) : 0
        const c = creditCol >= 0 ? (parseTurkishNumber(r[creditCol], hint) ?? 0) : 0
        if (d !== 0 || c !== 0) amount = c - Math.abs(d)
      }
      const ok = !!date && amount !== null && amount !== 0
      return { index, date, description, amount, ok }
    })
    return rows
  }, [dataRows, roles])

  const validRows = built.filter(b => b.ok)

  const commit = () => {
    let accountId = getFinanceState().accounts[0]?.id ?? ''
    if (!accountId) {
      const acc = { id: 'acc' + Date.now(), name: accountName || 'Banka Hesabı', iban: '', currency: 'TRY' as const, balance: 0 }
      addAccount(acc)
      accountId = acc.id
    }
    let n = 0
    for (const b of validRows) {
      const tx: Transaction = {
        id: 'stmt' + Date.now() + '-' + b.index,
        date: b.date!,
        description: b.description || 'Banka işlemi',
        amount: b.amount!,
        type: b.amount! < 0 ? 'expense' : 'income',
        category: guessCategory(b.description),
        accountId,
        invoiceId: null,
      }
      addTransaction(tx)
      n++
    }
    setImportedCount(n)
    setStage('done')
    onDone?.(n)
  }

  const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Modal title="Banka Ekstresi İçe Aktar" onClose={onClose} width="820px">
      {error && <div className="mb-4 rounded border border-crimson/30 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</div>}

      {stage === 'upload' && (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-line bg-surface-2 px-6 py-12 text-center transition-colors hover:border-crimson/40">
            <span className="text-sm font-medium text-ink">Banka ekstresi (.xlsx / .csv) seç veya bırak</span>
            <span className="mt-1 text-xs text-ink-mute">İş Bankası, Garanti, Ziraat, Yapı Kredi… Octo başlık satırını ve sütunları otomatik bulur, gerekirse düzeltirsin.</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>
      )}

      {stage === 'map' && (
        <div>
          {/* Header row picker — bank exports have junk rows above the real table */}
          <div className="mb-4 flex items-center gap-3">
            <span className="label text-ink-mute">Başlık satırı</span>
            <select value={headerRow} onChange={e => onHeaderRowChange(Number(e.target.value))}
              className="rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink">
              {matrix.slice(0, 25).map((r, i) => (
                <option key={i} value={i}>Satır {i + 1}: {(r ?? []).filter(c => c != null && String(c).trim() !== '').slice(0, 3).join(' · ').slice(0, 50) || '(boş)'}</option>
              ))}
            </select>
            <span className="text-xs text-ink-mute">Gerçek tablo başlığını seç</span>
          </div>

          <p className="mb-3 text-sm text-ink-soft">Sütunları eşleştir. Tek imzalı tutar sütunu varsa "Tutar"; ayrı çıkış/giriş varsa "Borç" ve "Alacak" seç:</p>

          <div className="max-h-[300px] overflow-y-auto rounded-card border border-line">
            <div className="grid grid-cols-[1fr_1fr] gap-px bg-line">
              <div className="bg-surface-2 px-4 py-2"><span className="label text-ink-mute">Ekstre Sütunu</span></div>
              <div className="bg-surface-2 px-4 py-2"><span className="label text-ink-mute">Rolü</span></div>
              {headers.map((h, col) => (
                <div key={col} className="contents">
                  <div className="bg-surface px-4 py-2.5">
                    <div className="text-sm text-ink">{String(h ?? '') || `Sütun ${col + 1}`}</div>
                    <div className="truncate text-xs text-ink-mute">{dataRows[0]?.[col] != null ? String(dataRows[0][col]) : '—'}</div>
                  </div>
                  <div className="bg-surface px-4 py-2.5">
                    <select value={roles[col] ?? 'ignore'}
                      onChange={e => { const next = [...roles]; next[col] = e.target.value as ColRole; setRoles(next) }}
                      className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink">
                      {ROLE_ORDER.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={() => setStage('preview')}
              disabled={roles.indexOf('date') < 0 || (roles.indexOf('amount') < 0 && roles.indexOf('debit') < 0 && roles.indexOf('credit') < 0)}
              className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              Önizle →
            </button>
          </div>
          {(roles.indexOf('date') < 0 || (roles.indexOf('amount') < 0 && roles.indexOf('debit') < 0 && roles.indexOf('credit') < 0)) && (
            <p className="mt-2 text-right text-xs text-ink-mute">En az bir Tarih ve bir tutar sütunu (Tutar ya da Borç/Alacak) seçilmeli.</p>
          )}
        </div>
      )}

      {stage === 'preview' && (
        <div>
          <div className="mb-3 flex gap-4 text-sm">
            <span className="text-positive">{validRows.length} geçerli işlem</span>
            {built.length - validRows.length > 0 && <span className="text-ink-mute">{built.length - validRows.length} atlanacak</span>}
          </div>
          <div className="max-h-[340px] overflow-auto rounded-card border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="px-3 py-2 text-left"><span className="label text-ink-mute">Tarih</span></th>
                  <th className="px-3 py-2 text-left"><span className="label text-ink-mute">Açıklama</span></th>
                  <th className="px-3 py-2 text-right"><span className="label text-ink-mute">Tutar</span></th>
                  <th className="px-3 py-2 text-left"><span className="label text-ink-mute">Kategori</span></th>
                </tr>
              </thead>
              <tbody>
                {built.map(b => (
                  <tr key={b.index} className={'border-t border-line ' + (!b.ok ? 'opacity-30' : '')}>
                    <td className="px-3 py-2 font-mono text-xs text-ink-soft">{b.date ?? '—'}</td>
                    <td className="px-3 py-2 text-ink">{b.description || '—'}</td>
                    <td className={'px-3 py-2 text-right font-mono text-xs ' + ((b.amount ?? 0) < 0 ? 'text-crimson' : 'text-positive')}>{b.amount != null ? fmt(b.amount) : '—'}</td>
                    <td className="px-3 py-2 text-xs text-ink-mute">{b.ok ? guessCategory(b.description) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between">
            <button onClick={() => setStage('map')} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">← Geri</button>
            <button onClick={commit} disabled={validRows.length === 0}
              className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {validRows.length} İşlemi Aktar
            </button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-positive/15 text-positive">✓</div>
          <p className="text-lg font-medium text-ink">{importedCount} işlem içe aktarıldı</p>
          <p className="mt-1 text-sm text-ink-mute">İşlemler nakit akışında ve son işlemlerde görünür.</p>
          <button onClick={onClose} className="mt-5 rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">Kapat</button>
        </div>
      )}
    </Modal>
  )
}
