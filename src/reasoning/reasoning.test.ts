import { describe, expect, it } from 'vitest'
import { calendarDaysBetween } from '../shared/dateOnly'
import { buildRows } from '../import/buildRows'
import {
  buildReasoningSignalsFromStates,
  reasoningFingerprint,
  type ReasoningSourceStates,
} from './signalAdapters'
import { runReasoningEngine } from './engine'
import { uretimEksikMalzemeler } from '../layers/operations/opStore'
import type { Personel } from '../layers/hr/types'
import type { ReasoningSignal } from './types'

const NOW = new Date('2026-07-10T07:00:00.000Z')

function emptySources(): ReasoningSourceStates {
  return {
    finance: { accounts: [], invoices: [], transactions: [] },
    tax: { beyannameler: [], compliance: [] },
    hr: { personeller: [], puantajlar: [], izinler: [] },
    operations: {
      urunler: [],
      hareketler: [],
      siparisler: [],
      sevkiyatlar: [],
      receteler: [],
      uretimler: [],
      tedarikciler: [],
    },
  }
}

function person(overrides: Partial<Personel> = {}): Personel {
  return {
    id: 'p1',
    ad: 'Ayşe',
    soyad: 'Yılmaz',
    tcKimlik: '11111111111',
    iseGirisTarihi: '2026-01-01',
    brutMaas: 50_000,
    departman: 'Operasyon',
    pozisyon: 'Uzman',
    sgkDurumu: 'normal',
    calismaSekli: 'tam_zamanli',
    sgkIndirimli: false,
    aktif: true,
    ...overrides,
  }
}

function signal(overrides: Partial<ReasoningSignal> & Pick<ReasoningSignal, 'id' | 'domain' | 'kind'>): ReasoningSignal {
  return {
    label: overrides.id,
    confidence: 'high',
    evidence: [],
    ...overrides,
  }
}

describe('reasoning signal contracts', () => {
  it('keeps a filed declaration payable until it is actually paid', () => {
    const sources = emptySources()
    sources.tax.beyannameler.push({
      id: 'kdv-1', type: 'kdv', donem: '2026-06', period: 'aylik', status: 'gonderildi',
      matrah: 100_000, hesaplananVergi: 20_000, sonTarih: '2026-07-28', aciklama: '',
    })

    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals).toContainEqual(expect.objectContaining({
      id: 'tax:declaration:kdv-1',
      kind: 'cash_outflow',
      amount: 20_000,
    }))
  })

  it('uses the recorded SGK declaration instead of the HR estimate for the same period', () => {
    const sources = emptySources()
    sources.hr.personeller.push(person())
    sources.tax.beyannameler.push({
      id: 'sgk-1', type: 'sgk', donem: '2026-07', period: 'aylik', status: 'gonderildi',
      matrah: 50_000, hesaplananVergi: 18_000, sonTarih: '2026-08-31', aciklama: '',
    })

    const signals = buildReasoningSignalsFromStates(sources, NOW)
    const sgkSignals = signals.filter(item => item.obligation?.key === 'payroll:sgk:2026-07')
    expect(sgkSignals).toHaveLength(1)
    expect(sgkSignals[0].id).toBe('tax:declaration:sgk-1')
  })

  it('does not recreate a paid SGK declaration from the HR estimate', () => {
    const sources = emptySources()
    sources.hr.personeller.push(person())
    sources.tax.beyannameler.push({
      id: 'sgk-paid', type: 'sgk', donem: '2026-07', period: 'aylik', status: 'odendi',
      matrah: 50_000, hesaplananVergi: 18_000, sonTarih: '2026-08-31', aciklama: '',
    })

    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.some(item => item.obligation?.key === 'payroll:sgk:2026-07')).toBe(false)
  })

  it('uses the following month end for the standard SGK estimate without timezone shifting', () => {
    const sources = emptySources()
    sources.hr.personeller.push(person())
    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.find(item => item.id === 'hr:sgk:2026-07')?.eventDate).toBe('2026-08-31')
    expect(signals.find(item => item.id === 'hr:salary:2026-07')?.eventDate).toBeUndefined()
  })

  it('keeps currencies separate instead of adding nominal balances', () => {
    const sources = emptySources()
    sources.finance.accounts.push(
      { id: 'try', name: 'TRY', iban: '', currency: 'TRY', balance: 100 },
      { id: 'usd', name: 'USD', iban: '', currency: 'USD', balance: 100 },
    )
    const cash = buildReasoningSignalsFromStates(sources, NOW).filter(item => item.kind === 'cash_position')
    expect(cash).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: 'TRY', amount: 100 }),
      expect.objectContaining({ currency: 'USD', amount: 100 }),
    ]))
  })

  it('replaces a linked purchase order with its supplier invoice', () => {
    const sources = emptySources()
    sources.operations.siparisler.push({
      id: 'po1', no: 'PO-1', tur: 'alis', cariId: 'supplier', cariUnvan: 'Tedarikçi',
      tarih: '2026-07-01', teslimTarihi: '2026-07-15', odemeTarihi: '2026-07-25',
      durum: 'onaylandi', faturalandi: false,
      satirlar: [{ urunId: 'u1', miktar: 10, birimFiyat: 100, kdvOrani: 20, sevkEdilen: 0 }],
    })
    sources.finance.invoices.push({
      id: 'inv1', type: 'purchase', contactName: 'Tedarikçi', contactTaxId: '',
      amount: 1_000, vatAmount: 200, total: 1_200, vatRate: 20, currency: 'TRY',
      issueDate: '2026-07-15', dueDate: '2026-07-25', status: 'sent', description: '',
      sourceOrderId: 'po1',
    })

    const obligations = buildReasoningSignalsFromStates(sources, NOW)
      .filter(item => item.obligation?.key === 'purchase-order:po1')
    expect(obligations).toHaveLength(1)
    expect(obligations[0].id).toBe('finance:invoice:inv1')
  })

  it('uses only the remaining value of a partially fulfilled purchase order', () => {
    const sources = emptySources()
    sources.operations.siparisler.push({
      id: 'po1', no: 'PO-1', tur: 'alis', cariId: 'supplier', cariUnvan: 'Tedarikçi',
      tarih: '2026-07-01', teslimTarihi: '2026-07-15', odemeTarihi: '2026-07-25',
      durum: 'kismi', faturalandi: false,
      satirlar: [{ urunId: 'u1', miktar: 10, birimFiyat: 100, kdvOrani: 20, sevkEdilen: 4 }],
    })

    const obligation = buildReasoningSignalsFromStates(sources, NOW)
      .find(item => item.id === 'operations:purchase-order:po1')
    expect(obligation?.amount).toBe(720)
    expect(obligation?.eventDate).toBe('2026-07-25')
  })

  it('detects a sales commitment gap without historical consumption', () => {
    const sources = emptySources()
    sources.operations.urunler.push({
      id: 'u1', kod: 'U1', ad: 'Ürün', tip: 'ticari', birim: 'adet', kdvOrani: 20,
      alisFiyati: 10, satisFiyati: 20, kritikSeviye: 2, tedarikSuresiGun: 7,
      aktif: true, olusturulma: '2026-01-01',
    })
    sources.operations.hareketler.push({
      id: 'm1', urunId: 'u1', tip: 'giris_sayim', miktar: 5, birimMaliyet: 10, tarih: '2026-07-01',
    })
    sources.operations.siparisler.push({
      id: 'so1', no: 'SO-1', tur: 'satis', cariId: 'customer', cariUnvan: 'Müşteri',
      tarih: '2026-07-09', teslimTarihi: '2026-07-15', durum: 'onaylandi', faturalandi: false,
      satirlar: [{ urunId: 'u1', miktar: 10, birimFiyat: 20, kdvOrani: 20, sevkEdilen: 0 }],
    })

    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.find(item => item.kind === 'stock_risk')?.metadata?.urgency).toBe('commitment-gap')
    const finding = runReasoningEngine(signals, NOW).find(item => item.ruleId === 'stock-demand-commitment-gap')
    expect(finding?.severity).toBe('critical')
    expect(finding?.calculation).toContain('5 potansiyel açık')
  })

  it('allocates shared stock across production orders in target-date order', () => {
    const sources = emptySources()
    sources.operations.urunler.push({
      id: 'raw', kod: 'RAW', ad: 'Hammadde', tip: 'hammadde', birim: 'adet', kdvOrani: 20,
      alisFiyati: 5, satisFiyati: 0, kritikSeviye: 2, tedarikSuresiGun: 7,
      aktif: true, olusturulma: '2026-01-01',
    })
    sources.operations.hareketler.push({
      id: 'stock', urunId: 'raw', tip: 'giris_sayim', miktar: 10, birimMaliyet: 5, tarih: '2026-07-01',
    })
    sources.operations.receteler.push({
      id: 'recipe', mamulId: 'finished', ad: 'Reçete', bilesenler: [{ urunId: 'raw', miktar: 2 }],
      iscilikSaati: 1, aktif: true,
    })
    sources.operations.uretimler.push(
      { id: 'p1', no: 'P1', receteId: 'recipe', mamulId: 'finished', miktar: 4, tarih: '2026-07-01', hedefTarih: '2026-07-15', durum: 'planlandi' },
      { id: 'p2', no: 'P2', receteId: 'recipe', mamulId: 'finished', miktar: 4, tarih: '2026-07-01', hedefTarih: '2026-07-20', durum: 'planlandi' },
    )

    const shortages = uretimEksikMalzemeler(sources.operations)
    expect(shortages).toHaveLength(1)
    expect(shortages[0]).toEqual(expect.objectContaining({ uretimId: 'p2', urunId: 'raw', eksik: 6 }))
  })

  it('quarantines non-finite amounts before they reach cases', () => {
    const sources = emptySources()
    sources.finance.accounts.push({ id: 'bad', name: 'Bad', iban: '', currency: 'TRY', balance: Number.NaN })
    sources.finance.invoices.push({
      id: 'bad-invoice', type: 'sales', contactName: 'X', contactTaxId: '', amount: 1,
      vatAmount: 0, total: Number.POSITIVE_INFINITY, vatRate: 0, currency: 'TRY',
      issueDate: '2026-07-01', dueDate: '2026-07-20', status: 'sent', description: '',
    })
    sources.tax.compliance.push({ alan: 'Test', durum: 'eksik', not: '', agirlik: Number.NaN })

    const signals = buildReasoningSignalsFromStates(sources, NOW)
    expect(signals.every(item => item.amount === undefined || Number.isFinite(item.amount))).toBe(true)
    const serializedCases = JSON.stringify(runReasoningEngine(signals, NOW))
    expect(serializedCases).not.toContain('NaN')
    expect(serializedCases).not.toContain('Infinity')
  })

  it('includes preceding obligations once in a later cross-domain liquidity window', () => {
    const signals: ReasoningSignal[] = [
      signal({ id: 'cash', domain: 'finance', kind: 'cash_position', amount: 1_000, currency: 'TRY' }),
      signal({ id: 'early', domain: 'finance', kind: 'cash_outflow', eventDate: '2026-07-11', amount: 100, currency: 'TRY' }),
      signal({ id: 'tax', domain: 'tax', kind: 'cash_outflow', eventDate: '2026-07-20', amount: 200, currency: 'TRY' }),
      signal({ id: 'hr', domain: 'hr', kind: 'cash_outflow', eventDate: '2026-07-22', amount: 300, currency: 'TRY' }),
    ]

    const findings = runReasoningEngine(signals, NOW).filter(item => item.ruleId === 'liquidity-window-collision')
    expect(findings).toHaveLength(1)
    expect(findings[0].calculation).toContain('600 TL pencere sonuna kadarki yükümlülük')
  })

  it('reports missing cash as a data gap, not a critical zero-cash conclusion', () => {
    const signals = [
      signal({ id: 'tax', domain: 'tax', kind: 'cash_outflow', eventDate: '2026-07-20', amount: 200, currency: 'TRY' }),
      signal({ id: 'hr', domain: 'hr', kind: 'cash_outflow', eventDate: '2026-07-22', amount: 300, currency: 'TRY' }),
    ]
    const findings = runReasoningEngine(signals, NOW)
    expect(findings.some(item => item.ruleId === 'liquidity-window-collision')).toBe(false)
    expect(findings).toContainEqual(expect.objectContaining({ ruleId: 'liquidity-data-gap', severity: 'info' }))
  })

  it('includes evidence and metadata changes in the fingerprint', () => {
    const base = signal({
      id: 'risk', domain: 'tax', kind: 'compliance_risk',
      metadata: { weight: 10, note: 'A' },
      evidence: [{ domain: 'tax', recordType: 'compliance', recordId: 'a', label: 'A' }],
    })
    const changed = { ...base, metadata: { weight: 20, note: 'B' } }
    expect(reasoningFingerprint([base])).not.toBe(reasoningFingerprint([changed]))
  })
})

describe('date and import regression guards', () => {
  it('keeps same-day calendar events at zero days', () => {
    expect(calendarDaysBetween('2026-07-10', '2026-07-10')).toBe(0)
  })

  it('builds stable invoice IDs for repeated imports of the same row', () => {
    const sheet = {
      headers: ['Cari', 'Tutar', 'Tarih', 'Vade'],
      rows: [['Tedarikçi', '1.200,00', '01.07.2026', '31.07.2026']],
      headerRowIndex: 0,
    }
    const mapping = ['contactName', 'total', 'issueDate', 'dueDate'] as const
    const first = buildRows(sheet, [...mapping], 'purchase')[0].invoice
    const second = buildRows(sheet, [...mapping], 'purchase')[0].invoice
    expect(first?.id).toBe(second?.id)
  })
})
