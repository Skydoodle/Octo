// Octo — Excel Import — Row builder & validator
// Turns mapped, cleaned cells into Octo Invoice objects. Derives missing
// values where possible (net <-> total <-> KDV) and flags problem rows.

import type { Invoice } from '../layers/finance/types'
import { parseTurkishNumber, parseTurkishDate, parseKdvRate, detectColumnNumberFormat, type NumberFormatHint } from './clean'
import type { InvoiceField, ParsedSheet } from './automap'

export interface BuiltRow {
  index: number
  invoice: Invoice | null
  errors: string[]
  warnings: string[]
  raw: Record<string, string>   // field -> displayed cleaned value
}

function colFor(mapping: InvoiceField[], field: InvoiceField): number {
  return mapping.indexOf(field)
}

export function buildRows(
  sheet: ParsedSheet,
  mapping: InvoiceField[],
  defaultType: 'sales' | 'purchase',
): BuiltRow[] {
  const { rows } = sheet

  // Pre-compute number-format hints per mapped numeric column
  const numericFields: InvoiceField[] = ['amount', 'vatAmount', 'total', 'vatRate']
  const hints: Partial<Record<InvoiceField, NumberFormatHint>> = {}
  for (const f of numericFields) {
    const col = colFor(mapping, f)
    if (col >= 0) hints[f] = detectColumnNumberFormat(rows.map(r => r[col]))
  }
  const num = (r: unknown[], f: InvoiceField): number | null => {
    const col = colFor(mapping, f)
    if (col < 0) return null
    return parseTurkishNumber(r[col], hints[f] ?? 'auto')
  }
  const str = (r: unknown[], f: InvoiceField): string => {
    const col = colFor(mapping, f)
    if (col < 0) return ''
    const v = r[col]
    return v === null || v === undefined ? '' : String(v).trim()
  }

  return rows.map((r, index) => {
    const errors: string[] = []
    const warnings: string[] = []

    const contactName = str(r, 'contactName')
    if (!contactName) errors.push('Müşteri/tedarikçi adı boş')

    const issueCol = colFor(mapping, 'issueDate')
    const issueDate = issueCol >= 0 ? parseTurkishDate(r[issueCol]) : null
    if (issueCol >= 0 && !issueDate) warnings.push('Tarih okunamadı')

    const dueCol = colFor(mapping, 'dueDate')
    const dueDate = dueCol >= 0 ? parseTurkishDate(r[dueCol]) : null

    // Money: reconcile net / vatRate / vatAmount / total
    let amount = num(r, 'amount')
    let vatAmount = num(r, 'vatAmount')
    let total = num(r, 'total')
    let vatRate = parseKdvRate(str(r, 'vatRate'))

    // Derivation rules
    if (amount !== null && vatRate !== null && vatAmount === null) {
      vatAmount = amount * (vatRate / 100)
    }
    if (amount !== null && vatAmount !== null && total === null) {
      total = amount + vatAmount
    }
    if (total !== null && vatRate !== null && amount === null) {
      amount = total / (1 + vatRate / 100)
      vatAmount = total - amount
    }
    if (total !== null && amount !== null && vatAmount === null) {
      vatAmount = total - amount
    }
    if (amount !== null && total !== null && vatRate === null && amount > 0) {
      vatRate = Math.round((total / amount - 1) * 100)
    }
    if (amount === null && total !== null && vatAmount === null) {
      // only a total given, assume it already includes KDV at 20 unless rate says otherwise
      amount = total
      vatAmount = 0
      warnings.push('KDV ayrıştırılamadı; tutar KDV dahil sayıldı')
    }

    if (amount === null && total === null) {
      errors.push('Tutar okunamadı')
    }

    const finalAmount = amount ?? total ?? 0
    const finalVat = vatAmount ?? 0
    const finalTotal = total ?? finalAmount + finalVat
    const finalRate = vatRate ?? 20

    let type: 'sales' | 'purchase' = defaultType
    const typeStr = str(r, 'type').toLocaleLowerCase('tr-TR')
    if (typeStr) {
      if (/(alis|alış|al|purchase|gider|tedarik)/.test(typeStr)) type = 'purchase'
      else if (/(satis|satış|sat|sale|gelir|musteri)/.test(typeStr)) type = 'sales'
    }

    const raw: Record<string, string> = {
      contactName,
      issueDate: issueDate ?? '',
      amount: finalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
      vatAmount: finalVat.toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
      total: finalTotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
      type,
    }

    const invoice: Invoice | null = errors.length === 0 ? {
      id: 'imp' + Date.now() + '-' + index,
      type,
      contactName,
      contactTaxId: str(r, 'contactTaxId'),
      amount: finalAmount,
      vatAmount: finalVat,
      total: finalTotal,
      vatRate: finalRate,
      currency: 'TRY',
      issueDate: issueDate ?? new Date().toISOString().slice(0, 10),
      dueDate: dueDate ?? issueDate ?? new Date().toISOString().slice(0, 10),
      status: 'sent',
      description: str(r, 'description'),
    } : null

    return { index, invoice, errors, warnings, raw }
  })
}
