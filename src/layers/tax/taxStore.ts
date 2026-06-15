// Octo — Tax Store
// Live, persisted data layer for the Vergi arm.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../shared/store/persist'
import { seedBeyannameler, seedCompliance } from './seedData'
import { isDemoMode } from '../../shared/config'
import type { Beyanname, ComplianceItem } from './types'

interface TaxState {
  beyannameler: Beyanname[]
  compliance: ComplianceItem[]
}

const KEY = 'tax'

const emptyState: TaxState = { beyannameler: [], compliance: [] }
const seedState: TaxState = { beyannameler: seedBeyannameler, compliance: seedCompliance }

let state: TaxState = loadOrSeed<TaxState>(KEY, isDemoMode() ? seedState : emptyState)

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

export function addBeyanname(b: Beyanname) {
  state = { ...state, beyannameler: [b, ...state.beyannameler] }
  emit()
}

export function updateBeyannameStatus(id: string, status: Beyanname['status']) {
  state = {
    ...state,
    beyannameler: state.beyannameler.map(b => (b.id === id ? { ...b, status } : b)),
  }
  emit()
}

export function resetTax() {
  state = isDemoMode() ? seedState : emptyState
  emit()
}

// Load the demo dataset (called by the landing "Demoyu gör" button).
export function seedTaxDemo() {
  state = seedState
  emit()
}

// Clear back to empty (called by "Boş başla").
export function clearTax() {
  state = emptyState
  emit()
}

export function getTaxState(): TaxState {
  return state
}

// ---- React hook ----

export function useTaxStore(): TaxState {
  return useSyncExternalStore(subscribe, getSnapshot)
}
