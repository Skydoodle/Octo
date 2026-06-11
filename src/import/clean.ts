// Octo — Excel Import — Turkish data cleaning
// The hard part of importing: Turkish spreadsheets format numbers and dates
// the opposite of what JS expects. This module normalizes messy cell values.

// A single dot with exactly 3 trailing digits ("1.234") is ambiguous:
// Turkish thousands (1234) or English decimal (1.234). Resolve at column
// level: if ANY cell in the column has a comma, the column is Turkish-formatted
// and lone dots are thousands separators.
export type NumberFormatHint = 'tr' | 'en' | 'auto'

// Inspect a column of raw values and decide its number format.
export function detectColumnNumberFormat(values: unknown[]): NumberFormatHint {
  let hasComma = false
  let hasAmbiguousDot = false
  for (const v of values) {
    const s = String(v ?? '')
    if (s.includes(',')) hasComma = true
    if (/^\s*\d{1,3}(\.\d{3})+\s*$/.test(s)) hasAmbiguousDot = true // 1.234 or 1.234.567
  }
  if (hasComma) return 'tr'          // comma present -> Turkish decimals, dots are thousands
  if (hasAmbiguousDot) return 'tr'   // 1.234.567 pattern -> thousands
  return 'auto'
}

// Turkish number: "1.234,56" (dot thousands, comma decimal) -> 1234.56
export function parseTurkishNumber(raw: unknown, hint: NumberFormatHint = 'auto'): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number') return raw

  let s = String(raw).trim()
  if (!s) return null

  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }

  s = s.replace(/[₺$€\s]/g, '').replace(/tl/gi, '').replace(/[^\d.,-]/g, '')
  if (s.startsWith('-')) { negative = true; s = s.slice(1) }
  if (!s) return null

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')

  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.')   // Turkish
    } else {
      s = s.replace(/,/g, '')                       // English
    }
  } else if (hasComma) {
    s = s.replace(',', '.')                          // comma decimal (Turkish)
  } else if (hasDot) {
    // lone dot(s) — the ambiguous case
    const dotCount = (s.match(/\./g) || []).length
    if (dotCount > 1) {
      s = s.replace(/\./g, '')                       // 1.234.567 -> thousands
    } else if (/^\d{1,3}\.\d{3}$/.test(s) && hint === 'tr') {
      s = s.replace('.', '')                          // 1.234 as thousands per column hint
    }
    // otherwise treat the dot as a decimal point (default)
  }

  const n = parseFloat(s)
  if (Number.isNaN(n)) return null
  return negative ? -n : n
}

// Turkish date: "31.05.2026", "31/05/2026", "2026-05-31", Excel serial number
// Returns ISO "YYYY-MM-DD" or null
export function parseTurkishDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null

  // Excel serial date number (days since 1899-12-30)
  if (typeof raw === 'number' && raw > 59 && raw < 80000) {
    const ms = Math.round((raw - 25569) * 86400 * 1000)
    const d = new Date(ms)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }

  const s = String(raw).trim()
  if (!s) return null

  // already ISO
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  // GG.AA.YYYY or GG/AA/YYYY or GG-AA-YYYY
  m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/)
  if (m) {
    let [, dd, mm, yyyy] = m
    if (yyyy.length === 2) yyyy = '20' + yyyy
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  // fallback: let Date try
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

// Parse a KDV rate that might be "20", "%20", "0.20", "20%"
export function parseKdvRate(raw: unknown): number | null {
  const n = parseTurkishNumber(String(raw).replace(/%/g, ''))
  if (n === null) return null
  // 0.20 -> 20
  if (n > 0 && n < 1) return Math.round(n * 100)
  return Math.round(n)
}

// Normalize a header string for matching: lowercase, strip Turkish accents, trim
export function normalizeHeader(h: string): string {
  return String(h)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}
