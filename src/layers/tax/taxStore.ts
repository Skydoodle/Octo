// Octo — Tax Store
// Live, persisted data layer for the Vergi arm.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../shared/store/persist'
import { seedBeyannameler, seedCompliance } from './seedData'
import { isDemoMode } from '../../shared/config'
import type { Beyanname, ComplianceItem } from './types'

export interface TaxState {
  beyannameler: Beyanname[]
  compliance: ComplianceItem[]
}

const KEY = 'tax'

const emptyState: TaxState = { beyannameler: [], compliance: [] }
const seedState: TaxState = { beyannameler: seedBeyannameler, compliance: seedCompliance }

const loaded = loadOrSeed<TaxState>(KEY, isDemoMode() ? seedState : emptyState)
let state: TaxState = {
  beyannameler: Array.isArray(loaded?.beyannameler) ? loaded.beyannameler : [],
  compliance: Array.isArray(loaded?.compliance) ? loaded.compliance : [],
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

export function addBeyanname(b: Beyanname): boolean {
  const same = state.beyannameler.find(existing => existing.id === b.id)
  if (same && JSON.stringify(same) === JSON.stringify(b)) return false
  // A type + period has one current declaration. A correction supersedes the
  // earlier record instead of becoming a second cash obligation.
  const others = state.beyannameler.filter(existing =>
    existing.id !== b.id && !(existing.type === b.type && existing.donem === b.donem),
  )
  state = { ...state, beyannameler: [b, ...others] }
  emit()
  return true
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
