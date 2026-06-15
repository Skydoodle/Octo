// Octo — Vergi Excel Import — Auto-mapper
// Mirrors the finance import's automap, but for beyanname fields. Detects the
// header row and guesses which column maps to which tax field.

import { normalizeHeader, parseTurkishNumber, parseTurkishDate } from './clean'
import { parseSheetMatrix, type ParsedSheet } from './automap'

export type BeyannameField =
  | 'type'            // beyanname türü
  | 'donem'           // dönem (2026-05 / 2026-Q1 / 2025)
  | 'period'          // aylık / üç aylık / yıllık
  | 'status'          // durum
  | 'matrah'          // tax base
  | 'hesaplananVergi' // calculated tax
  | 'sonTarih'        // deadline
  | 'aciklama'
  | 'ignore'

export const taxFieldLabels: Record<BeyannameField, string> = {
  type: 'Beyanname Türü',
  donem: 'Dönem',
  period: 'Periyot',
  status: 'Durum',
  matrah: 'Matrah',
  hesaplananVergi: 'Hesaplanan Vergi',
  sonTarih: 'Son Tarih',
  aciklama: 'Açıklama',
  ignore: '— Kullanma —',
}

const headerHints: { field: BeyannameField; keys: string[] }[] = [
  { field: 'type', keys: ['beyannameturu', 'beyanname', 'tur', 'tip', 'vergituru', 'belgeturu'] },
  { field: 'donem', keys: ['donem', 'period', 'ay', 'vergidonemi'] },
  { field: 'period', keys: ['periyot', 'siklik', 'aylikyillik'] },
  { field: 'status', keys: ['durum', 'statu', 'hal'] },
  { field: 'matrah', keys: ['matrah', 'vergimatrahi', 'taban'] },
  { field: 'hesaplananVergi', keys: ['hesaplananvergi', 'vergi', 'tahakkuk', 'odenecekvergi', 'vergitutari'] },
  { field: 'sonTarih', keys: ['sontarih', 'sonodeme', 'vade', 'tarih', 'beyantarihi'] },
  { field: 'aciklama', keys: ['aciklama', 'not', 'detay'] },
]

export function autoMapTax(sheet: ParsedSheet): BeyannameField[] {
  const { headers, rows } = sheet
  const used = new Set<BeyannameField>()

  return headers.map((header, col) => {
    const n = normalizeHeader(header)

    let bestField: BeyannameField | null = null
    let bestLen = 0
    for (const h of headerHints) {
      for (const k of h.keys) {
        if (n.includes(k) && k.length > bestLen && !used.has(h.field)) {
          bestField = h.field; bestLen = k.length
        }
      }
    }
    if (bestField) { used.add(bestField); return bestField }

    // value-shape fallback
    const sample = rows.slice(0, 20).map(r => r[col]).filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    if (sample.length === 0) return 'ignore'

    const dateHits = sample.filter(v => parseTurkishDate(v) !== null).length
    const numHits = sample.filter(v => parseTurkishNumber(v) !== null).length

    if (dateHits / sample.length > 0.7 && !used.has('sonTarih')) { used.add('sonTarih'); return 'sonTarih' }
    if (numHits / sample.length > 0.7 && !used.has('matrah')) { used.add('matrah'); return 'matrah' }

    return 'ignore'
  })
}

export { parseSheetMatrix }
export type { ParsedSheet }
