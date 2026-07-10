import { describe, expect, it } from 'vitest'
import { buildDataCoverageFromStates, type DataCoverageFreshness } from '../coverage/dataCoverage'
import { normalizePersistedSiparis } from '../layers/operations/opStore'
import type { Siparis } from '../layers/operations/types'
import type { Personel } from '../layers/hr/types'
import type { Invoice } from '../layers/finance/types'
import {
  normalizeCompanyObligationSettings,
  salaryPaymentDate,
} from '../settings/companyObligationSettings'
import { runReasoningEngine } from './engine'
import { buildReasoningSignalsFromStates, type ReasoningSourceStates } from './signalAdapters'

const NOW = new Date('2026-07-10T07:00:00.000Z')
const FRESHNESS: DataCoverageFreshness = {
  finance: 'finans-taze',
  tax: 'vergi-taze',
  hr: 'ik-taze',
  operations: 'operasyon-taze',
  settings: 'ayar-taze',
}

function emptySources(): ReasoningSourceStates {
  return {
    finance: { accounts: [], invoices: [], transactions: [] },
    tax: { beyannameler: [], compliance: [] },
    hr: { personeller: [], puantajlar: [], izinler: [] },
    operations: {
      urunler: [], hareketler: [], siparisler: [], sevkiyatlar: [],
      receteler: [], uretimler: [], tedarikciler: [],
    },
    settings: { version: 1, baseCurrency: 'TRY' },
  }
}

function person(overrides: Partial<Personel> = {}): Personel {
  return {
    id: 'p1', ad: 'Ayşe', soyad: 'Yılmaz', tcKimlik: '11111111111',
    iseGirisTarihi: '2026-01-01', brutMaas: 50_000, departman: 'Operasyon',
    pozisyon: 'Uzman', sgkDurumu: 'normal', calismaSekli: 'tam_zamanli',
    sgkIndirimli: false, aktif: true, ...overrides,
  }
}

function purchaseOrder(overrides: Partial<Siparis> = {}): Siparis {
  return {
    id: 'po1', no: 'PO-1', tur: 'alis', cariId: 'supplier', cariUnvan: 'Tedarikçi',
    tarih: '2026-07-01', teslimTarihi: '2026-07-15', durum: 'onaylandi',
    paraBirimi: 'TRY', odemeDurumu: 'bekliyor', faturalandi: false,
    satirlar: [{ urunId: 'u1', miktar: 10, birimFiyat: 100, kdvOrani: 20, sevkEdilen: 0 }],
    ...overrides,
  }
}

function purchaseInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv1', type: 'purchase', contactName: 'Tedarikçi', contactTaxId: '',
    amount: 1_000, vatAmount: 200, total: 1_200, vatRate: 20, currency: 'TRY',
    issueDate: '2026-07-15', dueDate: '2026-07-25', status: 'sent', description: '',
    sourceOrderId: 'po1', ...overrides,
  }
}

function addCash(sources: ReasoningSourceStates, balance = 10_000): void {
  sources.finance.accounts.push({ id: 'cash', name: 'Banka', iban: '', currency: 'TRY', balance })
}

describe('company obligation scheduling', () => {
  it('uses a fixed salary payment day', () => {
    const sources = emptySources()
    sources.hr.personeller.push(person())
    sources.settings = { version: 1, baseCurrency: 'TRY', salaryPaymentRule: { mode: 'fixed_day', day: 5 } }
    const salary = buildReasoningSignalsFromStates(sources, NOW).find(signal => signal.obligation?.category === 'salary')
    expect(salary?.eventDate).toBe('2026-07-05')
    expect(salary?.metadata?.missingPaymentDate).toBe(false)
  })

  it('uses the final day of the payroll month', () => {
    const sources = emptySources()
    sources.hr.personeller.push(person())
    sources.settings = { version: 1, baseCurrency: 'TRY', salaryPaymentRule: { mode: 'month_end' } }
    expect(buildReasoningSignalsFromStates(sources, NOW).find(signal => signal.obligation?.category === 'salary')?.eventDate)
      .toBe('2026-07-31')
  })

  it('clamps fixed days for February and short months without timezone shifts', () => {
    const settings = { version: 1 as const, baseCurrency: 'TRY' as const, salaryPaymentRule: { mode: 'fixed_day' as const, day: 31 } }
    expect(salaryPaymentDate('2026-02', settings)).toBe('2026-02-28')
    expect(salaryPaymentDate('2026-04', settings)).toBe('2026-04-30')
    expect(normalizeCompanyObligationSettings({ baseCurrency: 'TRY', salaryPaymentRule: { mode: 'fixed_day', day: 32 } }).salaryPaymentRule)
      .toBeUndefined()
  })

  it('creates a data-gap case when salary timing is missing', () => {
    const sources = emptySources()
    addCash(sources)
    sources.hr.personeller.push(person())
    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.find(signal => signal.obligation?.category === 'salary')?.eventDate).toBeUndefined()
    const gap = runReasoningEngine(signals, NOW, 'TRY').find(item => item.ruleId === 'liquidity-data-gap')
    expect(gap?.missingData).toContain('Maaş ödeme günü ayarlanmamış; maaşlar tarihli nakit takvimine eklenmedi.')
  })
})

describe('purchase-order scheduling and reconciliation', () => {
  it('schedules an uncovered purchase order only on its explicit payment date', () => {
    const sources = emptySources()
    sources.operations.siparisler.push(purchaseOrder({ odemeTarihi: '2026-07-25' }))
    expect(buildReasoningSignalsFromStates(sources, NOW).find(signal => signal.id === 'operations:purchase-order:po1'))
      .toEqual(expect.objectContaining({ eventDate: '2026-07-25', amount: 1_200, currency: 'TRY' }))
  })

  it('keeps an undated purchase order out of the dated calendar and creates a data gap', () => {
    const sources = emptySources()
    addCash(sources)
    sources.operations.siparisler.push(purchaseOrder())
    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.find(signal => signal.id === 'operations:purchase-order:po1')?.eventDate).toBeUndefined()
    expect(runReasoningEngine(signals, NOW, 'TRY').find(item => item.ruleId === 'liquidity-data-gap')?.missingData)
      .toContain('1 alış siparişinde teyit edilmiş ödeme tarihi yok.')
  })

  it('removes the order remainder when a valid invoice fully covers it', () => {
    const sources = emptySources()
    sources.operations.siparisler.push(purchaseOrder({ odemeTarihi: '2026-07-25', faturaIds: ['inv1'] }))
    sources.finance.invoices.push(purchaseInvoice())
    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.find(signal => signal.id === 'finance:invoice:inv1')).toBeDefined()
    expect(signals.find(signal => signal.id === 'operations:purchase-order:po1')).toBeUndefined()
  })

  it('leaves only the uncovered amount after partial invoicing', () => {
    const sources = emptySources()
    sources.operations.siparisler.push(purchaseOrder({ odemeTarihi: '2026-07-25', faturaIds: ['inv1'] }))
    sources.finance.invoices.push(purchaseInvoice({ amount: 500, vatAmount: 100, total: 600 }))
    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.find(signal => signal.id === 'finance:invoice:inv1')?.amount).toBe(600)
    expect(signals.find(signal => signal.id === 'operations:purchase-order:po1')?.amount).toBe(600)
  })

  it('fails safely when an explicit invoice link was deleted', () => {
    const sources = emptySources()
    sources.operations.siparisler.push(purchaseOrder({
      odemeTarihi: '2026-07-25', faturalandi: true, faturaId: 'deleted', faturaIds: ['deleted'],
    }))
    const residual = buildReasoningSignalsFromStates(sources, NOW)
      .find(signal => signal.id === 'operations:purchase-order:po1')
    expect(residual?.amount).toBe(1_200)
    expect(residual?.confidence).toBe('low')
    expect(residual?.metadata?.invalidLinkCount).toBe(1)
  })

  it('keeps multiple purchase orders linked to separate invoices independent', () => {
    const sources = emptySources()
    sources.operations.siparisler.push(
      purchaseOrder({ id: 'po1', no: 'PO-1', faturaIds: ['inv1'] }),
      purchaseOrder({ id: 'po2', no: 'PO-2', faturaIds: ['inv2'] }),
    )
    sources.finance.invoices.push(
      purchaseInvoice({ id: 'inv1', sourceOrderId: 'po1' }),
      purchaseInvoice({ id: 'inv2', sourceOrderId: 'po2' }),
    )
    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.filter(signal => signal.id.startsWith('finance:invoice:'))).toHaveLength(2)
    expect(signals.filter(signal => signal.id.startsWith('operations:purchase-order:'))).toHaveLength(0)
  })

  it('blocks conflicting legacy links instead of applying one invoice to two orders', () => {
    const sources = emptySources()
    addCash(sources)
    sources.operations.siparisler.push(
      purchaseOrder({ id: 'po1', no: 'PO-1', faturaIds: ['shared'] }),
      purchaseOrder({ id: 'po2', no: 'PO-2', faturaIds: ['shared'] }),
    )
    sources.finance.invoices.push(purchaseInvoice({ id: 'shared', sourceOrderId: undefined }))
    const signals = buildReasoningSignalsFromStates(sources, NOW)
    const blockedOrders = signals.filter(signal => signal.id.startsWith('operations:purchase-order:'))
    expect(blockedOrders).toHaveLength(2)
    expect(blockedOrders.every(signal => signal.amount === undefined && signal.metadata?.calculationBlocked === true)).toBe(true)
    expect(signals.filter(signal => signal.kind === 'cash_outflow' && typeof signal.amount === 'number')
      .reduce((sum, signal) => sum + (signal.amount ?? 0), 0)).toBe(1_200)
    expect(runReasoningEngine(signals, NOW, 'TRY').find(item => item.ruleId === 'liquidity-data-gap')?.missingData)
      .toContain('2 alış siparişinde çakışan fatura bağlantısı var; kalan tutar nakit hesabına eklenmedi.')
  })

  it('does not include a foreign-currency obligation in TRY liquidity', () => {
    const sources = emptySources()
    addCash(sources, 2_000)
    sources.finance.invoices.push(purchaseInvoice({ id: 'usd', sourceOrderId: undefined, currency: 'USD', total: 900 }))
    sources.tax.beyannameler.push({
      id: 'tax', type: 'kdv', donem: '2026-06', period: 'aylik', status: 'gonderildi',
      matrah: 500, hesaplananVergi: 100, sonTarih: '2026-07-20', aciklama: '',
    })
    sources.operations.siparisler.push(purchaseOrder({ odemeTarihi: '2026-07-20', satirlar: [
      { urunId: 'u1', miktar: 1, birimFiyat: 200, kdvOrani: 0, sevkEdilen: 0 },
    ] }))
    const cases = runReasoningEngine(buildReasoningSignalsFromStates(sources, NOW), NOW, 'TRY')
    const liquidity = cases.find(item => item.ruleId === 'liquidity-window-collision')
    expect(liquidity?.calculation).toContain('300 TL pencere sonuna kadarki yükümlülük')
    expect(liquidity?.calculation).not.toContain('900')
    expect(cases.find(item => item.ruleId === 'foreign-currency-data-gap')).toBeDefined()
  })

  it('does not double-count a fully invoiced order in liquidity output', () => {
    const sources = emptySources()
    addCash(sources, 2_000)
    sources.operations.siparisler.push(purchaseOrder({ odemeTarihi: '2026-07-20', faturaIds: ['inv1'] }))
    sources.finance.invoices.push(purchaseInvoice({ dueDate: '2026-07-20' }))
    sources.tax.beyannameler.push({
      id: 'tax', type: 'kdv', donem: '2026-06', period: 'aylik', status: 'gonderildi',
      matrah: 500, hesaplananVergi: 100, sonTarih: '2026-07-20', aciklama: '',
    })
    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.filter(signal => signal.id === 'operations:purchase-order:po1')).toHaveLength(0)
    const liquidity = runReasoningEngine(signals, NOW, 'TRY').find(item => item.ruleId === 'liquidity-window-collision')
    expect(liquidity?.calculation).toContain('1.300 TL pencere sonuna kadarki yükümlülük')
    expect(liquidity?.calculation).not.toContain('2.500 TL pencere sonuna kadarki yükümlülük')
  })
})

describe('deterministic data coverage', () => {
  it('marks every domain missing for empty stores', () => {
    const coverage = buildDataCoverageFromStates(emptySources(), NOW, FRESHNESS)
    expect(coverage.domains.map(domain => domain.status)).toEqual(['missing', 'missing', 'missing', 'missing'])
  })

  it('marks Finance partial when obligations exist without a bank balance', () => {
    const sources = emptySources()
    sources.finance.invoices.push(purchaseInvoice({ sourceOrderId: undefined }))
    expect(buildDataCoverageFromStates(sources, NOW, FRESHNESS).domains.find(domain => domain.domain === 'finance')?.status)
      .toBe('partial')
  })

  it('marks HR partial when the salary payment rule is missing', () => {
    const sources = emptySources()
    sources.hr.personeller.push(person())
    const hr = buildDataCoverageFromStates(sources, NOW, FRESHNESS).domains.find(domain => domain.domain === 'hr')
    expect(hr?.status).toBe('partial')
    expect(hr?.explanation).toContain('Maaş ödeme günü eksik')
  })

  it('marks Operations partial when an open purchase order lacks a payment date', () => {
    const sources = emptySources()
    sources.operations.siparisler.push(purchaseOrder())
    const operations = buildDataCoverageFromStates(sources, NOW, FRESHNESS).domains.find(domain => domain.domain === 'operations')
    expect(operations?.status).toBe('partial')
    expect(operations?.explanation).toContain('1 alış siparişinde ödeme tarihi yok')
  })

  it('marks all populated domains ready when required inputs are valid', () => {
    const sources = emptySources()
    addCash(sources)
    sources.tax.beyannameler.push({
      id: 'tax', type: 'kdv', donem: '2026-06', period: 'aylik', status: 'gonderildi',
      matrah: 1_000, hesaplananVergi: 200, sonTarih: '2026-07-28', aciklama: '',
    })
    sources.hr.personeller.push(person())
    sources.hr.puantajlar.push({
      personelId: 'p1', donem: '2026-07', gunler: [], calisanGun: 30,
      devamsizGun: 0, yillikIzinGun: 0, hastalikGun: 0, ucretsizIzinGun: 0, fazlaMesaiSaat: 0,
    })
    sources.settings = { version: 1, baseCurrency: 'TRY', salaryPaymentRule: { mode: 'month_end' } }
    sources.operations.siparisler.push(purchaseOrder({ odemeTarihi: '2026-07-25' }))
    expect(buildDataCoverageFromStates(sources, NOW, FRESHNESS).domains.map(domain => domain.status))
      .toEqual(['ready', 'ready', 'ready', 'ready'])
  })

  it('migrates older settings and purchase orders without new fields', () => {
    expect(normalizeCompanyObligationSettings({}).baseCurrency).toBe('TRY')
    expect(normalizeCompanyObligationSettings({}).salaryPaymentRule).toBeUndefined()
    const oldOrder = purchaseOrder({ paraBirimi: undefined, odemeDurumu: undefined, faturaIds: undefined })
    const migrated = normalizePersistedSiparis(oldOrder)
    expect(migrated.paraBirimi).toBe('TRY')
    expect(migrated.odemeDurumu).toBe('bekliyor')
    expect(migrated.faturaIds).toEqual([])
  })
})
