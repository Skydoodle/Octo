// Octo — Vergi Excel Import — Row builder & validator
// Turns mapped, cleaned cells into Beyanname objects, normalizing free-text
// Turkish labels into the schema enums (type, status, period).

import type { Beyanname, BeyannameType, BeyannameStatus, Period } from '../layers/tax/types'
import { parseTurkishNumber, parseTurkishDate, detectColumnNumberFormat, type NumberFormatHint } from './clean'
import { normalizeHeader } from './clean'
import type { BeyannameField, ParsedSheet } from './automapTax'

export interface BuiltTaxRow {
  index: number
  beyanname: Beyanname | null
  errors: string[]
  warnings: string[]
  raw: Record<string, string>
}

// Map a free-text type label to the enum.
function normalizeType(s: string): BeyannameType | null {
  const n = normalizeHeader(s)
  if (n.includes('kdv') || n.includes('katmadeger')) return 'kdv'
  if (n.includes('muhtasar') || n.includes('primhizmet')) return 'muhtasar'
  if (n.includes('gecici')) return 'gecici'
  if (n.includes('kurumlar')) return 'kurumlar'
  if (n.includes('damga')) return 'damga'
  if (n.includes('stopaj')) return 'stopaj'
  if (n.includes('sgk') || n.includes('prim')) return 'sgk'
  return null
}

function normalizeStatus(s: string): BeyannameStatus {
  const n = normalizeHeader(s)
  if (n.includes('odendi') || n.includes('odend')) return 'odendi'
  if (n.includes('gonderildi') || n.includes('beyan')) return 'gonderildi'
  if (n.includes('gecikti') || n.includes('gecik')) return 'gecikti'
  if (n.includes('hazir')) return 'hazir'
  return 'taslak'
}

function normalizePeriod(s: string, type: BeyannameType | null): Period {
  const n = normalizeHeader(s)
  if (n.includes('yillik') || n.includes('yil')) return 'yillik'
  if (n.includes('ucaylik') || n.includes('uc') || n.includes('ceyrek') || n.includes('quarter') || n.includes('q')) return 'ucaylik'
  if (n.includes('aylik') || n.includes('ay')) return 'aylik'
  // fall back by type
  if (type === 'kurumlar') return 'yillik'
  if (type === 'gecici') return 'ucaylik'
  return 'aylik'
}

function colFor(mapping: BeyannameField[], field: BeyannameField): number {
  return mapping.indexOf(field)
}

export function buildTaxRows(sheet: ParsedSheet, mapping: BeyannameField[]): BuiltTaxRow[] {
  const { rows } = sheet

  const numericFields: BeyannameField[] = ['matrah', 'hesaplananVergi']
  const hints: Partial<Record<BeyannameField, NumberFormatHint>> = {}
  for (const f of numericFields) {
    const col = colFor(mapping, f)
    if (col >= 0) hints[f] = detectColumnNumberFormat(rows.map(r => r[col]))
  }
  const num = (r: unknown[], f: BeyannameField): number | null => {
    const col = colFor(mapping, f)
    if (col < 0) return null
    return parseTurkishNumber(r[col], hints[f] ?? 'auto')
  }
  const str = (r: unknown[], f: BeyannameField): string => {
    const col = colFor(mapping, f)
    if (col < 0) return ''
    const v = r[col]
    return v === null || v === undefined ? '' : String(v).trim()
  }

  return rows.map((r, index) => {
    const errors: string[] = []
    const warnings: string[] = []

    const type = normalizeType(str(r, 'type'))
    if (!type) errors.push('Beyanname türü tanınmadı')

    const donem = str(r, 'donem')
    if (!donem) warnings.push('Dönem boş')

    const matrah = num(r, 'matrah') ?? 0
    let hesaplananVergi = num(r, 'hesaplananVergi')
    if (hesaplananVergi === null) {
      hesaplananVergi = 0
      warnings.push('Hesaplanan vergi okunamadı; 0 alındı')
    }

    const sonCol = colFor(mapping, 'sonTarih')
    const sonTarih = sonCol >= 0 ? parseTurkishDate(r[sonCol]) : null
    if (sonCol >= 0 && !sonTarih) warnings.push('Son tarih okunamadı')

    const status = normalizeStatus(str(r, 'status'))
    const period = normalizePeriod(str(r, 'period'), type)

    const raw: Record<string, string> = {
      type: type ?? str(r, 'type'),
      donem,
      status,
      matrah: matrah.toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
      hesaplananVergi: (hesaplananVergi ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
      sonTarih: sonTarih ?? '',
    }

    const beyanname: Beyanname | null = errors.length === 0 && type ? {
      id: 'imp' + Date.now() + '-' + index,
      type,
      donem: donem || '2026',
      period,
      status,
      matrah,
      hesaplananVergi: hesaplananVergi ?? 0,
      sonTarih: sonTarih ?? new Date().toISOString().slice(0, 10),
      aciklama: str(r, 'aciklama'),
    } : null

    return { index, beyanname, errors, warnings, raw }
  })
}
