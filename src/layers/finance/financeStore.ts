// Octo — Finance Store
// Live, persisted data layer for the Finance arm.
// Components read via useFinanceStore(); forms write via the exposed actions.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../shared/store/persist'
import { seedAccounts, seedInvoices, seedTransactions } from './seedData'
import { isDemoMode } from '../../shared/config'
import { postInvoiceCreated, postInvoiceSettled, postStandaloneTransaction, postDemoLedger } from './muhasebe/bridge'
import { clearLedger } from './muhasebe/ledgerStore'
import { seedCarilerFromInvoices, clearCari } from './cari/cariStore'
import { linkSiparisFatura, unlinkSiparisFatura } from '../operations/opStore'
import type { BankAccount, Invoice, Transaction } from './types'

export interface FinanceState {
  accounts: BankAccount[]
  invoices: Invoice[]
  transactions: Transaction[]
}

const KEY = 'finance'

const emptyState: FinanceState = { accounts: [], invoices: [], transactions: [] }
const seedState: FinanceState = {
  accounts: seedAccounts,
  invoices: seedInvoices,
  transactions: seedTransactions,
}

const loaded = loadOrSeed<FinanceState>(KEY, isDemoMode() ? seedState : emptyState)
let state: FinanceState = {
  accounts: Array.isArray(loaded?.accounts) ? loaded.accounts : [],
  invoices: Array.isArray(loaded?.invoices) ? loaded.invoices : [],
  transactions: Array.isArray(loaded?.transactions) ? loaded.transactions : [],
}

const listeners = new Set<() => void>()

function emit() {
  save(KEY, state)
  listeners.forEach(l => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return state
}

// ---- Actions ----

export function addInvoice(inv: Invoice): boolean {
  if (state.invoices.some(existing => existing.id === inv.id)) return false
  // If the invoice is entered as already-paid, settle cash atomically in the
  // same update so books never show a paid invoice without a matching movement.
  if (inv.status === 'paid') {
    const accountId = defaultAccountId()
    const tx = buildSettlementTx(inv, accountId)
    state = {
      ...state,
      invoices: [inv, ...state.invoices],
      transactions: tx ? [tx, ...state.transactions] : state.transactions,
      accounts: tx ? applyToBalance(state.accounts, accountId, tx.amount) : state.accounts,
    }
  } else {
    state = { ...state, invoices: [inv, ...state.invoices] }
  }
  emit()
  if (inv.sourceOrderId) linkSiparisFatura(inv.sourceOrderId, inv.id)
  // Post to the general ledger: the accrual entry always, plus the settlement
  // entry if the invoice was entered already-paid.
  postInvoiceCreated(inv)
  if (inv.status === 'paid') postInvoiceSettled(inv)
  return true
}

// Mark an existing invoice paid AND move the cash: one atomic update covering
// the invoice status, a matching cash transaction, and the account balance.
// This is the single source of truth for "an invoice settled" — components and
// the orchestrator both read the result without duplicating the logic.
export function settleInvoice(id: string, accountId?: string) {
  const inv = state.invoices.find(i => i.id === id)
  if (!inv || inv.status === 'paid') return // no-op: missing or already settled

  const acc = accountId ?? defaultAccountId()
  const tx = buildSettlementTx(inv, acc)
  if (!tx) return

  state = {
    ...state,
    invoices: state.invoices.map(i => (i.id === id ? { ...i, status: 'paid' } : i)),
    transactions: [tx, ...state.transactions],
    accounts: applyToBalance(state.accounts, acc, tx.amount),
  }
  emit()
  // Mirror the settlement into the ledger (tahsilat / ödeme entry).
  postInvoiceSettled({ ...inv, status: 'paid' })
}

// ---- Settlement helpers ----

// First TRY account, used when the UI hasn't yet surfaced an account picker.
function defaultAccountId(): string {
  const try1 = state.accounts.find(a => a.currency === 'TRY')
  return (try1 ?? state.accounts[0])?.id ?? ''
}

// Build the cash transaction implied by settling an invoice.
// Sales invoice settled -> income (+total). Purchase invoice settled -> expense (-total).
function buildSettlementTx(inv: Invoice, accountId: string): Transaction | null {
  if (!accountId) return null
  const isSale = inv.type === 'sales'
  const signed = isSale ? inv.total : -inv.total
  return {
    id: 'tx' + Date.now() + Math.floor(Math.random() * 1000),
    date: new Date().toISOString().split('T')[0],
    description: `${inv.contactName} — ${isSale ? 'tahsilat' : 'ödeme'}`,
    amount: signed,
    type: isSale ? 'income' : 'expense',
    category: isSale ? 'Satış Geliri' : 'Tedarik',
    accountId,
    invoiceId: inv.id,
  }
}

// Return a new accounts array with `delta` applied to one account's balance.
function applyToBalance(accounts: BankAccount[], accountId: string, delta: number): BankAccount[] {
  return accounts.map(a => (a.id === accountId ? { ...a, balance: a.balance + delta } : a))
}

export function updateInvoiceStatus(id: string, status: Invoice['status']) {
  const current = state.invoices.find(invoice => invoice.id === id)
  state = {
    ...state,
    invoices: state.invoices.map(i => (i.id === id ? { ...i, status } : i)),
  }
  emit()
  if (current?.sourceOrderId && status === 'cancelled') {
    unlinkSiparisFatura(current.sourceOrderId, current.id)
  } else if (current?.sourceOrderId && current.status === 'cancelled') {
    linkSiparisFatura(current.sourceOrderId, current.id)
  }
}

export function addTransaction(tx: Transaction) {
  state = { ...state, transactions: [tx, ...state.transactions] }
  emit()
  postStandaloneTransaction(tx)
}

export function addAccount(acc: BankAccount) {
  state = { ...state, accounts: [...state.accounts, acc] }
  emit()
}

export function resetFinance() {
  state = isDemoMode() ? seedState : emptyState
  emit()
}

// Load the demo dataset (called by the landing "Demoyu gör" button).
export function seedFinanceDemo() {
  state = seedState
  emit()
  // Post the seed data to the general ledger so Muhasebe is populated in demo.
  postDemoLedger(seedState)
  // Derive caris from the demo invoices so the Cariler tab is populated too.
  seedCarilerFromInvoices(seedState.invoices)
}

// Clear back to an empty book (called by "Boş başla").
export function clearFinance() {
  state = emptyState
  emit()
  clearLedger()
  clearCari()
}

// Non-reactive read for modules outside React (e.g. orchestrator)
export function getFinanceState(): FinanceState {
  return state
}

// ---- React hook ----

export function useFinanceStore(): FinanceState {
  return useSyncExternalStore(subscribe, getSnapshot)
}
