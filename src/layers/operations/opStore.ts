// Octo — Operasyon Store
// Ürünler, stok hareketleri, siparişler, sevkiyatlar, reçeteler, üretim emirleri
// ve tedarikçiler. Stok bakiyesi hareketlerden TÜRETİLİR (denetlenebilir).
// Cross-arm çıktıları üretir: kritik stok uyarıları, açık alış siparişi nakit
// yükümlülükleri, üretim hammadde ihtiyacı.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../shared/store/persist'
import { isDemoMode } from '../../shared/config'
import {
  hareketGirisMi, siparisToplam, siparisGecisleri,
  type Urun, type StokHareketi, type Siparis, type SiparisDurumu,
  type Sevkiyat, type Recete, type UretimEmri, type Tedarikci,
} from './types'
import {
  seedUrunler, seedHareketler, seedSiparisler, seedSevkiyatlar,
  seedReceteler, seedUretim, seedTedarikciler,
} from './seedData'
import { urunTahmini, type StokTahmin } from './forecast'

interface OpState {
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
      siparisler: seedSiparisler(urunler),
      sevkiyatlar: seedSevkiyatlar(),
      receteler: seedReceteler(urunler),
      uretimler: seedUretim(urunler),
      tedarikciler: seedTedarikciler(urunler),
    }
  }
  return empty
}

const loaded = loadOrSeed<OpState>(KEY, initial())
// Migration guard: eksik dizileri default'la (eski persisted state çökmesin).
let state: OpState = {
  urunler: loaded.urunler ?? [],
  hareketler: loaded.hareketler ?? [],
  siparisler: loaded.siparisler ?? [],
  sevkiyatlar: loaded.sevkiyatlar ?? [],
  receteler: loaded.receteler ?? [],
  uretimler: loaded.uretimler ?? [],
  tedarikciler: loaded.tedarikciler ?? [],
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
export function stokMiktari(urunId: string): number {
  return state.hareketler
    .filter(h => h.urunId === urunId)
    .reduce((sum, h) => sum + (hareketGirisMi[h.tip] ? h.miktar : -h.miktar), 0)
}

// Ortalama stok maliyeti (basit ağırlıklı; giriş hareketlerinden).
export function stokMaliyeti(urunId: string): number {
  const girisler = state.hareketler.filter(h => h.urunId === urunId && hareketGirisMi[h.tip] && h.miktar > 0)
  if (girisler.length === 0) return 0
  const toplamMiktar = girisler.reduce((s, h) => s + h.miktar, 0)
  const toplamDeger = girisler.reduce((s, h) => s + h.miktar * h.birimMaliyet, 0)
  return toplamMiktar > 0 ? toplamDeger / toplamMiktar : 0
}

// ── Sipariş actions (state machine korumalı) ────────────────────────────────
export function addSiparis(s: Siparis) { state = { ...state, siparisler: [s, ...state.siparisler] }; emit() }
export function setSiparisDurum(id: string, durum: SiparisDurumu): boolean {
  const s = state.siparisler.find(x => x.id === id)
  if (!s) return false
  if (!siparisGecisleri[s.durum].includes(durum)) return false // geçersiz geçiş
  state = { ...state, siparisler: state.siparisler.map(x => x.id === id ? { ...x, durum } : x) }
  emit(); return true
}
export function setSiparisFaturalandi(id: string) {
  state = { ...state, siparisler: state.siparisler.map(x => x.id === id ? { ...x, faturalandi: true } : x) }; emit()
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
  date: string
  amount: number
  description: string
}

export function acikAlisSiparisYukumlulukleri(): AlisSiparisYukumluluk[] {
  return state.siparisler
    .filter(s => s.tur === 'alis' && (s.durum === 'onaylandi' || s.durum === 'kismi') && !s.faturalandi)
    .map(s => ({
      date: s.teslimTarihi,
      amount: siparisToplam(s).genelToplam,
      description: `Alış siparişi ${s.no} (${s.cariUnvan})`,
    }))
}

// Devam eden üretim emirleri için karşılanamayan hammadde ihtiyacı.
export interface UretimEksikMalzeme {
  uretimNo: string
  urunAd: string
  gereken: number
  mevcut: number
  eksik: number
}

export function uretimEksikMalzemeler(): UretimEksikMalzeme[] {
  const out: UretimEksikMalzeme[] = []
  const aktifUretimler = state.uretimler.filter(u => u.durum === 'planlandi' || u.durum === 'devam')
  for (const ue of aktifUretimler) {
    const recete = state.receteler.find(r => r.id === ue.receteId)
    if (!recete) continue
    for (const b of recete.bilesenler) {
      const gereken = b.miktar * ue.miktar
      const mevcut = stokMiktari(b.urunId)
      if (mevcut < gereken) {
        const urun = state.urunler.find(u => u.id === b.urunId)
        out.push({
          uretimNo: ue.no,
          urunAd: urun?.ad ?? b.urunId,
          gereken, mevcut, eksik: gereken - mevcut,
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
export function urunStokTahmini(urunId: string): StokTahmin | null {
  const urun = state.urunler.find(u => u.id === urunId)
  if (!urun) return null
  const har = state.hareketler.filter(h => h.urunId === urunId)
  return urunTahmini(urun, har)
}

// Tüm aktif (hizmet olmayan) ürünlerin tahmini.
export function tumStokTahminleri(): StokTahmin[] {
  return state.urunler
    .filter(u => u.aktif && u.tip !== 'hizmet')
    .map(u => urunTahmini(u, state.hareketler.filter(h => h.urunId === u.id)))
}
