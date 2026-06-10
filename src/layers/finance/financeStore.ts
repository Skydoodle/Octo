// Octo — Finance Store
// Live, persisted data layer for the Finance arm.
// Components read via useFinanceStore(); forms write via the exposed actions.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../shared/store/persist'
import { mockAccounts, mockInvoices, mockTransactions } from './mockData'
import type { BankAccount, Invoice, Transaction } from './types'

interface FinanceState {
  accounts: BankAccount[]
  invoices: Invoice[]
  transactions: Transaction[]
}

const KEY = 'finance'

let state: FinanceState = loadOrSeed<FinanceState>(KEY, {
  accounts: mockAccounts,
  invoices: mockInvoices,
  transactions: mockTransactions,
})

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

export function addInvoice(inv: Invoice) {
  state = { ...state, invoices: [inv, ...state.invoices] }
  emit()
}

export function updateInvoiceStatus(id: string, status: Invoice['status']) {
  state = {
    ...state,
    invoices: state.invoices.map(i => (i.id === id ? { ...i, status } : i)),
  }
  emit()
}

export function addTransaction(tx: Transaction) {
  state = { ...state, transactions: [tx, ...state.transactions] }
  emit()
}

export function addAccount(acc: BankAccount) {
  state = { ...state, accounts: [...state.accounts, acc] }
  emit()
}

export function resetFinance() {
  state = {
    accounts: mockAccounts,
    invoices: mockInvoices,
    transactions: mockTransactions,
  }
  emit()
}

// Non-reactive read for modules outside React (e.g. orchestrator)
export function getFinanceState(): FinanceState {
  return state
}

// ---- React hook ----

export function useFinanceStore(): FinanceState {
  return useSyncExternalStore(subscribe, getSnapshot)
}
