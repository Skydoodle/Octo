// Octo — Deterministic cross-domain reasoning engine
// Every finding is calculated from normalized signals. Unknown cash, dates or
// currencies become explicit data-gap cases rather than fabricated conclusions.

import { getFreshness } from '../shared/store/persist'
import {
  dateOnlyFromLocalDate,
  dateOnlyToEpochMs,
  finiteNumber,
} from '../shared/dateOnly'
import { buildReasoningSignals } from './signalAdapters'
import type {
  EvidenceRef,
  ReasoningCase,
  ReasoningConfidence,
  ReasoningCurrency,
  ReasoningDomain,
  ReasoningSeverity,
  ReasoningSignal,
  ReasoningSnapshot,
} from './types'

const DAY = 86_400_000
const currencies: ReasoningCurrency[] = ['TRY', 'USD', 'EUR']
const money = (value: number, currency: ReasoningCurrency = 'TRY') =>
  `${Math.round(value).toLocaleString('tr-TR')} ${currency === 'TRY' ? 'TL' : currency}`
const qty = (value: number) => Math.round(value * 100) / 100

function dateMs(value?: string): number | null {
  return value ? dateOnlyToEpochMs(value) : null
}

function dateFromMs(value: number): string {
  return new Date(value).toISOString().slice(0, 10)
}

function positiveAmount(signal: ReasoningSignal): number | null {
  const amount = finiteNumber(signal.amount)
  return amount !== null && amount > 0 ? amount : null
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function uniqueSignals(signals: ReasoningSignal[]): ReasoningSignal[] {
  const seen = new Set<string>()
  return signals.filter(signal => {
    if (seen.has(signal.id)) return false
    seen.add(signal.id)
    return true
  })
}

function uniqueSources(signals: ReasoningSignal[]): EvidenceRef[] {
  const seen = new Set<string>()
  const out: EvidenceRef[] = []
  for (const signal of signals) {
    for (const source of signal.evidence) {
      const key = `${source.domain}:${source.recordType}:${source.recordId}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(source)
    }
  }
  return out
}

function weakestConfidence(signals: ReasoningSignal[]): ReasoningConfidence {
  if (signals.some(signal => signal.confidence === 'low')) return 'low'
  if (signals.some(signal => signal.confidence === 'medium')) return 'medium'
  return 'high'
}

function severityRank(value: ReasoningSeverity): number {
  return value === 'critical' ? 0 : value === 'warning' ? 1 : 2
}

function freshnessFor(domains: ReasoningDomain[]): string {
  const keys = unique(domains.map(domain => {
    if (domain === 'finance') return 'finance'
    if (domain === 'tax') return 'tax'
    if (domain === 'hr') return 'hr'
    if (domain === 'operations' || domain === 'sales') return 'operations'
    return null
  }).filter((value): value is 'finance' | 'tax' | 'hr' | 'operations' => value !== null))
  return keys.map(key => `${key}: ${getFreshness(key)}`).join('; ') || 'Canlı store kayıtlarından türetildi.'
}

function tryCashSignal(signals: ReasoningSignal[]): ReasoningSignal | undefined {
  return signals.find(signal =>
    signal.kind === 'cash_position' &&
    signal.currency === 'TRY' &&
    finiteNumber(signal.amount) !== null,
  )
}

function detectLiquidityDataGaps(signals: ReasoningSignal[], now: Date): ReasoningCase[] {
  const outflows = signals.filter(signal =>
    signal.kind === 'cash_outflow' && signal.currency === 'TRY' && positiveAmount(signal) !== null,
  )
  if (outflows.length === 0) return []
  const cash = tryCashSignal(signals)
  const undated = outflows.filter(signal => dateMs(signal.eventDate) === null)
  const missing: string[] = []
  if (!cash) missing.push('TRY banka/kasa bakiyesi kayıtlı değil; likidite sonucu hesaplanmadı.')
  if (undated.length > 0) missing.push(`${undated.length} nakit çıkışının teyit edilmiş ödeme tarihi yok.`)
  if (missing.length === 0) return []

  const caseSignals = uniqueSignals([...(cash ? [cash] : []), ...undated])
  const domains = unique(['finance' as const, ...outflows.map(signal => signal.domain)])
  return [{
    id: `liquidity-data-gap:${cash ? 'dates' : 'cash'}:${dateOnlyFromLocalDate(now)}`,
    ruleId: 'liquidity-data-gap',
    severity: 'info',
    confidence: 'low',
    title: 'Likidite değerlendirmesi için veri eksik',
    summary: 'Nakit veya ödeme tarihi eksik olduğu için çapraz-katman likidite sonucu üretilmedi.',
    domains,
    signals: caseSignals,
    sources: uniqueSources(caseSignals),
    calculation: 'Eksik zorunlu girdiler nedeniyle nakit sonrası bakiye hesaplanmadı.',
    freshness: freshnessFor(domains),
    missingData: missing,
    rule: 'Likidite sonucu için doğrulanmış TRY nakit bakiyesi ve tarihli yükümlülükler gerekir.',
    recommendation: 'Eksik TRY hesap bakiyesini ve ödeme tarihlerini kaynağından doğrula.',
    owner: 'Finans',
  }]
}

function detectLiquidityWindows(signals: ReasoningSignal[], now: Date): ReasoningCase[] {
  const cashSignal = tryCashSignal(signals)
  if (!cashSignal) return []
  const cash = finiteNumber(cashSignal.amount)
  if (cash === null) return []

  const startDate = dateOnlyFromLocalDate(now)
  const startMs = dateMs(startDate) as number
  const horizonEnd = startMs + 30 * DAY
  const effectiveMs = (signal: ReasoningSignal): number | null => {
    const ms = dateMs(signal.eventDate)
    if (ms === null || ms > horizonEnd) return null
    return Math.max(startMs, ms)
  }
  const outflows = signals
    .filter(signal => signal.kind === 'cash_outflow' && signal.currency === 'TRY' && positiveAmount(signal) !== null)
    .filter(signal => effectiveMs(signal) !== null)
    .sort((a, b) => (effectiveMs(a) as number) - (effectiveMs(b) as number))
  const inflows = signals
    .filter(signal => signal.kind === 'cash_inflow' && signal.currency === 'TRY' && positiveAmount(signal) !== null)
    .filter(signal => signal.metadata?.status !== 'overdue')

  const cases: ReasoningCase[] = []
  const covered = new Set<string>()
  for (const anchor of outflows) {
    if (covered.has(anchor.id)) continue
    const anchorMs = effectiveMs(anchor)
    if (anchorMs === null) continue
    const endMs = anchorMs + 6 * DAY
    const group = outflows.filter(signal => {
      const ms = effectiveMs(signal)
      return ms !== null && ms >= anchorMs && ms <= endMs
    })
    const groupDomains = unique(group.map(signal => signal.domain))
    if (group.length < 2 || groupDomains.length < 2) continue
    group.forEach(signal => covered.add(signal.id))

    const obligationsThroughEnd = outflows.filter(signal => (effectiveMs(signal) ?? Number.POSITIVE_INFINITY) <= endMs)
    const expectedInflows = inflows.filter(signal => {
      const ms = dateMs(signal.eventDate)
      return ms !== null && ms >= startMs && ms <= endMs
    })
    const totalOut = obligationsThroughEnd.reduce((sum, signal) => sum + (positiveAmount(signal) ?? 0), 0)
    const totalIn = expectedInflows.reduce((sum, signal) => sum + (positiveAmount(signal) ?? 0), 0)
    const after = cash + totalIn - totalOut
    const pressure = cash > 0 ? totalOut / cash : totalOut > 0 ? 1 : 0

    let severity: ReasoningSeverity = 'info'
    if (after < 0 || pressure >= 0.5) severity = 'critical'
    else if (pressure >= 0.25 || after <= cash * 0.35) severity = 'warning'

    const caseSignals = uniqueSignals([cashSignal, ...obligationsThroughEnd, ...expectedInflows])
    const domains = unique(['finance' as const, ...groupDomains])
    const missingData = [
      'Vadeli tahsilatlar kayıtlı fatura vadelerine dayanır; tahsilat olasılığı yapılandırılmış değildir.',
      'Banka hesapları otomatik mutabakatla doğrulanmadıysa TRY nakit bakiyesi değişebilir.',
    ]
    const excludedCurrencies = unique(signals
      .filter(signal => (signal.kind === 'cash_inflow' || signal.kind === 'cash_outflow') && signal.currency && signal.currency !== 'TRY')
      .map(signal => signal.currency as ReasoningCurrency))
    if (excludedCurrencies.length > 0) {
      missingData.push(`${excludedCurrencies.join(', ')} yükümlülükler kur bilgisi olmadığı için hesaplamaya dahil edilmedi.`)
    }
    if (caseSignals.some(signal => signal.metadata?.requiresCalendarConfirmation === true)) {
      missingData.push('SGK ödeme tarihi resmi takvim, tatil ve dönemsel uzatma açısından teyit edilmelidir.')
    }

    const labels = group.map(signal => signal.label).join(', ')
    cases.push({
      id: `cash-window:${group.map(signal => signal.id).sort().join('|')}`,
      ruleId: 'liquidity-window-collision',
      severity,
      confidence: weakestConfidence(caseSignals),
      title: 'Aynı haftada çapraz-katman nakit çakışması',
      summary: `${labels} aynı 7 günlük pencereye düşüyor; pencere sonuna kadar ${money(totalOut)} çıkış sonrası beklenen TRY nakit ${money(after)}.`,
      domains,
      horizonStart: dateFromMs(anchorMs),
      horizonEnd: dateFromMs(endMs),
      signals: caseSignals,
      sources: uniqueSources(caseSignals),
      calculation: `${money(cash)} nakit + ${money(totalIn)} vadeli tahsilat - ${money(totalOut)} pencere sonuna kadarki yükümlülük = ${money(after)}. Yükümlülük / nakit oranı %${Math.round(pressure * 100)}.`,
      freshness: freshnessFor(domains),
      missingData,
      rule: 'Farklı iş alanlarından iki veya daha fazla TRY nakit çıkışı 7 günlük pencerede çakıştığında, bugünden pencere sonuna kadarki bütün tarihli TRY hareketler birlikte hesaplanır.',
      recommendation: after < 0
        ? 'Teyit edilmiş ödeme ve tahsilat tarihlerini birlikte yeniden planla; değiştirilebilen kayıtları sorumlularıyla netleştir.'
        : 'Ödeme sırasını ve tahsilat tarihlerini pencere başlamadan teyit et; hesaplanan nakit tamponunu koru.',
      owner: 'Patron + Finans + Mali Müşavir',
    })
  }

  return cases
}

function detectStockDemandGaps(signals: ReasoningSignal[]): ReasoningCase[] {
  const risks = signals.filter(signal => signal.kind === 'stock_risk' && signal.entityId)
  const demands = signals.filter(signal => signal.kind === 'demand_commitment' && signal.entityId)
  const cases: ReasoningCase[] = []

  for (const risk of risks) {
    const stockoutMs = dateMs(typeof risk.metadata?.stockoutDate === 'string' ? risk.metadata.stockoutDate : undefined)
    const urgency = String(risk.metadata?.urgency ?? '')
    const related = demands.filter(demand => {
      if (demand.entityId !== risk.entityId) return false
      if (urgency === 'commitment-gap') return true
      const due = dateMs(demand.eventDate)
      return due === null || stockoutMs === null || due <= stockoutMs
    })
    if (related.length === 0) continue

    const currentStock = finiteNumber(risk.metadata?.currentStock)
    if (currentStock === null) continue
    const committed = related.reduce((sum, signal) => sum + (finiteNumber(signal.quantity) ?? 0), 0)
    const shortage = Math.max(0, committed - currentStock)
    if (shortage <= 0 && urgency !== 'simdi' && urgency !== 'gecikti') continue

    const revenueAtRisk = related.reduce((sum, signal) => sum + (finiteNumber(signal.amount) ?? 0), 0)
    const caseSignals = [risk, ...related]
    const productName = String(risk.metadata?.productName ?? risk.label)
    const severity: ReasoningSeverity = shortage > 0 || urgency === 'gecikti' ? 'critical' : 'warning'

    cases.push({
      id: `stock-demand:${risk.entityId}:${related.map(signal => signal.id).sort().join('|')}`,
      ruleId: 'stock-demand-commitment-gap',
      severity,
      confidence: weakestConfidence(caseSignals),
      title: 'Satış taahhüdü stok riskiyle çakışıyor',
      summary: `${productName} için ${qty(committed)} birim açık satış taahhüdü var; mevcut stok ${qty(currentStock)}. Risk altındaki sipariş değeri ${money(revenueAtRisk)}.`,
      domains: ['sales', 'operations'],
      horizonStart: related.map(signal => signal.eventDate).filter((value): value is string => Boolean(value)).sort()[0],
      horizonEnd: typeof risk.metadata?.stockoutDate === 'string' ? risk.metadata.stockoutDate : undefined,
      signals: caseSignals,
      sources: uniqueSources(caseSignals),
      calculation: `${qty(committed)} açık sipariş - ${qty(currentStock)} mevcut stok = ${qty(shortage)} potansiyel açık. Açık sipariş değeri ${money(revenueAtRisk)}.`,
      freshness: freshnessFor(['operations', 'sales']),
      missingData: [
        'Açık alış siparişlerinin teyit edilmiş teslim miktarı stok rezervasyonuna bağlı değildir.',
        'Tahmine dayalı vakalarda model lineer tüketim varsayar; mevsimsellik dahil değildir.',
      ],
      rule: 'Açık satış siparişi miktarı aynı ürünün mevcut stokuyla doğrudan, varsa tahmini tükenme ufkuyla ayrıca karşılaştırılır.',
      recommendation: shortage > 0
        ? 'Eksik miktarı stok hareketleriyle teyit et; uygun tedarik veya üretim planını sorumlusuyla oluştur.'
        : 'Yeniden sipariş ihtiyacını teyit et ve açık satış siparişi için stok rezervini belirle.',
      owner: 'Operasyon + Satış',
    })
  }

  return cases
}

function detectProductionFundingPressure(signals: ReasoningSignal[], now: Date): ReasoningCase[] {
  const cashSignal = tryCashSignal(signals)
  const cash = finiteNumber(cashSignal?.amount)
  if (!cashSignal || cash === null) return []
  const startDate = dateOnlyFromLocalDate(now)
  const start = dateMs(startDate) as number
  const horizonEnd = start + 30 * DAY
  const shortageGroups = new Map<string, ReasoningSignal[]>()
  for (const shortage of signals.filter(signal => signal.kind === 'production_shortage')) {
    const productionId = String(shortage.metadata?.productionId ?? shortage.id)
    shortageGroups.set(productionId, [...(shortageGroups.get(productionId) ?? []), shortage])
  }

  const cases: ReasoningCase[] = []
  for (const [productionId, shortages] of shortageGroups) {
    const targetMs = Math.max(...shortages.map(signal => dateMs(signal.eventDate) ?? Number.NEGATIVE_INFINITY))
    if (!Number.isFinite(targetMs) || targetMs > horizonEnd) continue
    const effectiveTarget = Math.max(start, targetMs)
    const procurementCost = shortages.reduce((sum, signal) => sum + (positiveAmount(signal) ?? 0), 0)
    if (procurementCost <= 0) continue

    const obligations = signals.filter(signal => {
      if (signal.kind !== 'cash_outflow' || signal.domain === 'operations' || signal.currency !== 'TRY') return false
      const ms = dateMs(signal.eventDate)
      return positiveAmount(signal) !== null && ms !== null && ms <= effectiveTarget
    })
    const inflows = signals.filter(signal => {
      if (signal.kind !== 'cash_inflow' || signal.currency !== 'TRY' || signal.metadata?.status === 'overdue') return false
      const ms = dateMs(signal.eventDate)
      return positiveAmount(signal) !== null && ms !== null && ms >= start && ms <= effectiveTarget
    })
    const obligationTotal = obligations.reduce((sum, signal) => sum + (positiveAmount(signal) ?? 0), 0)
    const inflowTotal = inflows.reduce((sum, signal) => sum + (positiveAmount(signal) ?? 0), 0)
    const after = cash + inflowTotal - obligationTotal - procurementCost
    if (after > cash * 0.5) continue

    const caseSignals = uniqueSignals([cashSignal, ...shortages, ...obligations, ...inflows])
    const domains = unique(caseSignals.map(signal => signal.domain))
    cases.push({
      id: `production-funding:${productionId}`,
      ruleId: 'production-funding-pressure',
      severity: after < 0 ? 'critical' : 'warning',
      confidence: weakestConfidence(caseSignals),
      title: 'Üretim eksiğini kapatmak nakit tamponunu zorluyor',
      summary: `${shortages[0].metadata?.productionNo ?? 'Üretim emri'} için yaklaşık ${money(procurementCost)} malzeme gerekir; hedef tarihe kadarki kayıtlı hareketlerle TRY nakit ${money(after)} seviyesine iner.`,
      domains,
      horizonStart: startDate,
      horizonEnd: dateFromMs(effectiveTarget),
      signals: caseSignals,
      sources: uniqueSources(caseSignals),
      calculation: `${money(cash)} nakit + ${money(inflowTotal)} vadeli tahsilat - ${money(obligationTotal)} tarihli yükümlülük - ${money(procurementCost)} malzeme ihtiyacı = ${money(after)}.`,
      freshness: freshnessFor(domains),
      missingData: [
        'Malzeme maliyeti ürün kartındaki alış fiyatına dayanır; tedarikçi teklifiyle değişebilir.',
        'Açık alış siparişleri üretim malzeme ihtiyacına ürün bazında rezerve edilmemiştir.',
      ],
      rule: 'Üretim hedef tarihine kadar gereken eksik malzeme maliyeti, aynı tarihe kadarki kayıtlı TRY giriş ve yükümlülüklerle birlikte test edilir.',
      recommendation: 'Eksik miktarı, hedef tarihi ve tedarik fiyatını teyit et; finansman planını satın alma kararıyla birlikte güncelle.',
      owner: 'Operasyon + Finans',
    })
  }

  return cases
}

function detectOverdueReceivables(signals: ReasoningSignal[], now: Date): ReasoningCase[] {
  const todayMs = dateMs(dateOnlyFromLocalDate(now)) as number
  const receivables = signals.filter(signal => signal.kind === 'cash_inflow' && positiveAmount(signal) !== null)
  const cases: ReasoningCase[] = []
  for (const currency of currencies) {
    const currencyReceivables = receivables.filter(signal => signal.currency === currency)
    const overdue = currencyReceivables.filter(signal =>
      signal.metadata?.status === 'overdue' || ((dateMs(signal.eventDate) ?? Number.POSITIVE_INFINITY) < todayMs),
    )
    if (overdue.length === 0) continue
    const overdueTotal = overdue.reduce((sum, signal) => sum + (positiveAmount(signal) ?? 0), 0)
    const openTotal = currencyReceivables.reduce((sum, signal) => sum + (positiveAmount(signal) ?? 0), 0)
    const share = openTotal > 0 ? overdueTotal / openTotal : 0
    cases.push({
      id: `overdue-receivables:${currency}:${overdue.map(signal => signal.id).sort().join('|')}`,
      ruleId: 'overdue-receivables-concentration',
      severity: share >= 0.4 ? 'critical' : 'warning',
      confidence: weakestConfidence(overdue),
      title: 'Gecikmiş alacak yoğunlaşması',
      summary: `${overdue.length} tahsilat vadesini aştı; toplam ${money(overdueTotal, currency)}, ${currency} açık alacakların %${Math.round(share * 100)}'i.`,
      domains: ['finance'],
      signals: overdue,
      sources: uniqueSources(overdue),
      calculation: `${money(overdueTotal, currency)} gecikmiş / ${money(openTotal, currency)} açık alacak = %${Math.round(share * 100)}.`,
      freshness: freshnessFor(['finance']),
      missingData: ['Müşteri görüşmeleri, ödeme taahhütleri ve tahsilat olasılıkları yapılandırılmış değildir.'],
      rule: 'Vadesi geçmiş alacakların aynı para birimindeki toplam açık alacak içindeki yoğunluğu izlenir.',
      recommendation: 'En büyük gecikmiş alacaktan başlayarak tahsilat durumunu doğrula ve teyit edilmiş ödeme sözünü tarihli kayıt olarak ekle.',
      owner: 'Finans + Satış',
    })
  }
  return cases
}

function detectComplianceRisks(signals: ReasoningSignal[]): ReasoningCase[] {
  const risks = signals.filter(signal => signal.kind === 'compliance_risk')
  if (risks.length === 0) return []
  const validWeights = risks.map(signal => finiteNumber(signal.metadata?.weight)).filter((value): value is number => value !== null)
  const weight = validWeights.reduce((sum, value) => sum + value, 0)
  const invalidWeightCount = risks.length - validWeights.length
  const missingData = ['Entegratör ve resmi kaynak mutabakatı bağlı değilse bazı uyumsuzlukların detayı eksik kalabilir.']
  if (invalidWeightCount > 0) missingData.push(`${invalidWeightCount} uyumluluk ağırlığı geçersiz olduğu için toplama dahil edilmedi.`)

  return [{
    id: `compliance:${risks.map(signal => signal.id).sort().join('|')}`,
    ruleId: 'compliance-gap',
    severity: risks.some(signal => signal.metadata?.status === 'eksik') ? 'warning' : 'info',
    confidence: weakestConfidence(risks),
    title: 'Uyumluluk açıkları',
    summary: `${risks.length} alan tam uyumlu değil; geçerli kayıtların toplam ağırlığı %${weight}.`,
    domains: ['tax'],
    signals: risks,
    sources: uniqueSources(risks),
    calculation: `Geçerli uyumsuz alan ağırlıkları toplamı %${weight}.`,
    freshness: freshnessFor(['tax']),
    missingData,
    rule: 'Eksik veya riskli işaretlenen uyumluluk alanları birlikte raporlanır; yalnızca geçerli sayısal ağırlıklar toplanır.',
    recommendation: 'Eksik ve riskli alanların kanıt kayıtlarını gözden geçir; sorumluları mali müşavirinle netleştir.',
    owner: 'Mali Müşavir',
  }]
}

export function runReasoningEngine(
  signals: ReasoningSignal[] | undefined = undefined,
  now = new Date(),
): ReasoningCase[] {
  const sourceSignals = signals ?? buildReasoningSignals(now)
  return [
    ...detectLiquidityWindows(sourceSignals, now),
    ...detectStockDemandGaps(sourceSignals),
    ...detectProductionFundingPressure(sourceSignals, now),
    ...detectOverdueReceivables(sourceSignals, now),
    ...detectComplianceRisks(sourceSignals),
    ...detectLiquidityDataGaps(sourceSignals, now),
  ].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
}

export function buildReasoningSnapshot(now = new Date()): ReasoningSnapshot {
  const signals = buildReasoningSignals(now)
  return {
    generatedAt: now.toISOString(),
    signals,
    cases: runReasoningEngine(signals, now),
  }
}
