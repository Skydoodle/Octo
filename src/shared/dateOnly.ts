// Date-only helpers. Business dates are calendar values, not instants, so they
// must never pass through local-midnight -> UTC conversions.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

function parts(value: string): [number, number, number] | null {
  const match = DATE_ONLY.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null
  return [year, month, day]
}

export function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && parts(value) !== null
}

export function dateOnlyFromLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateOnlyToEpochMs(value: string): number | null {
  const parsed = parts(value)
  return parsed ? Date.UTC(parsed[0], parsed[1] - 1, parsed[2]) : null
}

export function addDateOnlyDays(value: string, days: number): string | null {
  const ms = dateOnlyToEpochMs(value)
  if (ms === null || !Number.isFinite(days)) return null
  return new Date(ms + Math.round(days) * DAY_MS).toISOString().slice(0, 10)
}

export function calendarDaysBetween(from: string, to: string): number | null {
  const fromMs = dateOnlyToEpochMs(from)
  const toMs = dateOnlyToEpochMs(to)
  if (fromMs === null || toMs === null) return null
  return Math.round((toMs - fromMs) / DAY_MS)
}

export function lastDayOfCurrentMonth(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0))
    .toISOString()
    .slice(0, 10)
}

export function lastDayOfFollowingMonth(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 2, 0))
    .toISOString()
    .slice(0, 10)
}

export function dateOnlyForPeriodDay(period: string, requestedDay: number): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match || !Number.isInteger(requestedDay) || requestedDay < 1 || requestedDay > 31) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || month < 1 || month > 12) return null
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const day = Math.min(requestedDay, lastDay)
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function lastDayOfPeriod(period: string): string | null {
  return dateOnlyForPeriodDay(period, 31)
}

export function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
