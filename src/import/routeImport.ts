// Octo — Universal Import Router
// Takes any Excel/CSV file, classifies every sheet by its headers, and routes
// each to the correct store — invoices, bank accounts, transactions,
// beyannameler, or caris. The user drops a file; Octo figures out the rest.

import * as XLSX from 'xlsx'
import { parseSheetMatrix, autoMap, type ParsedSheet } from './automap'
import { buildRows } from './buildRows'
import { detectSheetKind, buildAccounts, buildTransactions, type SheetKind } from './buildFinanceExtras'
import { autoMapTax } from './automapTax'
import { buildTaxRows } from './buildTaxRows'
import {
  addInvoice, settleInvoice, addAccount, addTransaction, getFinanceState,
} from '../layers/finance/financeStore'
import { addBeyanname } from '../layers/tax/taxStore'
import { addCari } from '../layers/finance/cari/cariStore'
import { normalizeHeader } from './clean'
import { looksLikeStatement, parseBankStatement } from './bankStatement'
import type { Cari, CariTip } from '../layers/finance/cari/types'

export interface ImportResult {
  kind: SheetKind
  sheetName: string
  count: number
}

export interface ImportSummary {
  results: ImportResult[]
  total: number
  unknownSheets: string[]
}

// Read a File into an array of named parsed sheets (plus raw matrix for
// statement detection, which needs to see junk rows above the real header).
async function readWorkbook(file: File): Promise<{ name: string; sheet: ParsedSheet; matrix: unknown[][] }[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })
  return wb.SheetNames.map(name => {
    const ws = wb.Sheets[name]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
    return { name, sheet: parseSheetMatrix(matrix), matrix }
  })
}

// Build caris from a cari sheet.
function importCariler(sheet: ParsedSheet): number {
  const hs = sheet.headers.map(normalizeHeader)
  const col = (...keys: string[]) => hs.findIndex(h => keys.some(k => h.includes(k)))
  const cUnvan = col('unvan', 'ad', 'isim', 'musteri', 'tedarikci', 'firma')
  const cVkn = col('vkn', 'tckn', 'vergino')
  const cTel = col('telefon', 'tel', 'gsm')
  const cAdres = col('adres')
  const cVd = col('vergidairesi')
  const cYetkili = col('yetkili', 'ilgili')
  const cEposta = col('eposta', 'email', 'mail')
  const cTip = col('tip', 'tur')

  let n = 0
  for (const r of sheet.rows) {
    const unvan = cUnvan >= 0 ? String(r[cUnvan] ?? '').trim() : ''
    const vkn = cVkn >= 0 ? String(r[cVkn] ?? '').trim() : ''
    if (!unvan && !vkn) continue
    const tipStr = cTip >= 0 ? normalizeHeader(String(r[cTip] ?? '')) : ''
    const tip: CariTip = tipStr.includes('tedarik') ? 'tedarikci' : tipStr.includes('her') ? 'her_ikisi' : 'musteri'
    const cari: Cari = {
      id: 'cari-imp-' + Date.now() + '-' + n,
      unvan: unvan || 'İsimsiz',
      vkn,
      tip,
      telefon: cTel >= 0 ? String(r[cTel] ?? '').trim() : '',
      adres: cAdres >= 0 ? String(r[cAdres] ?? '').trim() : '',
      vergiDairesi: cVd >= 0 ? String(r[cVd] ?? '').trim() : '',
      yetkili: cYetkili >= 0 ? String(r[cYetkili] ?? '').trim() : '',
      eposta: cEposta >= 0 ? String(r[cEposta] ?? '').trim() : '',
      olusturulma: new Date().toISOString().slice(0, 10),
    }
    addCari(cari)
    n++
  }
  return n
}

// Import an invoice sheet, auto-settling paid invoices.
function importInvoices(sheet: ParsedSheet, accountId: string): number {
  const mapping = autoMap(sheet)
  const rows = buildRows(sheet, mapping, 'sales')
  let n = 0
  for (const b of rows) {
    if (!b.invoice) continue
    const wasPaid = b.invoice.status === 'paid'
    const inv = wasPaid ? { ...b.invoice, status: 'sent' as const } : b.invoice
    addInvoice(inv)
    if (wasPaid) settleInvoice(inv.id, accountId || undefined)
    n++
  }
  return n
}

function importAccounts(sheet: ParsedSheet): { count: number; firstId: string } {
  const accs = buildAccounts(sheet)
  let firstId = ''
  let n = 0
  for (const a of accs) {
    if (a.account) { addAccount(a.account); if (!firstId) firstId = a.account.id; n++ }
  }
  return { count: n, firstId }
}

function importTransactions(sheet: ParsedSheet, accountId: string): number {
  const txs = buildTransactions(sheet, accountId)
  let n = 0
  for (const t of txs) { if (t.transaction) { addTransaction(t.transaction); n++ } }
  return n
}

function importBeyannameler(sheet: ParsedSheet): number {
  const mapping = autoMapTax(sheet)
  const rows = buildTaxRows(sheet, mapping)
  let n = 0
  for (const b of rows) { if (b.beyanname) { addBeyanname(b.beyanname); n++ } }
  return n
}

// Import a bank statement (messy real-world export) into transactions.
function importStatement(matrix: unknown[][], accountId: string): number {
  const parsed = parseBankStatement(matrix)
  if (!parsed) return 0
  let n = 0
  for (const t of parsed.transactions) {
    addTransaction({ ...t, id: 'stmt' + Date.now() + '-' + n, accountId })
    n++
  }
  return n
}

// Main entry: classify and route every sheet in the file. Order matters —
// accounts first (so settlements/transactions have an account), then the rest.
export async function routeImport(file: File): Promise<ImportSummary> {
  const sheets = await readWorkbook(file)
  const results: ImportResult[] = []
  const unknownSheets: string[] = []

  // Pass 1: accounts, to establish a target account id.
  let accountId = getFinanceState().accounts[0]?.id ?? ''
  for (const { name, sheet } of sheets) {
    if (detectSheetKind(sheet) === 'accounts') {
      const { count, firstId } = importAccounts(sheet)
      if (!accountId && firstId) accountId = firstId
      if (count) results.push({ kind: 'accounts', sheetName: name, count })
    }
  }

  // Pass 2: caris before invoices, so invoices can match existing cards.
  for (const { name, sheet } of sheets) {
    if (detectSheetKind(sheet) === 'cariler') {
      const count = importCariler(sheet)
      if (count) results.push({ kind: 'cariler', sheetName: name, count })
    }
  }

  // Pass 3: everything else. Bank statements are checked first because their
  // messy headers would otherwise fall through as 'unknown'.
  for (const { name, sheet, matrix } of sheets) {
    const kind = detectSheetKind(sheet)
    if (kind === 'accounts' || kind === 'cariler') continue

    // A clean classification wins; otherwise try the bank-statement parser.
    if (kind === 'invoices') {
      results.push({ kind, sheetName: name, count: importInvoices(sheet, accountId) })
    } else if (kind === 'transactions') {
      results.push({ kind, sheetName: name, count: importTransactions(sheet, accountId) })
    } else if (kind === 'beyannameler') {
      results.push({ kind, sheetName: name, count: importBeyannameler(sheet) })
    } else if (looksLikeStatement(matrix)) {
      const count = importStatement(matrix, accountId)
      if (count) results.push({ kind: 'transactions', sheetName: name, count })
      else unknownSheets.push(name)
    } else {
      unknownSheets.push(name)
    }
  }

  const total = results.reduce((s, r) => s + r.count, 0)
  return { results, total, unknownSheets }
}

export const kindLabels: Record<SheetKind, string> = {
  invoices: 'fatura',
  accounts: 'banka hesabı',
  transactions: 'işlem',
  beyannameler: 'beyanname',
  cariler: 'cari',
  unknown: 'tanınmayan',
}

// ── Dry-run analysis (classify without importing) ────────────────────────
// Lets the dashboard show "I found X — is that right?" before committing, and
// offer a manual override when detection is uncertain.

export interface SheetAnalysis {
  sheetName: string
  kind: SheetKind
  rowCount: number
  isStatement: boolean
}

export interface FileAnalysis {
  sheets: SheetAnalysis[]
  // The single dominant kind, if the file is clearly one thing (for the picker).
  primaryKind: SheetKind
}

export async function analyzeFile(file: File): Promise<FileAnalysis> {
  const sheets = await readWorkbook(file)
  const analyses: SheetAnalysis[] = sheets.map(({ name, sheet, matrix }) => {
    let kind = detectSheetKind(sheet)
    const isStatement = kind === 'unknown' && looksLikeStatement(matrix)
    if (isStatement) kind = 'transactions'
    return { sheetName: name, kind, rowCount: sheet.rows.length, isStatement }
  })

  // Primary kind = the kind covering the most rows.
  const byKind = new Map<SheetKind, number>()
  for (const a of analyses) byKind.set(a.kind, (byKind.get(a.kind) ?? 0) + a.rowCount)
  let primaryKind: SheetKind = 'unknown'
  let best = -1
  for (const [k, n] of byKind) {
    if (k !== 'unknown' && n > best) { primaryKind = k; best = n }
  }
  return { sheets: analyses, primaryKind }
}
