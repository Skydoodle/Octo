// Octo — Muhasebe (Ledger) Store
// Holds journal entries, persists them, and derives the trial balance (mizan)
// and per-account ledgers (defter-i kebir). Like the other stores it uses
// useSyncExternalStore so components stay in sync.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../../shared/store/persist'
import { getAccount, accountName, TDHP } from './tdhp'
import type { JournalEntry, LedgerState, MizanRow, DefterSatir, AccountType } from './types'

const KEY = 'ledger'

const emptyState: LedgerState = { entries: [], nextFisNo: 1 }

let state: LedgerState = loadOrSeed<LedgerState>(KEY, emptyState)

const listeners = new Set<() => void>()
function emit() {
  save(KEY, state)
  listeners.forEach(l => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function getLedgerState(): LedgerState {
  return state
}

export function useLedgerStore(): LedgerState {
  return useSyncExternalStore(subscribe, getLedgerState, getLedgerState)
}

// Next sequential fiş number (yevmiye sıra no), without mutating state.
export function peekNextFisNo(): number {
  return state.nextFisNo
}

// Append a journal entry that already carries its fişNo (from the posting engine).
export function postEntry(entry: JournalEntry) {
  state = {
    entries: [entry, ...state.entries],
    nextFisNo: Math.max(state.nextFisNo, entry.fisNo) + 1,
  }
  emit()
}

// Append several entries atomically (e.g. when bulk-posting existing data).
export function postEntries(entries: JournalEntry[]) {
  if (entries.length === 0) return
  const maxFis = entries.reduce((m, e) => Math.max(m, e.fisNo), state.nextFisNo - 1)
  state = {
    entries: [...entries, ...state.entries],
    nextFisNo: maxFis + 1,
  }
  emit()
}

// Remove entries that came from a given source document (used when re-posting).
export function removeEntriesBySource(kaynakId: string) {
  state = { ...state, entries: state.entries.filter(e => e.kaynakId !== kaynakId) }
  emit()
}

export function clearLedger() {
  state = emptyState
  emit()
}

// ── Derived: Mizan (trial balance) ───────────────────────────────────────

// Roll up all journal lines per account into cumulative debits/credits and a
// net balance on the account's normal side. Accounts with no movement are
// omitted. Header/group totals can be derived by the UI from the leaf rows.
export function buildMizan(): MizanRow[] {
  const totals = new Map<string, { borc: number; alacak: number }>()

  for (const entry of state.entries) {
    for (const line of entry.satirlar) {
      // Roll sub-accounts (120.xxx) up to their 3-digit parent for the mizan.
      const baseCode = line.hesapKodu.split('.')[0]
      const cur = totals.get(baseCode) ?? { borc: 0, alacak: 0 }
      cur.borc += line.borc
      cur.alacak += line.alacak
      totals.set(baseCode, cur)
    }
  }

  const rows: MizanRow[] = []
  for (const [kod, t] of totals) {
    const acc = getAccount(kod)
    const net = Math.round((t.borc - t.alacak) * 100) / 100
    rows.push({
      hesapKodu: kod,
      hesapAdi: accountName(kod),
      tip: (acc?.tip ?? 'aktif') as AccountType,
      borcToplam: Math.round(t.borc * 100) / 100,
      alacakToplam: Math.round(t.alacak * 100) / 100,
      borcBakiye: net > 0 ? net : 0,
      alacakBakiye: net < 0 ? -net : 0,
    })
  }

  return rows.sort((a, b) => a.hesapKodu.localeCompare(b.hesapKodu))
}

// Overall trial-balance health: total debits vs total credits across the ledger.
export function mizanTotals() {
  const rows = buildMizan()
  const borc = Math.round(rows.reduce((s, r) => s + r.borcToplam, 0) * 100) / 100
  const alacak = Math.round(rows.reduce((s, r) => s + r.alacakToplam, 0) * 100) / 100
  return { borc, alacak, dengeli: Math.abs(borc - alacak) < 0.01 }
}

// ── Derived: Defter-i Kebir (account ledger) ─────────────────────────────

// Every posting touching one account, in date order, with a running balance.
export function buildDefter(hesapKodu: string): DefterSatir[] {
  const base = hesapKodu.split('.')[0]
  const rows: { tarih: string; fisNo: number; aciklama: string; borc: number; alacak: number }[] = []

  for (const entry of state.entries) {
    for (const line of entry.satirlar) {
      if (line.hesapKodu.split('.')[0] === base) {
        rows.push({
          tarih: entry.tarih,
          fisNo: entry.fisNo,
          aciklama: line.aciklama || entry.aciklama,
          borc: line.borc,
          alacak: line.alacak,
        })
      }
    }
  }

  rows.sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : a.fisNo - b.fisNo))

  let bakiye = 0
  return rows.map(rw => {
    bakiye = Math.round((bakiye + rw.borc - rw.alacak) * 100) / 100
    return { ...rw, bakiye }
  })
}

// Income-statement figures derived from the ledger (6xx accounts).
// Real numbers, replacing the old hardcoded ratios.
export function buildGelirTablosu() {
  const mizan = buildMizan()
  const sum = (prefixes: string[]) =>
    mizan
      .filter(r => prefixes.some(p => r.hesapKodu.startsWith(p)))
      .reduce((s, r) => s + r.alacakToplam - r.borcToplam, 0)

  const brutSatis = sum(['600', '601', '602'])
  const satisIndirim = -sum(['610', '611', '612'])
  const satisMaliyeti = -sum(['620', '621', '622'])
  const faaliyetGideri = -sum(['630', '631', '632'])
  const netSatis = brutSatis - satisIndirim
  const brutKar = netSatis - satisMaliyeti
  const faaliyetKari = brutKar - faaliyetGideri

  return {
    brutSatis: Math.round(brutSatis),
    netSatis: Math.round(netSatis),
    satisMaliyeti: Math.round(satisMaliyeti),
    brutKar: Math.round(brutKar),
    faaliyetGideri: Math.round(faaliyetGideri),
    faaliyetKari: Math.round(faaliyetKari),
  }
}

// Count of accounts (for the chart-of-accounts view).
export const tdhpAccountCount = TDHP.filter(a => a.hareketGorur).length
