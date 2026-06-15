// Octo — Muhasebe (General Ledger) Type Schema
// Schema-first, per the build principle: the Turkish accounting taxonomy is
// encoded at the type level. Double-entry is enforced structurally — a journal
// entry's lines must balance (sum of borç === sum of alacak).
//
// This is the Turkish chart of accounts (Tek Düzen Hesap Planı / TDHP), not a
// generic ledger. Encoding TDHP as machine-reasonable structured data is the
// core R&D claim: regulatory logic as typed data.

// ── Account classification ───────────────────────────────────────────────

// The five fundamental account classes, mapped to TDHP's numbered groups.
export type AccountType =
  | 'aktif'      // Asset (1xx, 2xx) — normal balance: borç (debit)
  | 'pasif'      // Liability (3xx, 4xx) — normal balance: alacak (credit)
  | 'ozkaynak'   // Equity (5xx) — normal balance: alacak (credit)
  | 'gelir'      // Income (6xx revenue side) — normal balance: alacak
  | 'gider'      // Expense (6xx/7xx cost side) — normal balance: borç
  | 'maliyet'    // Cost accounts (7xx) — normal balance: borç
  | 'nazim'      // Off-balance/memo (9xx) — normal balance: either

// Which side increases this account (its "normal" balance).
export type NormalSide = 'borc' | 'alacak'

// A single account in the chart of accounts.
export interface LedgerAccount {
  kod: string            // TDHP code, e.g. "120", "391", "600.01"
  ad: string             // account name, e.g. "Alıcılar"
  tip: AccountType
  normalTaraf: NormalSide
  ustHesap?: string      // parent account code (for the tree), e.g. "12" for "120"
  anaGrup: string        // top-level group digit, e.g. "1" (Dönen Varlıklar)
  // True for postable leaf accounts; false for group/header nodes (mizan rolls up).
  hareketGorur: boolean
}

// ── Journal entries (yevmiye) ────────────────────────────────────────────

// One line of a journal entry. Exactly one of borç / alacak is non-zero.
export interface JournalLine {
  hesapKodu: string      // references LedgerAccount.kod
  borc: number           // debit amount (0 if this is a credit line)
  alacak: number         // credit amount (0 if this is a debit line)
  aciklama?: string
}

// Source document kinds that can generate an entry (for traceability).
export type FisKaynak =
  | 'satis_faturasi'     // sales invoice
  | 'alis_faturasi'      // purchase invoice
  | 'tahsilat'           // collection (invoice settled, money in)
  | 'odeme'              // payment (invoice settled, money out)
  | 'banka'              // bank transaction
  | 'manuel'             // hand-entered

// A journal entry (yevmiye fişi) — a balanced set of debit/credit lines.
// INVARIANT: sum(borc) === sum(alacak). Enforced by the posting engine.
export interface JournalEntry {
  id: string
  tarih: string          // ISO date
  fisNo: number          // sequential entry number
  kaynak: FisKaynak
  kaynakId?: string      // id of the source invoice/transaction, if any
  aciklama: string
  satirlar: JournalLine[]
}

// ── Derived views ────────────────────────────────────────────────────────

// A row in the trial balance (mizan): cumulative debits/credits and net balance.
export interface MizanRow {
  hesapKodu: string
  hesapAdi: string
  tip: AccountType
  borcToplam: number
  alacakToplam: number
  borcBakiye: number     // net debit balance (0 if net credit)
  alacakBakiye: number   // net credit balance (0 if net debit)
}

// A posting in an account's ledger (defter-i kebir).
export interface DefterSatir {
  tarih: string
  fisNo: number
  aciklama: string
  borc: number
  alacak: number
  bakiye: number         // running balance (signed: + = debit side)
}

export interface LedgerState {
  entries: JournalEntry[]
  nextFisNo: number
}
