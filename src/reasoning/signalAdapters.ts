// Octo — Domain adapters
// Converts Finance, Tax, HR and Operations records into a canonical, traceable
// signal vocabulary. Adapters are deterministic and accept explicit snapshots
// for tests; live stores remain the source of truth in production.

import { getFinanceState, type FinanceState } from '../layers/finance/financeStore'
import { getTaxState, type TaxState } from '../layers/tax/taxStore'
import { beyannameLabels } from '../layers/tax/types'
import { buBordroDonemi, getIKState, type IKState } from '../layers/hr/hrStore'
import {
  getOpState,
  stokMiktari,
  tumStokTahminleri,
  uretimEksikMalzemeler,
  type OpState,
} from '../layers/operations/opStore'
import { siparisKalanToplam } from '../layers/operations/types'
import {
  dateOnlyFromLocalDate,
  finiteNumber,
  isDateOnly,
  lastDayOfFollowingMonth,
} from '../shared/dateOnly'
import type { EvidenceRef, ReasoningCurrency, ReasoningSignal } from './types'

export interface ReasoningSourceStates {
  finance: FinanceState
  tax: TaxState
  hr: IKState
  operations: OpState
}

const currencies: ReasoningCurrency[] = ['TRY', 'USD', 'EUR']

const money = (value: number, currency: ReasoningCurrency = 'TRY') =>
  `${Math.round(value).toLocaleString('tr-TR')} ${currency === 'TRY' ? 'TL' : currency}`

function positive(value: unknown): number | null {
  const number = finiteNumber(value)
  return number !== null && number > 0 ? number : null
}

function invoiceSignals(finance: FinanceState, now: Date): ReasoningSignal[] {
  const out: ReasoningSignal[] = []

  for (const currency of currencies) {
    const accounts = finance.accounts.filter(account => account.currency === currency)
    const validAccounts = accounts.filter(account => finiteNumber(account.balance) !== null)
    if (validAccounts.length === 0) continue
    const cash = finiteNumber(validAccounts.reduce((sum, account) => sum + account.balance, 0))
    if (cash === null) continue
    out.push({
      id: `finance:cash-position:${currency}`,
      domain: 'finance',
      kind: 'cash_position',
      label: `${currency} net nakit`,
      amount: cash,
      currency,
      entityId: currency,
      confidence: validAccounts.length === accounts.length ? 'high' : 'medium',
      evidence: validAccounts.map(account => ({
        domain: 'finance',
        recordType: 'account',
        recordId: account.id,
        label: `${account.name} (${account.currency})`,
        value: money(account.balance, account.currency),
      })),
      metadata: {
        accountCount: validAccounts.length,
        invalidAccountCount: accounts.length - validAccounts.length,
      },
    })
  }

  const today = dateOnlyFromLocalDate(now)
  for (const invoice of finance.invoices) {
    if (invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'draft') continue
    const amount = positive(invoice.total)
    if (amount === null) continue
    const isInflow = invoice.type === 'sales'
    const dueDate = isDateOnly(invoice.dueDate) ? invoice.dueDate : undefined
    const effectiveStatus = invoice.status === 'sent' && dueDate && dueDate < today
      ? 'overdue'
      : invoice.status
    const obligationKey = invoice.obligationKey || (
      invoice.type === 'purchase' && invoice.sourceOrderId
        ? `purchase-order:${invoice.sourceOrderId}`
        : `invoice:${invoice.id}`
    )

    out.push({
      id: `finance:invoice:${invoice.id}`,
      domain: 'finance',
      kind: isInflow ? 'cash_inflow' : 'cash_outflow',
      label: `${invoice.contactName} ${isInflow ? 'tahsilatı' : 'ödemesi'}`,
      eventDate: dueDate,
      amount,
      currency: invoice.currency,
      entityId: invoice.contactTaxId || invoice.contactName,
      confidence: dueDate ? (effectiveStatus === 'overdue' && isInflow ? 'medium' : 'high') : 'low',
      evidence: [{
        domain: 'finance',
        recordType: 'invoice',
        recordId: invoice.id,
        label: `${invoice.contactName}; ${dueDate ? `vade ${dueDate}` : 'vade tarihi geçersiz'}`,
        value: money(amount, invoice.currency),
      }],
      obligation: {
        key: obligationKey,
        category: isInflow ? 'invoice_receivable' : 'invoice_payable',
        source: 'recorded',
      },
      metadata: {
        status: effectiveStatus,
        recordedStatus: invoice.status,
        invoiceType: invoice.type,
        currency: invoice.currency,
        sourceOrderId: invoice.sourceOrderId ?? null,
        authorityRank: 3,
        missingDueDate: !dueDate,
      },
    })
  }

  return out
}

function taxSignals(tax: TaxState): ReasoningSignal[] {
  const out: ReasoningSignal[] = []
  const seenDeclarations = new Set<string>()

  for (const declaration of tax.beyannameler) {
    const declarationKey = `${declaration.type}:${declaration.donem}`
    if (seenDeclarations.has(declarationKey)) continue
    seenDeclarations.add(declarationKey)
    if (declaration.status === 'odendi') continue
    const amount = positive(declaration.hesaplananVergi)
    if (amount === null) continue
    const deadline = isDateOnly(declaration.sonTarih) ? declaration.sonTarih : undefined
    const obligationKey = declaration.type === 'sgk'
      ? `payroll:sgk:${declaration.donem}`
      : `tax:${declaration.type}:${declaration.donem}`

    out.push({
      id: `tax:declaration:${declaration.id}`,
      domain: 'tax',
      kind: 'cash_outflow',
      label: beyannameLabels[declaration.type],
      eventDate: deadline,
      amount,
      currency: 'TRY',
      entityId: declaration.type,
      confidence: deadline ? 'high' : 'low',
      evidence: [{
        domain: 'tax',
        recordType: 'beyanname',
        recordId: declaration.id,
        label: `${beyannameLabels[declaration.type]} ${declaration.donem}; ${deadline ? `son ${deadline}` : 'son tarih geçersiz'}`,
        value: money(amount),
      }],
      obligation: {
        key: obligationKey,
        category: declaration.type === 'sgk' ? 'sgk' : 'tax',
        period: declaration.donem,
        source: 'recorded',
      },
      metadata: {
        status: declaration.status,
        declarationType: declaration.type,
        period: declaration.donem,
        authorityRank: 4,
        missingDeadline: !deadline,
      },
    })
  }

  for (const compliance of tax.compliance) {
    if (compliance.durum === 'tamam') continue
    const rawWeight = finiteNumber(compliance.agirlik)
    const weight = rawWeight !== null && rawWeight >= 0 ? rawWeight : null
    out.push({
      id: `tax:compliance:${compliance.alan}`,
      domain: 'tax',
      kind: 'compliance_risk',
      label: compliance.alan,
      confidence: weight === null ? 'low' : compliance.durum === 'eksik' ? 'high' : 'medium',
      evidence: [{
        domain: 'tax',
        recordType: 'compliance',
        recordId: compliance.alan,
        label: compliance.alan,
        value: compliance.not,
      }],
      metadata: {
        status: compliance.durum,
        weight,
        note: compliance.not,
      },
    })
  }

  return out
}

function payrollEvidence(hr: IKState, period: string, personnelIds: Set<string>): EvidenceRef[] {
  const evidence: EvidenceRef[] = []
  for (const person of hr.personeller.filter(item => personnelIds.has(item.id))) {
    evidence.push({
      domain: 'hr',
      recordType: 'personel',
      recordId: person.id,
      label: `${person.ad} ${person.soyad}; brüt ücret`,
      value: money(person.brutMaas),
    })
    const attendance = hr.puantajlar.find(item => item.personelId === person.id && item.donem === period)
    if (attendance) {
      evidence.push({
        domain: 'hr',
        recordType: 'puantaj',
        recordId: `${attendance.personelId}:${attendance.donem}`,
        label: `${person.ad} ${person.soyad}; ${attendance.donem} puantajı`,
        value: `${attendance.devamsizGun + attendance.ucretsizIzinGun} ücretsiz/devamsız gün; ${attendance.fazlaMesaiSaat} saat fazla mesai`,
      })
    }
  }
  return evidence
}

function hrSignals(hr: IKState, tax: TaxState, now: Date): ReasoningSignal[] {
  const payroll = buBordroDonemi(now, hr)
  if (payroll.bordrolar.length === 0) return []

  const personnelIds = new Set(payroll.bordrolar.map(item => item.personelId))
  const evidence = payrollEvidence(hr, payroll.donem, personnelIds)
  const hasUnsupportedSgkStatus = hr.personeller.some(person => person.aktif && person.sgkDurumu !== 'normal')
  const signals: ReasoningSignal[] = []
  const salary = positive(payroll.maasOdemesi)
  if (salary !== null) {
    signals.push({
      id: `hr:salary:${payroll.donem}`,
      domain: 'hr',
      kind: 'cash_outflow',
      label: 'Net maaş ödemesi',
      amount: salary,
      currency: 'TRY',
      confidence: 'medium',
      evidence,
      obligation: {
        key: `payroll:salary:${payroll.donem}`,
        category: 'salary',
        period: payroll.donem,
        source: 'derived',
      },
      metadata: {
        period: payroll.donem,
        employeeCount: payroll.bordrolar.length,
        missingPaymentDate: true,
        authorityRank: 2,
      },
    })
  }

  // A recorded Tax SGK declaration is authoritative for the same period. It
  // suppresses the derived estimate even when paid, preventing it from returning
  // as a second obligation after settlement.
  const hasRecordedSgk = tax.beyannameler.some(declaration =>
    declaration.type === 'sgk' && declaration.donem === payroll.donem,
  )
  const sgk = positive(payroll.sgkPrimToplam)
  if (sgk !== null && !hasRecordedSgk) {
    signals.push({
      id: `hr:sgk:${payroll.donem}`,
      domain: 'hr',
      kind: 'cash_outflow',
      label: 'Bordrodan türetilen SGK primi',
      eventDate: lastDayOfFollowingMonth(now),
      amount: sgk,
      currency: 'TRY',
      confidence: hasUnsupportedSgkStatus ? 'low' : 'medium',
      evidence,
      obligation: {
        key: `payroll:sgk:${payroll.donem}`,
        category: 'sgk',
        period: payroll.donem,
        source: 'derived',
      },
      metadata: {
        period: payroll.donem,
        derived: true,
        dateSource: 'standard-4a-following-month-end',
        requiresCalendarConfirmation: true,
        unsupportedSgkStatus: hasUnsupportedSgkStatus,
        authorityRank: 2,
      },
    })
  }

  return signals
}

function productEvidence(operations: OpState, productId: string): EvidenceRef[] {
  const product = operations.urunler.find(item => item.id === productId)
  if (!product) return []
  const stock = finiteNumber(stokMiktari(product.id, operations))
  return [
    {
      domain: 'operations',
      recordType: 'product',
      recordId: product.id,
      label: `${product.kod}; ${product.ad}`,
      value: stock === null ? 'Geçersiz stok bakiyesi' : `${stock.toLocaleString('tr-TR')} ${product.birim}`,
    },
    ...operations.hareketler
      .filter(movement => movement.urunId === productId)
      .map(movement => ({
        domain: 'operations' as const,
        recordType: 'stock-movement',
        recordId: movement.id,
        label: `${movement.tarih}; ${movement.tip}`,
        value: finiteNumber(movement.miktar) === null
          ? 'Geçersiz hareket miktarı'
          : `${movement.miktar.toLocaleString('tr-TR')} ${product.birim}`,
      })),
  ]
}

function operationSignals(operations: OpState, finance: FinanceState, now: Date): ReasoningSignal[] {
  const out: ReasoningSignal[] = []
  const linkedOrderIds = new Set(finance.invoices
    .filter(invoice => invoice.type === 'purchase' && invoice.status !== 'cancelled' && invoice.sourceOrderId)
    .map(invoice => invoice.sourceOrderId as string))

  for (const order of operations.siparisler) {
    if (order.durum !== 'onaylandi' && order.durum !== 'kismi') continue

    if (order.tur === 'alis' && !order.faturalandi && !linkedOrderIds.has(order.id)) {
      const total = positive(siparisKalanToplam(order).genelToplam)
      if (total !== null) {
        const paymentDate = isDateOnly(order.odemeTarihi) ? order.odemeTarihi : undefined
        out.push({
          id: `operations:purchase-order:${order.id}`,
          domain: 'operations',
          kind: 'cash_outflow',
          label: `Alış siparişi ${order.no}`,
          eventDate: paymentDate,
          amount: total,
          currency: 'TRY',
          entityId: order.cariId,
          confidence: paymentDate ? 'medium' : 'low',
          evidence: [{
            domain: 'operations',
            recordType: 'purchase-order',
            recordId: order.id,
            label: `${order.no}; ${order.cariUnvan}; ${paymentDate ? `ödeme ${paymentDate}` : 'ödeme tarihi eksik'}`,
            value: money(total),
          }],
          obligation: {
            key: `purchase-order:${order.id}`,
            category: 'purchase_order',
            source: 'recorded',
          },
          metadata: {
            orderNo: order.no,
            status: order.durum,
            invoiced: order.faturalandi,
            remainingBasis: true,
            missingPaymentDate: !paymentDate,
            authorityRank: 2,
          },
        })
      }
    }

    if (order.tur === 'satis') {
      order.satirlar.forEach((line, lineIndex) => {
        const remaining = Math.max(0, finiteNumber(line.miktar) ?? 0) - Math.max(0, finiteNumber(line.sevkEdilen) ?? 0)
        const unitPrice = finiteNumber(line.birimFiyat)
        if (remaining <= 0 || unitPrice === null || unitPrice < 0) return
        const lineAmount = finiteNumber(remaining * unitPrice)
        if (lineAmount === null) return
        const product = operations.urunler.find(item => item.id === line.urunId)
        const stock = finiteNumber(stokMiktari(line.urunId, operations))
        out.push({
          id: `sales:order-line:${order.id}:${lineIndex}`,
          domain: 'sales',
          kind: 'demand_commitment',
          label: `${order.no}; ${product?.ad ?? line.urunId}`,
          eventDate: isDateOnly(order.teslimTarihi) ? order.teslimTarihi : undefined,
          quantity: remaining,
          amount: lineAmount,
          currency: 'TRY',
          entityId: line.urunId,
          confidence: isDateOnly(order.teslimTarihi) ? 'high' : 'medium',
          evidence: [
            {
              domain: 'sales',
              recordType: 'sales-order',
              recordId: order.id,
              label: `${order.no}; ${order.cariUnvan}; satır ${lineIndex + 1}`,
              value: `${remaining.toLocaleString('tr-TR')} ${product?.birim ?? ''}`.trim(),
            },
            ...productEvidence(operations, line.urunId).slice(0, 1),
          ],
          metadata: {
            orderNo: order.no,
            lineIndex,
            currentStock: stock,
            unitPrice,
            productName: product?.ad ?? line.urunId,
            missingDeliveryDate: !isDateOnly(order.teslimTarihi),
          },
        })
      })
    }
  }

  const committedByProduct = new Map<string, number>()
  for (const demand of out.filter(signal => signal.kind === 'demand_commitment' && signal.entityId)) {
    committedByProduct.set(
      demand.entityId as string,
      (committedByProduct.get(demand.entityId as string) ?? 0) + (demand.quantity ?? 0),
    )
  }

  for (const forecast of tumStokTahminleri(now, operations)) {
    const product = operations.urunler.find(item => item.id === forecast.urunId)
    if (!product) continue
    const currentStock = finiteNumber(forecast.mevcutStok)
    const committed = committedByProduct.get(product.id) ?? 0
    const directCommitmentGap = currentStock !== null && committed > currentStock
    const forecastRisk = forecast.aciliyet !== 'guvende' && forecast.aciliyet !== 'tukenmiyor'
    if (!directCommitmentGap && !forecastRisk) continue
    const quantity = finiteNumber(forecast.onerilticMiktar)
    const confidence = directCommitmentGap
      ? 'high'
      : forecast.guven === 'yuksek' ? 'high' : forecast.guven === 'orta' ? 'medium' : 'low'

    out.push({
      id: `operations:stock-risk:${forecast.urunId}`,
      domain: 'operations',
      kind: 'stock_risk',
      label: `${product.ad} stok riski`,
      eventDate: isDateOnly(forecast.yenidenSiparisTarihi)
        ? forecast.yenidenSiparisTarihi
        : isDateOnly(forecast.tukenmeTarihi) ? forecast.tukenmeTarihi : undefined,
      quantity: quantity ?? undefined,
      entityId: product.id,
      confidence,
      evidence: productEvidence(operations, product.id),
      metadata: {
        urgency: directCommitmentGap && !forecastRisk ? 'commitment-gap' : forecast.aciliyet,
        currentStock,
        openCommitment: committed,
        dailyConsumption: finiteNumber(forecast.gunlukTuketim),
        daysRemaining: finiteNumber(forecast.kalanGun),
        stockoutDate: forecast.tukenmeTarihi,
        reorderDate: forecast.yenidenSiparisTarihi,
        suggestedOrderQty: quantity,
        purchasePrice: finiteNumber(product.alisFiyati),
        productName: product.ad,
        unit: product.birim,
      },
    })
  }

  for (const shortage of uretimEksikMalzemeler(operations)) {
    const product = operations.urunler.find(item => item.id === shortage.urunId)
    const unitPrice = finiteNumber(product?.alisFiyati)
    const missing = positive(shortage.eksik)
    if (missing === null) continue
    const requiredCost = unitPrice !== null && unitPrice > 0 ? missing * unitPrice : null
    out.push({
      id: `operations:production-shortage:${shortage.uretimId}:${shortage.urunId}`,
      domain: 'operations',
      kind: 'production_shortage',
      label: `${shortage.uretimNo}; ${shortage.urunAd} eksik`,
      eventDate: isDateOnly(shortage.hedefTarih) ? shortage.hedefTarih : undefined,
      quantity: missing,
      amount: requiredCost ?? undefined,
      currency: 'TRY',
      entityId: shortage.urunId,
      confidence: requiredCost !== null && isDateOnly(shortage.hedefTarih) ? 'high' : 'medium',
      evidence: [
        {
          domain: 'operations',
          recordType: 'production-order',
          recordId: shortage.uretimId,
          label: `${shortage.uretimNo}; hedef ${shortage.hedefTarih}`,
          value: `${shortage.eksik.toLocaleString('tr-TR')} eksik`,
        },
        {
          domain: 'operations',
          recordType: 'recipe',
          recordId: shortage.receteId,
          label: `${shortage.uretimNo} reçetesi`,
        },
        ...productEvidence(operations, shortage.urunId),
      ],
      obligation: {
        key: `production-procurement:${shortage.uretimId}:${shortage.urunId}`,
        category: 'production_procurement',
        source: 'forecast',
      },
      metadata: {
        productionId: shortage.uretimId,
        productionNo: shortage.uretimNo,
        targetDate: shortage.hedefTarih,
        recipeId: shortage.receteId,
        required: shortage.gereken,
        available: shortage.mevcut,
        missing,
        requiredCost,
        purchasePrice: unitPrice,
        leadTimeDays: finiteNumber(product?.tedarikSuresiGun),
        productName: shortage.urunAd,
        authorityRank: 1,
      },
    })
  }

  return out
}

function reconcileObligations(signals: ReasoningSignal[]): ReasoningSignal[] {
  const withoutIdentity: ReasoningSignal[] = []
  const byKey = new Map<string, ReasoningSignal>()
  for (const signal of signals) {
    if (!signal.obligation) {
      withoutIdentity.push(signal)
      continue
    }
    const current = byKey.get(signal.obligation.key)
    const currentRank = finiteNumber(current?.metadata?.authorityRank) ?? 0
    const nextRank = finiteNumber(signal.metadata?.authorityRank) ?? 0
    if (!current || nextRank > currentRank) byKey.set(signal.obligation.key, signal)
  }
  return [...withoutIdentity, ...byKey.values()]
}

export function buildReasoningSignalsFromStates(
  sources: ReasoningSourceStates,
  now = new Date(),
): ReasoningSignal[] {
  return reconcileObligations([
    ...invoiceSignals(sources.finance, now),
    ...taxSignals(sources.tax),
    ...hrSignals(sources.hr, sources.tax, now),
    ...operationSignals(sources.operations, sources.finance, now),
  ])
}

export function buildReasoningSignals(now = new Date()): ReasoningSignal[] {
  return buildReasoningSignalsFromStates({
    finance: getFinanceState(),
    tax: getTaxState(),
    hr: getIKState(),
    operations: getOpState(),
  }, now)
}

function stableMetadata(metadata: ReasoningSignal['metadata']): ReasoningSignal['metadata'] {
  if (!metadata) return undefined
  return Object.fromEntries(Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b)))
}

// Full signal content participates in invalidation. Presentation, evidence,
// calculation metadata and source links are intentionally included.
export function reasoningFingerprint(signals: ReasoningSignal[]): string {
  return JSON.stringify(signals
    .map(signal => ({
      ...signal,
      evidence: [...signal.evidence].sort((a, b) =>
        `${a.domain}:${a.recordType}:${a.recordId}`.localeCompare(`${b.domain}:${b.recordType}:${b.recordId}`),
      ),
      metadata: stableMetadata(signal.metadata),
    }))
    .sort((a, b) => a.id.localeCompare(b.id)))
}

export function buildReasoningFingerprint(now = new Date()): string {
  return reasoningFingerprint(buildReasoningSignals(now))
}
