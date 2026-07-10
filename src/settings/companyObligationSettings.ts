import { useSyncExternalStore } from 'react'
import { isDemoMode } from '../shared/config'
import { dateOnlyForPeriodDay, lastDayOfPeriod } from '../shared/dateOnly'
import { loadOrSeed, save } from '../shared/store/persist'

export type CompanyBaseCurrency = 'TRY' | 'USD' | 'EUR'

export type SalaryPaymentRule =
  | { mode: 'fixed_day'; day: number }
  | { mode: 'month_end' }

export interface CompanyObligationSettings {
  version: 1
  baseCurrency: CompanyBaseCurrency
  salaryPaymentRule?: SalaryPaymentRule
}

const KEY = 'company-obligation-settings'
const productionDefault: CompanyObligationSettings = { version: 1, baseCurrency: 'TRY' }
const demoDefault: CompanyObligationSettings = {
  version: 1,
  baseCurrency: 'TRY',
  salaryPaymentRule: { mode: 'month_end' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function baseCurrency(value: unknown): CompanyBaseCurrency {
  return value === 'USD' || value === 'EUR' || value === 'TRY' ? value : 'TRY'
}

function normalizeSalaryPaymentRule(value: unknown): SalaryPaymentRule | undefined {
  if (!isRecord(value)) return undefined
  if (value.mode === 'month_end') return { mode: 'month_end' }
  if (value.mode !== 'fixed_day') return undefined
  const day = value.day
  return typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 31
    ? { mode: 'fixed_day', day }
    : undefined
}

export function normalizeCompanyObligationSettings(value: unknown): CompanyObligationSettings {
  if (!isRecord(value)) return productionDefault
  const normalized: CompanyObligationSettings = {
    version: 1,
    baseCurrency: baseCurrency(value.baseCurrency),
  }
  const salaryPaymentRule = normalizeSalaryPaymentRule(value.salaryPaymentRule)
  return salaryPaymentRule ? { ...normalized, salaryPaymentRule } : normalized
}

export function salaryPaymentDate(
  period: string,
  settings: CompanyObligationSettings,
): string | null {
  const rule = normalizeSalaryPaymentRule(settings.salaryPaymentRule)
  if (!rule) return null
  return rule.mode === 'month_end'
    ? lastDayOfPeriod(period)
    : dateOnlyForPeriodDay(period, rule.day)
}

const loaded = loadOrSeed<unknown>(KEY, isDemoMode() ? demoDefault : productionDefault)
let state = normalizeCompanyObligationSettings(loaded)
const listeners = new Set<() => void>()

function emit(): void {
  save(KEY, state)
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCompanyObligationSettings(): CompanyObligationSettings {
  return state
}

export function useCompanyObligationSettings(): CompanyObligationSettings {
  return useSyncExternalStore(subscribe, getCompanyObligationSettings, getCompanyObligationSettings)
}

export function setCompanyObligationSettings(value: CompanyObligationSettings): void {
  state = normalizeCompanyObligationSettings(value)
  emit()
}

export function seedCompanyObligationSettingsDemo(): void {
  state = demoDefault
  emit()
}

export function clearCompanyObligationSettings(): void {
  state = productionDefault
  emit()
}
