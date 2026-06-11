// Octo — Insight Schema
// Every warning Octo produces must be traceable: source records, the actual
// calculation, data freshness, what's missing, confidence, the rule applied,
// the recommended action, and who owns it.
//
// Insights are computed DETERMINISTICALLY by detectors reading live stores.
// The LLM may phrase narratives, but only the engine proves claims.

export type InsightSeverity = 'kritik' | 'dikkat' | 'stabil'

export type Confidence = 'yuksek' | 'orta' | 'dusuk'

// A pointer to an actual record in a layer's store
export interface InsightSource {
  layer: 'finans' | 'vergi' | 'hukuk' | 'ik' | 'operasyon'
  recordType: string   // 'beyanname' | 'invoice' | 'account' | ...
  recordId: string     // the actual id in the store
  label: string        // human-readable: "KDV Beyannamesi 2026-05"
  value?: string       // the relevant figure: "228.300 TL"
}

export interface Insight {
  id: string
  severity: InsightSeverity
  baslik: string             // title
  ozet: string               // one-line summary shown collapsed

  // Traceability — the eight receipts
  kaynaklar: InsightSource[] // source records
  hesaplama: string          // the calculation, with real numbers
  veriGuncelligi: string     // data freshness
  eksikVeri: string[]        // missing information that could change the picture
  guven: Confidence          // confidence
  kural: string              // applicable rule (legal/financial)
  oneri: string              // recommended action
  sorumlu: string            // responsible person/role
}

export const confidenceLabels: Record<Confidence, string> = {
  yuksek: 'Yüksek',
  orta: 'Orta',
  dusuk: 'Düşük',
}

export const severityLabels: Record<InsightSeverity, string> = {
  kritik: 'Kritik',
  dikkat: 'Dikkat',
  stabil: 'Stabil',
}
