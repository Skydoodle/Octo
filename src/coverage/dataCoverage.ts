import { getFinanceState } from '../layers/finance/financeStore'
import { getIKState } from '../layers/hr/hrStore'
import { getOpState } from '../layers/operations/opStore'
import { purchaseOrderCurrency, reconcilePurchaseOrder } from '../layers/operations/purchaseOrderObligations'
import { getTaxState } from '../layers/tax/taxStore'
import type { ReasoningSourceStates } from '../reasoning/signalAdapters'
import { dateOnlyFromLocalDate, isDateOnly } from '../shared/dateOnly'
import { getFreshness } from '../shared/store/persist'
import {
  getCompanyObligationSettings,
  salaryPaymentDate,
} from '../settings/companyObligationSettings'

export type DataCoverageStatus = 'ready' | 'partial' | 'missing'
export type DataCoverageDomain = 'finance' | 'tax' | 'hr' | 'operations'

export interface DomainDataCoverage {
  domain: DataCoverageDomain
  label: string
  status: DataCoverageStatus
  explanation: string
  missingActions: string[]
  freshness: string
  availableCapabilities: string[]
  blockedCapabilities: string[]
}

export interface DataCoverageSnapshot {
  generatedAt: string
  domains: DomainDataCoverage[]
}

export interface DataCoverageFreshness {
  finance: string
  tax: string
  hr: string
  operations: string
  settings: string
}

const openInvoice = (status: string) => status !== 'paid' && status !== 'cancelled' && status !== 'draft'
const openOrder = (status: string) => status === 'onaylandi' || status === 'kismi'

function financeCoverage(
  sources: ReasoningSourceStates,
  freshness: DataCoverageFreshness,
): DomainDataCoverage {
  const { finance, settings } = sources
  const hasData = finance.accounts.length > 0 || finance.invoices.length > 0 || finance.transactions.length > 0
  if (!hasData) {
    return {
      domain: 'finance', label: 'Finans', status: 'missing',
      explanation: 'Finans verisi bulunmuyor. Nakit durumu ve açık faturalar henüz değerlendirilemiyor.',
      missingActions: ['En az bir banka veya kasa bakiyesi ekleyin.'],
      freshness: freshness.finance,
      availableCapabilities: [],
      blockedCapabilities: ['Nakit görünümü', 'Likidite değerlendirmesi', 'Açık fatura takibi'],
    }
  }

  const validBaseAccounts = finance.accounts.filter(account =>
    account.currency === settings.baseCurrency && Number.isFinite(account.balance),
  )
  const invalidOpenInvoices = finance.invoices.filter(invoice =>
    openInvoice(invoice.status) && (!Number.isFinite(invoice.total) || invoice.total <= 0 || !isDateOnly(invoice.dueDate)),
  )
  const foreignRecords = finance.invoices.filter(invoice =>
    openInvoice(invoice.status) && invoice.currency !== settings.baseCurrency,
  )
  const actions: string[] = []
  if (validBaseAccounts.length === 0) actions.push(`${settings.baseCurrency} banka veya kasa bakiyesi ekleyin.`)
  if (invalidOpenInvoices.length > 0) actions.push(`${invalidOpenInvoices.length} açık faturanın tutar veya vade tarihini düzeltin.`)
  if (foreignRecords.length > 0) actions.push('Dövizli yükümlülükler için tarihli kur kaynağı ekleyin.')

  const ready = actions.length === 0
  return {
    domain: 'finance', label: 'Finans', status: ready ? 'ready' : 'partial',
    explanation: ready
      ? 'Finans verisi hazır. Banka bakiyeleri ve açık faturalar izleniyor.'
      : validBaseAccounts.length === 0
        ? `${settings.baseCurrency} banka bakiyesi eksik. Likidite sonucu henüz hesaplanmıyor.`
        : foreignRecords.length > 0
          ? `Dövizli yükümlülükler için tarihli kur kaynağı bulunmuyor. ${settings.baseCurrency} nakit hesabına eklenmedi.`
          : `${invalidOpenInvoices.length} açık faturada tutar veya vade bilgisi eksik.`,
    missingActions: actions,
    freshness: freshness.finance,
    availableCapabilities: [
      ...(validBaseAccounts.length > 0 ? [`${settings.baseCurrency} nakit bakiyesi`] : []),
      ...(finance.invoices.length > 0 ? ['Açık fatura takibi'] : []),
      ...(validBaseAccounts.length > 0 ? ['Tek para biriminde likidite değerlendirmesi'] : []),
    ],
    blockedCapabilities: [
      ...(validBaseAccounts.length === 0 ? ['Likidite değerlendirmesi'] : []),
      ...(foreignRecords.length > 0 ? ['Dövizli kayıtların ana para birimine çevrilmesi'] : []),
    ],
  }
}

function taxCoverage(
  sources: ReasoningSourceStates,
  freshness: DataCoverageFreshness,
): DomainDataCoverage {
  const { tax } = sources
  const hasData = tax.beyannameler.length > 0 || tax.compliance.length > 0
  if (!hasData) {
    return {
      domain: 'tax', label: 'Vergi', status: 'missing',
      explanation: 'Aktif beyanname kaydı bulunmuyor. Vergi takvimi henüz değerlendirilemiyor.',
      missingActions: ['Aktif beyanname ve tahakkuk kayıtlarını ekleyin.'],
      freshness: freshness.tax,
      availableCapabilities: [],
      blockedCapabilities: ['Vergi ödeme takvimi', 'Beyanname son tarihleri'],
    }
  }

  const active = tax.beyannameler.filter(declaration => declaration.status !== 'odendi')
  const invalid = active.filter(declaration =>
    !isDateOnly(declaration.sonTarih) || !Number.isFinite(declaration.hesaplananVergi) || declaration.hesaplananVergi < 0,
  )
  const actions: string[] = []
  if (active.length === 0) actions.push('Aktif beyanname veya tahakkuk kaydı ekleyin.')
  if (invalid.length > 0) actions.push(`${invalid.length} beyannamenin tutar veya son tarihini düzeltin.`)
  const ready = actions.length === 0
  return {
    domain: 'tax', label: 'Vergi', status: ready ? 'ready' : 'partial',
    explanation: ready
      ? 'Vergi verisi hazır. Aktif beyannameler ve ödeme tarihleri izleniyor.'
      : active.length === 0
        ? 'Vergi kayıtları var ancak aktif beyanname bulunmuyor.'
        : `${invalid.length} beyannamede tutar veya son tarih bilgisi eksik.`,
    missingActions: actions,
    freshness: freshness.tax,
    availableCapabilities: [
      ...(active.length > 0 ? ['Aktif beyanname takibi'] : []),
      ...(tax.compliance.length > 0 ? ['Uyumluluk kontrolü'] : []),
    ],
    blockedCapabilities: invalid.length > 0 || active.length === 0 ? ['Eksiksiz vergi ödeme takvimi'] : [],
  }
}

function hrCoverage(
  sources: ReasoningSourceStates,
  freshness: DataCoverageFreshness,
  now: Date,
): DomainDataCoverage {
  const { hr, settings } = sources
  const active = hr.personeller.filter(person => person.aktif)
  if (active.length === 0) {
    return {
      domain: 'hr', label: 'İK', status: 'missing',
      explanation: 'Aktif personel kaydı bulunmuyor. Bordro yükümlülükleri henüz değerlendirilemiyor.',
      missingActions: ['Aktif personel kayıtlarını ekleyin.'],
      freshness: `${freshness.hr} · ayarlar: ${freshness.settings}`,
      availableCapabilities: [],
      blockedCapabilities: ['Bordro hesabı', 'Maaş ödeme takvimi', 'SGK tahmini'],
    }
  }

  const period = dateOnlyFromLocalDate(now).slice(0, 7)
  const paymentDate = salaryPaymentDate(period, settings)
  const invalidSalary = active.filter(person => !Number.isFinite(person.brutMaas) || person.brutMaas <= 0)
  const missingAttendance = active.filter(person =>
    !hr.puantajlar.some(attendance => attendance.personelId === person.id && attendance.donem === period),
  )
  const actions: string[] = []
  if (!paymentDate) actions.push('Maaş ödeme kuralını belirleyin.')
  if (invalidSalary.length > 0) actions.push(`${invalidSalary.length} personelin brüt ücretini düzeltin.`)
  if (missingAttendance.length > 0) actions.push(`${missingAttendance.length} personelin ${period} puantajını ekleyin.`)
  const ready = actions.length === 0
  return {
    domain: 'hr', label: 'İK', status: ready ? 'ready' : 'partial',
    explanation: ready
      ? `İK verisi hazır. Maaşlar ${paymentDate} tarihli nakit takvimine ekleniyor.`
      : !paymentDate
        ? 'Maaş ödeme günü eksik. Nakit takvimine maaşlar henüz eklenmiyor.'
        : missingAttendance.length > 0
          ? `${missingAttendance.length} personelin dönem puantajı eksik. Bordro mevcut ücret kayıtlarıyla sınırlı.`
          : `${invalidSalary.length} personelin ücret kaydı geçersiz.`,
    missingActions: actions,
    freshness: `${freshness.hr} · ayarlar: ${freshness.settings}`,
    availableCapabilities: [
      ...(invalidSalary.length === 0 ? ['Bordro ve SGK hesabı'] : []),
      ...(paymentDate ? ['Maaş ödeme takvimi'] : []),
    ],
    blockedCapabilities: [
      ...(!paymentDate ? ['Maaşların tarihli nakit takvimi'] : []),
      ...(invalidSalary.length > 0 ? ['Güvenilir bordro hesabı'] : []),
    ],
  }
}

function operationsCoverage(
  sources: ReasoningSourceStates,
  freshness: DataCoverageFreshness,
): DomainDataCoverage {
  const { operations, finance, settings } = sources
  const hasData = operations.urunler.length > 0 || operations.hareketler.length > 0 ||
    operations.siparisler.length > 0 || operations.uretimler.length > 0
  if (!hasData) {
    return {
      domain: 'operations', label: 'Operasyon', status: 'missing',
      explanation: 'Operasyon verisi bulunmuyor. Sipariş ve stok yükümlülükleri henüz değerlendirilemiyor.',
      missingActions: ['Sipariş veya stok kayıtlarını ekleyin.'],
      freshness: freshness.operations,
      availableCapabilities: [],
      blockedCapabilities: ['Alış siparişi ödeme takvimi', 'Stok görünümü'],
    }
  }

  const openPurchases = operations.siparisler
    .filter(order => order.tur === 'alis' && openOrder(order.durum))
    .map(order => ({ order, reconciliation: reconcilePurchaseOrder(order, finance.invoices, operations.siparisler) }))
    .filter(item => item.reconciliation.remainingAmount > 0)
  const missingDates = openPurchases.filter(item => !isDateOnly(item.order.odemeTarihi))
  const invalidLinks = openPurchases.filter(item => item.reconciliation.linkIssues.length > 0)
  const orphanInvoiceLinks = finance.invoices.filter(invoice =>
    Boolean(invoice.sourceOrderId) && !operations.siparisler.some(order => order.id === invoice.sourceOrderId),
  )
  const foreignOrders = openPurchases.filter(item => purchaseOrderCurrency(item.order) !== settings.baseCurrency)
  const productsWithoutMovement = operations.urunler.filter(product =>
    product.aktif && product.tip !== 'hizmet' && !operations.hareketler.some(movement => movement.urunId === product.id),
  )
  const actions: string[] = []
  if (missingDates.length > 0) actions.push(`${missingDates.length} alış siparişine ödeme tarihi ekleyin.`)
  if (invalidLinks.length + orphanInvoiceLinks.length > 0) {
    actions.push(`${invalidLinks.length + orphanInvoiceLinks.length} sipariş-fatura bağlantısını doğrulayın.`)
  }
  if (foreignOrders.length > 0) actions.push('Dövizli alış siparişleri için tarihli kur kaynağı ekleyin.')
  if (productsWithoutMovement.length > 0) actions.push(`${productsWithoutMovement.length} aktif ürün için başlangıç stok hareketi ekleyin.`)
  const ready = actions.length === 0
  return {
    domain: 'operations', label: 'Operasyon', status: ready ? 'ready' : 'partial',
    explanation: ready
      ? 'Operasyon verisi hazır. Açık siparişler ve stok hareketleri izleniyor.'
      : missingDates.length > 0
        ? `${missingDates.length} alış siparişinde ödeme tarihi yok. Bu yükümlülükler nakit projeksiyonuna dahil edilmedi.`
        : invalidLinks.length + orphanInvoiceLinks.length > 0
          ? 'Bazı sipariş-fatura bağlantıları doğrulanamadı. Bağlantılı tutarlar siparişten düşülmedi.'
          : foreignOrders.length > 0
            ? `Dövizli yükümlülükler için tarihli kur kaynağı bulunmuyor. ${settings.baseCurrency} nakit hesabına eklenmedi.`
            : `${productsWithoutMovement.length} aktif üründe stok hareketi yok.`,
    missingActions: actions,
    freshness: freshness.operations,
    availableCapabilities: [
      ...(operations.siparisler.length > 0 ? ['Sipariş takibi'] : []),
      ...(operations.hareketler.length > 0 ? ['Stok hareketi takibi'] : []),
      ...(openPurchases.length > 0 && missingDates.length === 0 ? ['Alış siparişi ödeme takvimi'] : []),
    ],
    blockedCapabilities: [
      ...(missingDates.length > 0 ? ['Eksiksiz alış siparişi nakit takvimi'] : []),
      ...(invalidLinks.length + orphanInvoiceLinks.length > 0 ? ['Kesin sipariş-fatura mahsuplaşması'] : []),
      ...(foreignOrders.length > 0 ? ['Dövizli siparişlerin ana para birimine çevrilmesi'] : []),
    ],
  }
}

export function buildDataCoverageFromStates(
  sources: ReasoningSourceStates,
  now: Date,
  freshness: DataCoverageFreshness,
): DataCoverageSnapshot {
  return {
    generatedAt: now.toISOString(),
    domains: [
      financeCoverage(sources, freshness),
      taxCoverage(sources, freshness),
      hrCoverage(sources, freshness, now),
      operationsCoverage(sources, freshness),
    ],
  }
}

export function buildDataCoverage(now = new Date()): DataCoverageSnapshot {
  return buildDataCoverageFromStates({
    finance: getFinanceState(),
    tax: getTaxState(),
    hr: getIKState(),
    operations: getOpState(),
    settings: getCompanyObligationSettings(),
  }, now, {
    finance: getFreshness('finance'),
    tax: getFreshness('tax'),
    hr: getFreshness('hr'),
    operations: getFreshness('operations'),
    settings: getFreshness('company-obligation-settings'),
  })
}

/** Production company path: deliberately supplies an empty legacy Finance state.
 * The caller replaces the Finance domain with its Supabase Finance coverage. */
export function buildDataCoverageWithoutLegacyFinance(now = new Date()): DataCoverageSnapshot {
  return buildDataCoverageFromStates({
    finance: { accounts: [], invoices: [], transactions: [] },
    tax: getTaxState(),
    hr: getIKState(),
    operations: getOpState(),
    settings: getCompanyObligationSettings(),
  }, now, {
    finance: 'Supabase şirket kayıtları',
    tax: getFreshness('tax'),
    hr: getFreshness('hr'),
    operations: getFreshness('operations'),
    settings: getFreshness('company-obligation-settings'),
  })
}
