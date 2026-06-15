// Octo — Import — Sheet classification + account/transaction builders
// Enables one workbook to populate the whole finance layer: a Faturalar sheet,
// a Banka Hesapları sheet, and an İşlemler sheet are each detected by their
// headers and routed to the right builder.

import type { BankAccount, Transaction } from '../layers/finance/types'
import { normalizeHeader, parseTurkishNumber, parseTurkishDate, detectColumnNumberFormat } from './clean'
import type { ParsedSheet } from './automap'

export type SheetKind = 'invoices' | 'accounts' | 'transactions' | 'beyannameler' | 'cariler' | 'unknown'

// Classify a sheet by what its headers look like. Used to route each sheet in a
// multi-sheet workbook to the correct importer without the user choosing.
export function detectSheetKind(sheet: ParsedSheet): SheetKind {
  const hs = sheet.headers.map(normalizeHeader)
  const has = (...keys: string[]) => keys.some(k => hs.some(h => h.includes(k)))

  // Bank account: IBAN + balance/currency, no invoice/tax markers
  if (has('iban') && has('bakiye', 'tutar', 'parabirimi', 'currency')) return 'accounts'
  // Beyanname: tax-specific
  if (has('beyanname', 'matrah', 'beyannameturu') || (has('donem') && has('vergi'))) return 'beyannameler'
  // Cari: contact card — name + tax id + contact details, but NO amounts/dates
  // (that's what separates a cari list from an invoice list).
  if (
    has('vkn', 'tckn', 'unvan', 'cari') &&
    has('telefon', 'adres', 'yetkili', 'vergidairesi', 'eposta') &&
    !has('tutar', 'toplam', 'kdv', 'faturatarihi')
  ) return 'cariler'
  // Invoice: contact + amounts + (vat or invoice-date)
  if (has('vkn', 'tckn', 'musteri', 'cari', 'tedarikci') && has('tutar', 'toplam', 'kdv')) return 'invoices'
  // Transaction: a date + an amount + a description, bank-statement-like
  if (has('tarih', 'date') && has('tutar', 'islem', 'aciklama', 'amount') && !has('vkn', 'matrah')) return 'transactions'
  return 'unknown'
}

// ── Bank account builder ─────────────────────────────────────────────────

export interface BuiltAccount {
  index: number
  account: BankAccount | null
  errors: string[]
}

const accHints: { key: keyof BankAccount | 'currency'; words: string[] }[] = [
  { key: 'name', words: ['hesapadi', 'hesap', 'banka', 'ad', 'isim'] },
  { key: 'iban', words: ['iban', 'hesapno'] },
  { key: 'currency', words: ['parabirimi', 'currency', 'dovizcinsi', 'doviz'] },
  { key: 'balance', words: ['bakiye', 'tutar', 'mevcut', 'balance'] },
]

function colByWords(headers: string[], words: string[]): number {
  const hs = headers.map(normalizeHeader)
  for (let i = 0; i < hs.length; i++) if (words.some(w => hs[i].includes(w))) return i
  return -1
}

function normalizeCurrency(s: string): 'TRY' | 'USD' | 'EUR' {
  const n = (s || '').toUpperCase()
  if (n.includes('USD') || n.includes('DOLAR') || n.includes('$')) return 'USD'
  if (n.includes('EUR') || n.includes('AVRO') || n.includes('€')) return 'EUR'
  return 'TRY'
}

export function buildAccounts(sheet: ParsedSheet): BuiltAccount[] {
  const nameCol = colByWords(sheet.headers, accHints[0].words)
  const ibanCol = colByWords(sheet.headers, accHints[1].words)
  const curCol = colByWords(sheet.headers, accHints[2].words)
  const balCol = colByWords(sheet.headers, accHints[3].words)
  const balHint = balCol >= 0 ? detectColumnNumberFormat(sheet.rows.map(r => r[balCol])) : 'auto'

  return sheet.rows.map((r, index) => {
    const errors: string[] = []
    const name = nameCol >= 0 ? String(r[nameCol] ?? '').trim() : ''
    const iban = ibanCol >= 0 ? String(r[ibanCol] ?? '').trim().replace(/\s+/g, ' ') : ''
    const balance = balCol >= 0 ? (parseTurkishNumber(r[balCol], balHint) ?? 0) : 0
    const currency = curCol >= 0 ? normalizeCurrency(String(r[curCol] ?? '')) : 'TRY'
    if (!name && !iban) errors.push('Hesap adı ve IBAN boş')

    const account: BankAccount | null = errors.length === 0 ? {
      id: 'acc' + Date.now() + '-' + index,
      name: name || 'Banka Hesabı',
      iban,
      currency,
      balance,
    } : null
    return { index, account, errors }
  })
}

// ── Transaction builder ──────────────────────────────────────────────────

export interface BuiltTransaction {
  index: number
  transaction: Transaction | null
  errors: string[]
}

export function buildTransactions(sheet: ParsedSheet, accountId: string): BuiltTransaction[] {
  const dateCol = colByWords(sheet.headers, ['tarih', 'date', 'islemtarihi'])
  const descCol = colByWords(sheet.headers, ['aciklama', 'islem', 'description', 'detay'])
  const amountCol = colByWords(sheet.headers, ['tutar', 'amount', 'islemtutari'])
  const catCol = colByWords(sheet.headers, ['kategori', 'category', 'tur', 'tip'])
  const amountHint = amountCol >= 0 ? detectColumnNumberFormat(sheet.rows.map(r => r[amountCol])) : 'auto'

  return sheet.rows.map((r, index) => {
    const errors: string[] = []
    const date = dateCol >= 0 ? parseTurkishDate(r[dateCol]) : null
    const description = descCol >= 0 ? String(r[descCol] ?? '').trim() : ''
    const amount = amountCol >= 0 ? parseTurkishNumber(r[amountCol], amountHint) : null
    const category = catCol >= 0 ? String(r[catCol] ?? '').trim() : 'Genel'

    if (amount === null) errors.push('Tutar okunamadı')
    if (!date) errors.push('Tarih okunamadı')

    // Sign convention: negative amount = expense (money out), positive = income.
    const type: Transaction['type'] = (amount ?? 0) < 0 ? 'expense' : 'income'

    const transaction: Transaction | null = errors.length === 0 ? {
      id: 'imptx' + Date.now() + '-' + index,
      date: date!,
      description: description || category,
      amount: amount!,
      type,
      category: category || 'Genel',
      accountId,
      invoiceId: null,
    } : null
    return { index, transaction, errors }
  })
}
