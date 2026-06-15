// Octo — Excel Import — Auto-mapper
// Looks at a raw sheet, finds the header row, and guesses which column maps
// to which Octo invoice field. The user confirms/corrects afterward.

import { normalizeHeader, parseTurkishNumber, parseTurkishDate } from './clean'

// The Octo invoice fields an imported column can map to
export type InvoiceField =
  | 'contactName'
  | 'contactTaxId'
  | 'issueDate'
  | 'dueDate'
  | 'amount'      // net (KDV haric)
  | 'vatRate'
  | 'vatAmount'
  | 'total'       // KDV dahil
  | 'description'
  | 'type'        // sales / purchase
  | 'status'      // durum (ödendi / gönderildi / ...)
  | 'ignore'

export const fieldLabels: Record<InvoiceField, string> = {
  contactName: 'Müşteri / Tedarikçi',
  contactTaxId: 'VKN / TCKN',
  issueDate: 'Fatura Tarihi',
  dueDate: 'Vade Tarihi',
  amount: 'Tutar (KDV hariç)',
  vatRate: 'KDV Oranı',
  vatAmount: 'KDV Tutarı',
  total: 'Genel Toplam',
  description: 'Açıklama',
  type: 'Tür (Satış/Alış)',
  status: 'Durum',
  ignore: '— Kullanma —',
}

// Header keywords -> field. Normalized (accent-free, lowercase) matching.
const headerHints: { field: InvoiceField; keys: string[] }[] = [
  { field: 'contactName', keys: ['musteri', 'cari', 'unvan', 'firma', 'tedarikci', 'alici', 'satici', 'isim', 'ad'] },
  { field: 'contactTaxId', keys: ['vkn', 'tckn', 'vergino', 'vergikimlik', 'tcno', 'kimlikno'] },
  { field: 'issueDate', keys: ['faturatarihi', 'tarih', 'duzenlemetarihi', 'belgetarihi'] },
  { field: 'dueDate', keys: ['vade', 'vadetarihi', 'odemetarihi', 'sonodeme'] },
  { field: 'amount', keys: ['tutar', 'matrah', 'netutar', 'net', 'mathar', 'kdvharic', 'aratoplam'] },
  { field: 'vatRate', keys: ['kdvorani', 'kdvyuzde', 'oran', 'kdv'] },
  { field: 'vatAmount', keys: ['kdvtutari', 'kdvtutar', 'vergitutari'] },
  { field: 'total', keys: ['geneltoplam', 'toplam', 'kdvdahil', 'tutartoplam', 'odenecek'] },
  { field: 'description', keys: ['aciklama', 'not', 'detay', 'urun', 'hizmet', 'kalem'] },
  { field: 'type', keys: ['tur', 'tip', 'faturatipi', 'islemturu'] },
  { field: 'status', keys: ['durum', 'statu', 'odeme', 'odendi', 'tahsilat'] },
]

export interface ParsedSheet {
  headers: string[]
  rows: unknown[][]       // data rows only (header row excluded)
  headerRowIndex: number
}

// Given a 2D array of all cells, find the most likely header row.
// Heuristic: the first row where most cells are non-empty strings and at
// least one matches a known header keyword.
export function detectHeaderRow(matrix: unknown[][]): number {
  let best = 0
  let bestScore = -1
  const scan = Math.min(matrix.length, 15)
  for (let r = 0; r < scan; r++) {
    const row = matrix[r] || []
    const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '')
    if (nonEmpty.length < 2) continue
    let score = nonEmpty.length
    for (const cell of nonEmpty) {
      const n = normalizeHeader(String(cell))
      if (headerHints.some(h => h.keys.some(k => n.includes(k)))) score += 5
    }
    // prefer rows that are mostly text (headers aren't numbers)
    const textRatio = nonEmpty.filter(c => typeof c === 'string' && parseTurkishNumber(c) === null).length / nonEmpty.length
    score += textRatio * 3
    if (score > bestScore) { bestScore = score; best = r }
  }
  return best
}

export function parseSheetMatrix(matrix: unknown[][]): ParsedSheet {
  const headerRowIndex = detectHeaderRow(matrix)
  const headerRow = matrix[headerRowIndex] || []
  const headers = headerRow.map((h, i) =>
    h !== null && h !== undefined && String(h).trim() !== '' ? String(h).trim() : `Sütun ${i + 1}`
  )
  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter(r => r.some(c => c !== null && c !== undefined && String(c).trim() !== '')) // drop empty rows
  return { headers, rows, headerRowIndex }
}

// Guess a field for each column. Returns array aligned to headers.
export function autoMap(sheet: ParsedSheet): InvoiceField[] {
  const { headers, rows } = sheet
  const used = new Set<InvoiceField>()

  return headers.map((header, col) => {
    const n = normalizeHeader(header)

    // 1) header-name match (longest keyword wins, skip already-used unique fields)
    let bestField: InvoiceField | null = null
    let bestLen = 0
    for (const h of headerHints) {
      for (const k of h.keys) {
        if (n.includes(k) && k.length > bestLen && !used.has(h.field)) {
          bestField = h.field; bestLen = k.length
        }
      }
    }
    if (bestField) { used.add(bestField); return bestField }

    // 2) value-shape fallback on a sample of the column
    const sample = rows.slice(0, 20).map(r => r[col]).filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    if (sample.length === 0) return 'ignore'

    const dateHits = sample.filter(v => parseTurkishDate(v) !== null).length
    const numHits = sample.filter(v => parseTurkishNumber(v) !== null).length

    if (dateHits / sample.length > 0.7 && !used.has('issueDate')) { used.add('issueDate'); return 'issueDate' }
    if (numHits / sample.length > 0.7 && !used.has('total')) { used.add('total'); return 'total' }

    return 'ignore'
  })
}
