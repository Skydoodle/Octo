// Octo — Muhasebeleştirme (Posting Engine)
// Turns business events (invoices, settlements, bank movements) into balanced
// double-entry journal entries against the Turkish chart of accounts.
//
// The hard, defensible part is the ACCOUNT MAPPING: which TDHP account each
// event hits. These mappings follow standard Turkish practice. They are stated
// explicitly so they can be reviewed and validated against a real muhasebeci's
// expectations — getting them wrong means silently wrong books, so they are
// conservative and auditable rather than clever.

import type { Invoice, Transaction } from '../types'
import type { JournalEntry, JournalLine, FisKaynak } from './types'

// Round to 2 decimals to avoid floating-point dust breaking the balance check.
const r2 = (n: number) => Math.round(n * 100) / 100

// A debit line.
const borc = (hesapKodu: string, tutar: number, aciklama?: string): JournalLine => ({
  hesapKodu, borc: r2(tutar), alacak: 0, aciklama,
})
// A credit line.
const alacak = (hesapKodu: string, tutar: number, aciklama?: string): JournalLine => ({
  hesapKodu, borc: 0, alacak: r2(tutar), aciklama,
})

// ── Invariant ────────────────────────────────────────────────────────────

export interface BalanceCheck {
  balanced: boolean
  borcToplam: number
  alacakToplam: number
  fark: number
}

// The double-entry invariant: total debits must equal total credits.
export function checkBalance(lines: JournalLine[]): BalanceCheck {
  const borcToplam = r2(lines.reduce((s, l) => s + l.borc, 0))
  const alacakToplam = r2(lines.reduce((s, l) => s + l.alacak, 0))
  const fark = r2(borcToplam - alacakToplam)
  return { balanced: Math.abs(fark) < 0.01, borcToplam, alacakToplam, fark }
}

// ── Account mapping helpers ──────────────────────────────────────────────

// Per-party sub-accounts keep cari (current-account) tracking precise:
// 120.<taxId> for a customer under Alıcılar, 320.<taxId> for a supplier.
function customerAccount(taxId: string): string {
  return taxId ? `120.${taxId}` : '120'
}
function supplierAccount(taxId: string): string {
  return taxId ? `320.${taxId}` : '320'
}

// Map a free-text expense category to a TDHP general-administration sub-account.
// Conservative default: 770 Genel Yönetim Giderleri. Specific known categories
// route to clearer accounts. Unknown -> 770 (auditable, never silently dropped).
function expenseAccount(category: string): string {
  const c = (category || '').toLocaleLowerCase('tr')
  if (c.includes('personel') || c.includes('maaş') || c.includes('maas')) return '770.01' // Personel
  if (c.includes('kira')) return '770.02'                                                  // Kira
  if (c.includes('teknoloji') || c.includes('yazılım') || c.includes('bulut')) return '770.03'
  if (c.includes('pazarlama') || c.includes('reklam')) return '760'                        // Pazarlama
  if (c.includes('ar-ge') || c.includes('arge')) return '750'                              // Ar-Ge
  return '770' // Genel Yönetim Giderleri (default bucket)
}

// ── Postings ─────────────────────────────────────────────────────────────

// SALES invoice (satış faturası):
//   Borç  120 Alıcılar            (total, incl. VAT)  — receivable from customer
//   Alacak 600 Yurtiçi Satışlar   (net)               — revenue
//   Alacak 391 Hesaplanan KDV     (vat)               — output VAT owed
export function postSalesInvoice(inv: Invoice): JournalLine[] {
  const lines: JournalLine[] = [
    borc(customerAccount(inv.contactTaxId), inv.total, inv.contactName),
    alacak('600', inv.amount, 'Yurtiçi satış'),
  ]
  if (inv.vatAmount > 0) lines.push(alacak('391', inv.vatAmount, `KDV %${inv.vatRate}`))
  return lines
}

// PURCHASE invoice (alış faturası):
//   Borç  153/770 ...             (net)               — expense or inventory
//   Borç  191 İndirilecek KDV     (vat)               — input VAT deductible
//   Alacak 320 Satıcılar          (total, incl. VAT)  — payable to supplier
export function postPurchaseInvoice(inv: Invoice): JournalLine[] {
  const lines: JournalLine[] = [
    borc(expenseAccount(inv.description), inv.amount, inv.description || 'Alış'),
  ]
  if (inv.vatAmount > 0) lines.push(borc('191', inv.vatAmount, `İnd. KDV %${inv.vatRate}`))
  lines.push(alacak(supplierAccount(inv.contactTaxId), inv.total, inv.contactName))
  return lines
}

// Settling a SALES invoice = collection (tahsilat). Money in, receivable cleared.
//   Borç  102 Bankalar      (total)
//   Alacak 120 Alıcılar     (total)
export function postCollection(inv: Invoice): JournalLine[] {
  return [
    borc('102', inv.total, 'Tahsilat'),
    alacak(customerAccount(inv.contactTaxId), inv.total, inv.contactName),
  ]
}

// Settling a PURCHASE invoice = payment (ödeme). Money out, payable cleared.
//   Borç  320 Satıcılar     (total)
//   Alacak 102 Bankalar     (total)
export function postPayment(inv: Invoice): JournalLine[] {
  return [
    borc(supplierAccount(inv.contactTaxId), inv.total, inv.contactName),
    alacak('102', inv.total, 'Ödeme'),
  ]
}

// A standalone bank transaction not tied to an invoice (manual income/expense).
//   income  -> Borç 102 Bankalar / Alacak 600 (or 649 other)
//   expense -> Borç 770 (mapped) / Alacak 102 Bankalar
export function postBankTransaction(tx: Transaction): JournalLine[] {
  const amt = Math.abs(tx.amount)
  if (tx.type === 'income') {
    return [borc('102', amt, tx.description), alacak('649', amt, tx.category || 'Diğer gelir')]
  }
  if (tx.type === 'expense') {
    return [borc(expenseAccount(tx.category), amt, tx.description), alacak('102', amt, tx.category)]
  }
  // transfer: bank-to-bank, net-zero to P&L. Modeled as 102/102 placeholder.
  return [borc('102', amt, tx.description), alacak('102', amt, 'Virman')]
}

// ── Entry assembly ───────────────────────────────────────────────────────

let assemblyCounter = 0

// Wrap balanced lines into a JournalEntry. Throws if the lines don't balance —
// a hard guard so an unbalanced entry can never enter the ledger.
export function makeEntry(
  tarih: string,
  kaynak: FisKaynak,
  aciklama: string,
  lines: JournalLine[],
  fisNo: number,
  kaynakId?: string,
): JournalEntry {
  const check = checkBalance(lines)
  if (!check.balanced) {
    throw new Error(
      `Yevmiye dengesizliği (${aciklama}): borç ${check.borcToplam} ≠ alacak ${check.alacakToplam}, fark ${check.fark}`,
    )
  }
  return {
    id: 'je' + Date.now() + '_' + (assemblyCounter++),
    tarih,
    fisNo,
    kaynak,
    kaynakId,
    aciklama,
    satirlar: lines,
  }
}
