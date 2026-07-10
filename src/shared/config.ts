// Octo — App-wide config & demo control
//
// Demo mode can be controlled two ways:
//   1. Build default: DEMO_MODE_DEFAULT below (false = ships empty/honest).
//   2. Runtime override: a localStorage flag set by the landing page buttons,
//      so anyone can load or clear the demo dataset without touching code.
//
// isDemoMode() is what the stores read at load. The landing "Demoyu gor" button
// calls enableDemo(); "Bos basla" calls disableDemo().

const DEMO_MODE_DEFAULT = false
const DEMO_FLAG_KEY = 'octo:demo-mode'

export function isDemoMode(): boolean {
  try {
    const v = localStorage.getItem(DEMO_FLAG_KEY)
    if (v === '1') return true
    if (v === '0') return false
  } catch {
    // localStorage unavailable -> fall back to build default
  }
  return DEMO_MODE_DEFAULT
}

// Back-compat: some modules import DEMO_MODE directly. Reflects the effective
// mode at module-load time.
export const DEMO_MODE = isDemoMode()

// Turn the demo dataset ON: set the flag, seed every store, persist.
export function enableDemo(): void {
  try {
    localStorage.setItem(DEMO_FLAG_KEY, '1')
  } catch { /* ignore */ }
  // Lazy imports avoid a circular dependency (stores import this file).
  void import('../layers/finance/financeStore').then(m => m.seedFinanceDemo())
  void import('../layers/tax/taxStore').then(m => m.seedTaxDemo())
  void import('../layers/hr/hrStore').then(m => m.seedIKDemo())
  void import('../layers/operations/opStore').then(m => m.seedOpDemo())
  void import('../settings/companyObligationSettings').then(m => m.seedCompanyObligationSettingsDemo())
}

// Turn the demo dataset OFF: set the flag, clear every store back to empty.
export function disableDemo(): void {
  try {
    localStorage.setItem(DEMO_FLAG_KEY, '0')
  } catch { /* ignore */ }
  void import('../layers/finance/financeStore').then(m => m.clearFinance())
  void import('../layers/tax/taxStore').then(m => m.clearTax())
  void import('../layers/hr/hrStore').then(m => m.clearIK())
  void import('../layers/operations/opStore').then(m => m.clearOp())
  void import('../settings/companyObligationSettings').then(m => m.clearCompanyObligationSettings())
}
