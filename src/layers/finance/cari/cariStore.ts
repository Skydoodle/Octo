// Octo — Cari Store
// Holds caris (customers/suppliers), persists them, and derives each cari's
// balance from the live invoices. Lookup by VKN powers the "this company is
// already registered" flow in the invoice form.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../../shared/store/persist'
import { getFinanceState } from '../financeStore'
import type { Cari } from './types'
import { PERAKENDE_CARI_ID, makePerakendeCari } from './types'

interface CariState {
  cariler: Cari[]
}

const KEY = 'cari'
const emptyState: CariState = { cariler: [] }

let state: CariState = loadOrSeed<CariState>(KEY, emptyState)

const listeners = new Set<() => void>()
function emit() {
  save(KEY, state)
  listeners.forEach(l => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function getCariState(): CariState {
  return state
}
export function useCariStore(): CariState {
  return useSyncExternalStore(subscribe, getCariState, getCariState)
}

// Find a cari by VKN (the key the invoice form uses to detect an existing company).
export function findCariByVkn(vkn: string): Cari | undefined {
  const v = vkn.trim()
  if (!v) return undefined
  return state.cariler.find(c => c.vkn.trim() === v)
}

export function getCari(id: string): Cari | undefined {
  return state.cariler.find(c => c.id === id)
}

export function addCari(c: Cari) {
  // De-dupe by VKN: if one already exists, update it instead of duplicating.
  const existing = c.vkn ? state.cariler.find(x => x.vkn.trim() === c.vkn.trim()) : undefined
  if (existing) {
    state = { cariler: state.cariler.map(x => (x.id === existing.id ? { ...existing, ...c, id: existing.id } : x)) }
  } else {
    state = { cariler: [c, ...state.cariler] }
  }
  emit()
}

export function updateCari(id: string, patch: Partial<Cari>) {
  state = { cariler: state.cariler.map(c => (c.id === id ? { ...c, ...patch, id } : c)) }
  emit()
}

export function deleteCari(id: string) {
  if (id === PERAKENDE_CARI_ID) return // never delete the retail cari
  state = { cariler: state.cariler.filter(c => c.id !== id) }
  emit()
}

// Ensure the single generic retail cari exists; returns it.
export function ensurePerakendeCari(): Cari {
  let p = state.cariler.find(c => c.id === PERAKENDE_CARI_ID)
  if (!p) {
    p = makePerakendeCari()
    state = { cariler: [...state.cariler, p] }
    emit()
  }
  return p
}

export function clearCari() {
  state = emptyState
  emit()
}

// Demo helper: create a cari for each unique VKN found in a set of invoices,
// with plausible contact details so the Cariler cards look complete in demo.
export function seedCarilerFromInvoices(invoices: { contactName: string; contactTaxId: string; type: string }[]) {
  const seen = new Map<string, Cari>()
  for (const inv of invoices) {
    const vkn = (inv.contactTaxId || '').trim()
    if (!vkn || seen.has(vkn)) continue
    seen.set(vkn, {
      id: 'cari-seed-' + vkn,
      unvan: inv.contactName,
      vkn,
      tip: inv.type === 'purchase' ? 'tedarikci' : 'musteri',
      telefon: '0(212) 000 00 00',
      adres: 'İstanbul',
      vergiDairesi: 'Merkez V.D.',
      yetkili: 'Yetkili Kişi',
      eposta: '',
      olusturulma: new Date().toISOString().slice(0, 10),
    })
  }
  state = { cariler: [...seen.values(), ...state.cariler.filter(c => !seen.has(c.vkn))] }
  emit()
}

// ── Derived: per-cari balance from invoices ──────────────────────────────

export interface CariBakiye {
  alacak: number     // they owe us (open sales invoices)
  borc: number       // we owe them (open purchase invoices)
  net: number        // alacak - borc (positive = receivable)
  acikFaturaSayisi: number
}

// A cari's balance, computed live from the invoice store by matching VKN.
export function cariBakiye(cari: Cari): CariBakiye {
  const { invoices } = getFinanceState()
  const mine = invoices.filter(i => i.contactTaxId.trim() === cari.vkn.trim() && i.status !== 'cancelled')
  let alacak = 0, borc = 0, acik = 0
  for (const inv of mine) {
    const open = inv.status !== 'paid'
    if (inv.type === 'sales' && open) { alacak += inv.total; acik++ }
    if (inv.type === 'purchase' && open) { borc += inv.total; acik++ }
  }
  return { alacak, borc, net: alacak - borc, acikFaturaSayisi: acik }
}
