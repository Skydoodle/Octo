// Octo — Bank Statement Import
// Real Turkish bank exports (İş, Garanti, Ziraat, Yapı Kredi, Akbank) are messy:
// junk header rows with logos/account info, separate Borç/Alacak columns instead
// of one signed amount, running-balance columns, reference-heavy descriptions.
// This finds the real table inside that noise and produces clean transactions.

import type { Transaction } from '../layers/finance/types'
import { normalizeHeader, parseTurkishNumber, parseTurkishDate, detectColumnNumberFormat } from './clean'

// Header keywords that mark the real transaction table's columns.
const COLUMN_KEYS = {
  date: ['tarih', 'islemtarihi', 'valor', 'valör', 'date'],
  desc: ['aciklama', 'açıklama', 'islem', 'işlem', 'detay', 'description', 'aciklamadetay'],
  amount: ['tutar', 'islemtutari', 'amount', 'miktar'],
  debit: ['borc', 'borç', 'cikis', 'çıkış', 'debit', 'gidenmiktar'],
  credit: ['alacak', 'giris', 'giriş', 'credit', 'gelenmiktar'],
  balance: ['bakiye', 'kalan', 'balance', 'yenibakiye'],
}

interface ColMap {
  date: number
  desc: number
  amount: number
  debit: number
  credit: number
  balance: number
}

// Score a row as a potential header: how many known column keywords it contains.
function scoreHeaderRow(row: unknown[]): { score: number; cols: ColMap } {
  const cells = row.map(c => normalizeHeader(String(c ?? '')))
  const find = (keys: string[], exclude: number[] = []) =>
    cells.findIndex((c, i) => c && !exclude.includes(i) && keys.some(k => c.includes(normalizeHeader(k))))

  // Date is resolved first; desc must not reclaim the date column (e.g. a header
  // "İşlem Tarihi" normalizes to islemtarihi, which also contains 'islem').
  const dateCol = find(COLUMN_KEYS.date)
  const cols: ColMap = {
    date: dateCol,
    desc: find(COLUMN_KEYS.desc, [dateCol]),
    amount: find(COLUMN_KEYS.amount),
    debit: find(COLUMN_KEYS.debit),
    credit: find(COLUMN_KEYS.credit),
    balance: find(COLUMN_KEYS.balance),
  }
  // A valid statement header needs a date, a description, and some amount column.
  let score = 0
  if (cols.date >= 0) score += 2
  if (cols.desc >= 0) score += 2
  if (cols.amount >= 0) score += 1
  if (cols.debit >= 0) score += 1
  if (cols.credit >= 0) score += 1
  if (cols.balance >= 0) score += 1
  return { score, cols }
}

// Find the real header row within the first ~25 rows of a noisy export.
export function findStatementHeader(matrix: unknown[][]): { headerRow: number; cols: ColMap } | null {
  let best = { score: 0, cols: null as ColMap | null, row: -1 }
  const limit = Math.min(matrix.length, 25)
  for (let i = 0; i < limit; i++) {
    const { score, cols } = scoreHeaderRow(matrix[i] ?? [])
    const hasDate = cols.date >= 0
    const hasAmount = cols.amount >= 0 || cols.debit >= 0 || cols.credit >= 0
    if (score > best.score && hasDate && hasAmount) {
      best = { score, cols, row: i }
    }
  }
  if (best.row < 0 || !best.cols) return null
  return { headerRow: best.row, cols: best.cols }
}

// Is this matrix a bank statement at all? (used by the universal router)
export function looksLikeStatement(matrix: unknown[][]): boolean {
  const found = findStatementHeader(matrix)
  if (!found) return false
  // Needs a date column AND a debit/credit or amount column.
  const { cols } = found
  return cols.date >= 0 && (cols.amount >= 0 || cols.debit >= 0 || cols.credit >= 0)
}

// ── Category guessing from the description text ──────────────────────────

const CATEGORY_RULES: { cat: string; keys: string[] }[] = [
  { cat: 'Maaş', keys: ['maas', 'maaş', 'bordro', 'ucret', 'ücret', 'personel'] },
  { cat: 'Kira', keys: ['kira'] },
  { cat: 'SGK', keys: ['sgk', 'sigorta prim', 'sosyal guvenlik'] },
  { cat: 'Vergi', keys: ['vergi', 'kdv', 'muhtasar', 'gib', 'beyanname', 'damga'] },
  { cat: 'Banka Masrafı', keys: ['masraf', 'komisyon', 'islem ucreti', 'havale ucreti', 'eft ucreti', 'bsmv'] },
  { cat: 'Faiz', keys: ['faiz'] },
  { cat: 'Elektrik/Su/Doğalgaz', keys: ['elektrik', 'su faturasi', 'dogalgaz', 'enerji', 'aski', 'iski'] },
  { cat: 'Telekom', keys: ['telefon', 'turkcell', 'vodafone', 'turk telekom', 'internet'] },
  { cat: 'Tahsilat', keys: ['tahsilat', 'gelen havale', 'gelen eft', 'odeme alindi'] },
  { cat: 'Ödeme', keys: ['odeme', 'giden havale', 'giden eft', 'fatura odeme'] },
]

export function guessCategory(description: string): string {
  const n = normalizeHeader(description)
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some(k => n.includes(normalizeHeader(k)))) return rule.cat
  }
  return 'Genel'
}

// ── Parse the statement into transactions ────────────────────────────────

export interface ParsedStatement {
  transactions: Omit<Transaction, 'id' | 'accountId'>[]
  skipped: number
  detectedColumns: string[]
}

export function parseBankStatement(matrix: unknown[][]): ParsedStatement | null {
  const found = findStatementHeader(matrix)
  if (!found) return null
  const { headerRow, cols } = found

  const dataRows = matrix.slice(headerRow + 1)

  // Decide number format from the first amount-bearing column.
  const sampleCol = cols.amount >= 0 ? cols.amount : cols.credit >= 0 ? cols.credit : cols.debit
  const hint = sampleCol >= 0 ? detectColumnNumberFormat(dataRows.map(r => r?.[sampleCol])) : 'auto'

  const transactions: Omit<Transaction, 'id' | 'accountId'>[] = []
  let skipped = 0

  for (const r of dataRows) {
    if (!r || r.every(c => c === null || c === undefined || String(c).trim() === '')) continue

    const date = cols.date >= 0 ? parseTurkishDate(r[cols.date]) : null
    if (!date) { skipped++; continue }

    const description = cols.desc >= 0 ? String(r[cols.desc] ?? '').trim() : ''

    // Resolve the signed amount: either a single signed column, or separate
    // Borç (out, negative) / Alacak (in, positive) columns.
    let amount: number | null = null
    if (cols.amount >= 0) {
      amount = parseTurkishNumber(r[cols.amount], hint)
    } else {
      const debit = cols.debit >= 0 ? (parseTurkishNumber(r[cols.debit], hint) ?? 0) : 0
      const credit = cols.credit >= 0 ? (parseTurkishNumber(r[cols.credit], hint) ?? 0) : 0
      if (debit !== 0 || credit !== 0) amount = credit - Math.abs(debit)
    }
    if (amount === null || amount === 0) { skipped++; continue }

    transactions.push({
      date,
      description: description || 'Banka işlemi',
      amount,
      type: amount < 0 ? 'expense' : 'income',
      category: guessCategory(description),
      invoiceId: null,
    })
  }

  const detectedColumns = Object.entries(cols)
    .filter(([, v]) => v >= 0)
    .map(([k]) => k)

  return { transactions, skipped, detectedColumns }
}
