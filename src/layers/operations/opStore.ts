// Octo — Operasyon Store
// Ürünler, stok hareketleri, siparişler, sevkiyatlar, reçeteler, üretim emirleri
// ve tedarikçiler. Stok bakiyesi hareketlerden TÜRETİLİR (denetlenebilir).
// Cross-arm çıktıları üretir: kritik stok uyarıları, açık alış siparişi nakit
// yükümlülükleri, üretim hammadde ihtiyacı.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../shared/store/persist'
import { isDemoMode } from '../../shared/config'
import { isDateOnly } from '../../shared/dateOnly'
import type { Invoice } from '../finance/types'
import {
  hareketGirisMi, siparisGecisleri,
  type Urun, type StokHareketi, type Siparis, type SiparisDurumu,
  type SiparisOdemeDurumu, type SiparisParaBirimi,
  type Sevkiyat, type Recete, type UretimEmri, type Tedarikci,
} from './types'
import { reconcilePurchaseOrder } from './purchaseOrderObligations'
import {
  seedUrunler, seedHareketler, seedSiparisler, seedSevkiyatlar,
  seedReceteler, seedUretim, seedTedarikciler,
} from './seedData'
import { urunTahmini, type StokTahmin } from './forecast'

export interface OpState {
  urunler: Urun[]
  hareketler: StokHareketi[]
  siparisler: Siparis[]
  sevkiyatlar: Sevkiyat[]
  receteler: Recete[]
  uretimler: UretimEmri[]
  tedarikciler: Tedarikci[]
}

const KEY = 'operations'
const empty: OpState = {
  urunler: [], hareketler: [], siparisler: [], sevkiyatlar: [],
  receteler: [], uretimler: [], tedarikciler: [],
}

function initial(): OpState {
  if (isDemoMode()) {
    const urunler = seedUrunler()
    return {
      urunler,
      hareketler: seedHareketler(urunler),
      siparisler: seedSiparisler(urunler).map(normalizePersistedSiparis),
      sevkiyatlar: seedSevkiyatlar(),
      receteler: seedReceteler(urunler),
      uretimler: seedUretim(urunler),
      tedarikciler: seedTedarikciler(urunler),
    }
  }
  return empty
}

const loaded = loadOrSeed<OpState>(KEY, initial())
export function normalizePersistedSiparis(order: Siparis): Siparis {
  const faturaIds = [...new Set([
    ...(Array.isArray(order.faturaIds) ? order.faturaIds.filter((id): id is string => typeof id === 'string' && id.length > 0) : []),
    ...(typeof order.faturaId === 'string' && order.faturaId.length > 0 ? [order.faturaId] : []),
  ])]
  const paraBirimi: SiparisParaBirimi = order.paraBirimi === 'USD' || order.paraBirimi === 'EUR'
    ? order.paraBirimi
    : 'TRY'
  const odemeDurumu: SiparisOdemeDurumu = order.odemeDurumu === 'odendi' ? 'odendi' : 'bekliyor'
  return {
    ...order,
    odemeTarihi: isDateOnly(order.odemeTarihi) ? order.odemeTarihi : undefined,
    paraBirimi,
    odemeDurumu,
    faturalandi: Boolean(order.faturalandi),
    faturaId: faturaIds[0],
    faturaIds,
  }
}

// Migration guard: eksik dizileri default'la (eski persisted state çökmesin).
let state: OpState = {
  urunler: Array.isArray(loaded?.urunler) ? loaded.urunler : [],
  hareketler: Array.isArray(loaded?.hareketler) ? loaded.hareketler : [],
  siparisler: Array.isArray(loaded?.siparisler) ? loaded.siparisler.map(normalizePersistedSiparis) : [],
  sevkiyatlar: Array.isArray(loaded?.sevkiyatlar) ? loaded.sevkiyatlar : [],
  receteler: Array.isArray(loaded?.receteler) ? loaded.receteler : [],
  uretimler: Array.isArray(loaded?.uretimler) ? loaded.uretimler : [],
  tedarikciler: Array.isArray(loaded?.tedarikciler) ? loaded.tedarikciler : [],
}

const listeners = new Set<() => void>()
function emit() { save(KEY, state); listeners.forEach(l => l()) }
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l) }

export function getOpState(): OpState { return state }
export function useOpStore(): OpState {
  return useSyncExternalStore(subscribe, getOpState, getOpState)
}

// ── Ürün actions ──────────────────────────────────────────────────────────
export function addUrun(u: Urun) { state = { ...state, urunler: [u, ...state.urunler] }; emit() }
export function updateUrun(id: string, patch: Partial<Urun>) {
  state = { ...state, urunler: state.urunler.map(u => u.id === id ? { ...u, ...patch, id } : u) }; emit()
}
export function deleteUrun(id: string) { state = { ...state, urunler: state.urunler.filter(u => u.id !== id) }; emit() }

// ── Stok hareketi + türetilmiş bakiye ──────────────────────────────────────
export function addHareket(h: StokHareketi) { state = { ...state, hareketler: [h, ...state.hareketler] }; emit() }

// Bir ürünün mevcut stok miktarı (tüm hareketlerden türetilir).
export function stokMiktari(urunId: string, source: OpState = state): number {
  return source.hareketler
    .filter(h => h.urunId === urunId)
    .reduce((sum, h) => sum + (hareketGirisMi[h.tip] ? h.miktar : -h.miktar), 0)
}

// Ortalama stok maliyeti (basit ağırlıklı; giriş hareketlerinden).
export function stokMaliyeti(urunId: string, source: OpState = state): number {
  const girisler = source.hareketler.filter(h => h.urunId === urunId && hareketGirisMi[h.tip] && h.miktar > 0)
  if (girisler.length === 0) return 0
  const toplamMiktar = girisler.reduce((s, h) => s + h.miktar, 0)
  const toplamDeger = girisler.reduce((s, h) => s + h.miktar * h.birimMaliyet, 0)
  return toplamMiktar > 0 ? toplamDeger / toplamMiktar : 0
}

// ── Sipariş actions (state machine korumalı) ────────────────────────────────
export function addSiparis(s: Siparis) { state = { ...state, siparisler: [normalizePersistedSiparis(s), ...state.siparisler] }; emit() }
export function setSiparisDurum(id: string, durum: SiparisDurumu): boolean {
  const s = state.siparisler.find(x => x.id === id)
  if (!s) return false
  if (!siparisGecisleri[s.durum].includes(durum)) return false // geçersiz geçiş
  state = { ...state, siparisler: state.siparisler.map(x => x.id === id ? { ...x, durum } : x) }
  emit(); return true
}
export interface SiparisObligationPatch {
  odemeTarihi?: string
  paraBirimi: SiparisParaBirimi
  odemeDurumu: SiparisOdemeDurumu
}
export function updateSiparisObligation(id: string, patch: SiparisObligationPatch): void {
  state = {
    ...state,
    siparisler: state.siparisler.map(order => order.id === id
      ? {
          ...order,
          odemeTarihi: isDateOnly(patch.odemeTarihi) ? patch.odemeTarihi : undefined,
          paraBirimi: patch.paraBirimi,
          odemeDurumu: patch.odemeDurumu,
        }
      : order),
  }
  emit()
}
export function linkSiparisFatura(id: string, faturaId: string): void {
  if (!faturaId) return
  state = {
    ...state,
    siparisler: state.siparisler.map(order => {
      if (order.id !== id) return order
      const faturaIds = [...new Set([...(order.faturaIds ?? []), faturaId])]
      return { ...order, faturaIds, faturaId: faturaIds[0], faturalandi: faturaIds.length > 0 }
    }),
  }
  emit()
}
export function unlinkSiparisFatura(id: string, faturaId: string): void {
  state = {
    ...state,
    siparisler: state.siparisler.map(order => {
      if (order.id !== id) return order
      const faturaIds = (order.faturaIds ?? []).filter(item => item !== faturaId)
      return { ...order, faturaIds, faturaId: faturaIds[0], faturalandi: faturaIds.length > 0 }
    }),
  }
  emit()
}
export function setSiparisFaturalandi(id: string, faturaId?: string, value = true) {
  if (!faturaId) return
  if (value) linkSiparisFatura(id, faturaId)
  else unlinkSiparisFatura(id, faturaId)
}
export function deleteSiparis(id: string) { state = { ...state, siparisler: state.siparisler.filter(s => s.id !== id) }; emit() }

// ── Sevkiyat actions ────────────────────────────────────────────────────────
export function addSevkiyat(sv: Sevkiyat) { state = { ...state, sevkiyatlar: [sv, ...state.sevkiyatlar] }; emit() }
export function updateSevkiyat(id: string, patch: Partial<Sevkiyat>) {
  state = { ...state, sevkiyatlar: state.sevkiyatlar.map(s => s.id === id ? { ...s, ...patch, id } : s) }; emit()
}

// ── Reçete + Üretim actions ─────────────────────────────────────────────────
export function addRecete(r: Recete) { state = { ...state, receteler: [r, ...state.receteler] }; emit() }
export function deleteRecete(id: string) { state = { ...state, receteler: state.receteler.filter(r => r.id !== id) }; emit() }
export function addUretim(u: UretimEmri) { state = { ...state, uretimler: [u, ...state.uretimler] }; emit() }
export function setUretimDurum(id: string, durum: UretimEmri['durum']) {
  state = { ...state, uretimler: state.uretimler.map(u => u.id === id ? { ...u, durum } : u) }
  emit()
}

// ── Tedarikçi actions ───────────────────────────────────────────────────────
export function addTedarikci(t: Tedarikci) { state = { ...state, tedarikciler: [t, ...state.tedarikciler] }; emit() }
export function updateTedarikci(id: string, patch: Partial<Tedarikci>) {
  state = { ...state, tedarikciler: state.tedarikciler.map(t => t.id === id ? { ...t, ...patch, id } : t) }; emit()
}
export function deleteTedarikci(id: string) { state = { ...state, tedarikciler: state.tedarikciler.filter(t => t.id !== id) }; emit() }

// ── Demo ────────────────────────────────────────────────────────────────────
export function seedOpDemo() { state = initial(); if (!isDemoMode()) state = empty; emit() }
export function clearOp() { state = empty; emit() }

// ════════════════════════════════════════════════════════════════════════════
// CROSS-ARM ÇIKTILARI — orkestratöre giden sinyaller
// ════════════════════════════════════════════════════════════════════════════

// Kritik stok altındaki ürünler (+ açık satış siparişi varsa risk yüksek).
export interface KritikStok {
  urun: Urun
  mevcut: number
  kritikSeviye: number
  acikSatisMiktar: number    // bekleyen satış siparişlerindeki toplam
  tedarikSuresiGun: number
}

export function kritikStoklar(): KritikStok[] {
  const out: KritikStok[] = []
  for (const u of state.urunler) {
    if (!u.aktif || u.tip === 'hizmet') continue
    const mevcut = stokMiktari(u.id)
    if (mevcut <= u.kritikSeviye) {
      // açık satış siparişlerinde bu üründen ne kadar var
      const acik = state.siparisler
        .filter(s => s.tur === 'satis' && (s.durum === 'onaylandi' || s.durum === 'kismi'))
        .flatMap(s => s.satirlar)
        .filter(r => r.urunId === u.id)
        .reduce((sum, r) => sum + (r.miktar - r.sevkEdilen), 0)
      out.push({ urun: u, mevcut, kritikSeviye: u.kritikSeviye, acikSatisMiktar: acik, tedarikSuresiGun: u.tedarikSuresiGun })
    }
  }
  return out.sort((a, b) => (a.mevcut - a.kritikSeviye) - (b.mevcut - b.kritikSeviye))
}

// Açık alış siparişleri → gelecek nakit çıkışı (Finans projeksiyonu için).
export interface AlisSiparisYukumluluk {
  orderId: string
  date: string
  amount: number
  currency: SiparisParaBirimi
  description: string
}

export function acikAlisSiparisYukumlulukleri(invoices: Invoice[] = []): AlisSiparisYukumluluk[] {
  return state.siparisler
    .filter(order => order.tur === 'alis' && (order.durum === 'onaylandi' || order.durum === 'kismi'))
    .flatMap(order => {
      if (!isDateOnly(order.odemeTarihi)) return []
      const reconciliation = reconcilePurchaseOrder(order, invoices, state.siparisler)
      if (reconciliation.calculationBlocked || reconciliation.remainingAmount <= 0) return []
      return [{
        orderId: order.id,
        date: order.odemeTarihi,
        amount: reconciliation.remainingAmount,
        currency: reconciliation.currency,
        description: `Alış siparişi ${order.no} (${order.cariUnvan})`,
      }]
    })
}

// Devam eden üretim emirleri için karşılanamayan hammadde ihtiyacı.
export interface UretimEksikMalzeme {
  uretimId: string
  uretimNo: string
  hedefTarih: string
  receteId: string
  urunId: string
  urunAd: string
  gereken: number
  mevcut: number
  eksik: number
}

export function uretimEksikMalzemeler(source: OpState = state): UretimEksikMalzeme[] {
  const out: UretimEksikMalzeme[] = []
  const aktifUretimler = source.uretimler
    .filter(u => u.durum === 'planlandi' || u.durum === 'devam')
    .sort((a, b) => a.hedefTarih.localeCompare(b.hedefTarih))
  const kalanStok = new Map(source.urunler.map(product => [product.id, stokMiktari(product.id, source)]))
  for (const ue of aktifUretimler) {
    const recete = source.receteler.find(r => r.id === ue.receteId)
    if (!recete) continue
    const requirements = new Map<string, number>()
    for (const component of recete.bilesenler) {
      requirements.set(
        component.urunId,
        (requirements.get(component.urunId) ?? 0) + component.miktar * ue.miktar,
      )
    }
    for (const [urunId, gereken] of requirements) {
      const mevcut = Math.max(0, kalanStok.get(urunId) ?? 0)
      const eksik = Math.max(0, gereken - mevcut)
      kalanStok.set(urunId, mevcut - gereken)
      if (eksik > 0) {
        const urun = source.urunler.find(u => u.id === urunId)
        out.push({
          uretimId: ue.id,
          uretimNo: ue.no,
          hedefTarih: ue.hedefTarih,
          receteId: recete.id,
          urunId,
          urunAd: urun?.ad ?? urunId,
          gereken,
          mevcut,
          eksik,
        })
      }
    }
  }
  return out
}

// Toplam stok değeri (Finans/varlık görünümü için).
export function toplamStokDegeri(): number {
  return state.urunler.reduce((sum, u) => sum + stokMiktari(u.id) * stokMaliyeti(u.id), 0)
}

// ── Stok Tahmini (Katman 1) ─────────────────────────────────────────────────
// Bir ürünün tahmini (o ürünün tüm hareketlerinden).
export function urunStokTahmini(urunId: string, now = new Date(), source: OpState = state): StokTahmin | null {
  const urun = source.urunler.find(u => u.id === urunId)
  if (!urun) return null
  const har = source.hareketler.filter(h => h.urunId === urunId)
  return urunTahmini(urun, har, now)
}

// Tüm aktif (hizmet olmayan) ürünlerin tahmini.
export function tumStokTahminleri(now = new Date(), source: OpState = state): StokTahmin[] {
  return source.urunler
    .filter(u => u.aktif && u.tip !== 'hizmet')
    .map(u => urunTahmini(u, source.hareketler.filter(h => h.urunId === u.id), now))
}
