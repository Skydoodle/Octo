import { describe, expect, it } from 'vitest'
import type { DataCoverageSnapshot } from '../../../coverage/dataCoverage'
import type { IKState } from '../../../layers/hr/hrStore'
import type { ReasoningCase } from '../../../reasoning/types'
import {
  deserializeInsightActionStates,
  serializeInsightActionStates,
} from '../../../shared/insights/insightActionStore'
import { aggregateOwnerTasks, mapInsightActionToTaskStatus } from './taskViewModel'

const actionState = {
  insightId: 'case-1',
  status: 'resolved' as const,
  assignedTo: 'Finans',
  updatedAt: '2026-07-10T10:00:00.000Z',
}

const reasoningCase: ReasoningCase = {
  id: 'case-1', ruleId: 'rule', severity: 'warning', confidence: 'high',
  title: 'Tahsilat riski', summary: 'Bir tahsilat gecikti.', domains: ['finance'],
  signals: [], sources: [], calculation: '1', freshness: 'az önce', missingData: [],
  rule: 'Kural', recommendation: 'İnceleyin.', owner: 'Finans',
}

const hr: IKState = {
  personeller: [{
    id: 'p1', ad: 'Ayşe', soyad: 'Yılmaz', tcKimlik: '11111111111', iseGirisTarihi: '2020-01-01',
    brutMaas: 50000, departman: 'Operasyon', pozisyon: 'Uzman', sgkDurumu: 'normal',
    calismaSekli: 'tam_zamanli', sgkIndirimli: true, aktif: true,
  }],
  puantajlar: [],
  izinler: [{
    id: 'leave-1', personelId: 'p1', tur: 'yillik', baslangic: '2026-07-20', bitis: '2026-07-22',
    gunSayisi: 3, durum: 'beklemede', olusturulma: '2026-07-10',
  }],
}

const coverage: DataCoverageSnapshot = {
  generatedAt: '2026-07-10T10:00:00.000Z',
  domains: [{
    domain: 'finance', label: 'Finans', status: 'partial', explanation: 'Kısmi',
    missingActions: ['Banka bakiyesi ekleyin.'], freshness: 'az önce',
    availableCapabilities: [], blockedCapabilities: [],
  }],
}

describe('insight action persistence', () => {
  it('serializes valid state and drops malformed records on read', () => {
    const serialized = serializeInsightActionStates([actionState])
    const parsed = deserializeInsightActionStates(`${serialized.slice(0, -1)}, {"status":"bad"}]`)
    expect(parsed).toEqual([actionState])
  })

  it('maps resolved and dismissed states to completed tasks reversibly', () => {
    expect(mapInsightActionToTaskStatus('resolved').category).toBe('completed')
    expect(mapInsightActionToTaskStatus('dismissed').category).toBe('completed')
    expect(mapInsightActionToTaskStatus('reviewed').category).toBe('insights')
  })
})

describe('task aggregation', () => {
  it('aggregates real insight, pending leave, and coverage sources', () => {
    const tasks = aggregateOwnerTasks({ cases: [reasoningCase], actionStates: [actionState], hr, coverage })
    expect(tasks.some(task => task.sourceType === 'insight' && task.category === 'completed')).toBe(true)
    expect(tasks.some(task => task.sourceType === 'leave' && task.category === 'approvals')).toBe(true)
    expect(tasks.some(task => task.sourceType === 'coverage' && task.category === 'missing_data')).toBe(true)
  })
})
