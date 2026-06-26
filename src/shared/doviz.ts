// Octo — Döviz (Currency) Modülü
// Holds the USD/TRY rate and converts balances for display. The rate is
// user-editable and persisted; a live FX API can be wired in later. Default is
// a recent rate (≈46.44, June 2026) so figures are sensible out of the box.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from './store/persist'

export type ParaBirimi = 'TRY' | 'USD'

interface DovizState {
  usdTry: number          // 1 USD = X TRY
  guncellenme: string     // ISO date of last manual update
}

const KEY = 'doviz'
const DEFAULT_RATE = 46.44 // ~June 2026; user can update in UI

let state: DovizState = loadOrSeed<DovizState>(KEY, {
  usdTry: DEFAULT_RATE,
  guncellenme: new Date().toISOString().slice(0, 10),
})

const listeners = new Set<() => void>()
function emit() { save(KEY, state); listeners.forEach(l => l()) }
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l) }

export function getDovizState(): DovizState { return state }
export function useDoviz(): DovizState {
  return useSyncExternalStore(subscribe, getDovizState, getDovizState)
}

export function setUsdTry(rate: number) {
  if (rate > 0) {
    state = { usdTry: rate, guncellenme: new Date().toISOString().slice(0, 10) }
    emit()
  }
}

// Convert a TRY amount to the target display currency.
export function cevir(tryTutar: number, hedef: ParaBirimi, rate = state.usdTry): number {
  if (hedef === 'TRY') return tryTutar
  return rate > 0 ? tryTutar / rate : 0
}

// Format an amount in the given currency with the right symbol.
export function formatPara(tutar: number, birim: ParaBirimi): string {
  const sembol = birim === 'TRY' ? '₺' : '$'
  return sembol + Math.round(tutar).toLocaleString(birim === 'TRY' ? 'tr-TR' : 'en-US')
}

// Convenience: format a TRY amount directly in the target currency.
export function formatCevir(tryTutar: number, hedef: ParaBirimi, rate = state.usdTry): string {
  return formatPara(cevir(tryTutar, hedef, rate), hedef)
}

// ── TCMB canlı kur çekme ─────────────────────────────────────────────────
// TCMB publishes the official daily rate as keyless XML at
// www.tcmb.gov.tr/kurlar/today.xml. We read USD ForexSelling (satış) — the rate
// businesses value foreign currency at. Direct browser fetch is blocked by CORS
// (TCMB sends no Access-Control-Allow-Origin), so until Octo has a backend we
// try a couple of public read proxies and fall back gracefully to the manual
// rate. When the backend exists, point TCMB_ENDPOINTS at the server route and
// it works with no CORS issue and can run daily.

export type KurKaynak = 'tcmb' | 'manuel' | 'hata'

export interface KurSonuc {
  rate: number | null
  kaynak: KurKaynak
  mesaj: string
}

// Ordered fetch strategies. First entry is the direct URL (works from a backend
// or if CORS is ever allowed); the rest are public CORS read-proxies for the
// browser-only phase. All keyless.
const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml'
const TCMB_ENDPOINTS = [
  TCMB_URL,
  'https://api.allorigins.win/raw?url=' + encodeURIComponent(TCMB_URL),
  'https://corsproxy.io/?url=' + encodeURIComponent(TCMB_URL),
]

// Parse USD ForexSelling out of the TCMB XML text.
function parseUsdForexSelling(xml: string): number | null {
  // Find the <Currency ... Kod="USD"> ... </Currency> block, then ForexSelling.
  const usdBlock = xml.match(/<Currency[^>]*Kod="USD"[\s\S]*?<\/Currency>/i)
  const target = usdBlock ? usdBlock[0] : xml
  const m = target.match(/<ForexSelling>\s*([\d.,]+)\s*<\/ForexSelling>/i)
  if (!m) return null
  const val = parseFloat(m[1].replace(',', '.'))
  return isNaN(val) || val <= 0 ? null : val
}

// Try to fetch the live TCMB USD/TRY rate. Resolves with source info; never
// throws — on any failure returns the current manual rate with kaynak='manuel'.
export async function fetchTcmbUsdTry(): Promise<KurSonuc> {
  for (const url of TCMB_ENDPOINTS) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/xml, text/xml, text/plain' } })
      if (!res.ok) continue
      const text = await res.text()
      const rate = parseUsdForexSelling(text)
      if (rate) {
        setUsdTry(rate)
        return { rate, kaynak: 'tcmb', mesaj: `TCMB güncel kuru alındı: 1$ = ₺${rate.toFixed(4)}` }
      }
    } catch {
      // try next endpoint
    }
  }
  return {
    rate: state.usdTry,
    kaynak: 'manuel',
    mesaj: 'TCMB kuru otomatik alınamadı (tarayıcı kısıtı). Kuru elle girebilirsin; backend eklendiğinde otomatik güncellenecek.',
  }
}
