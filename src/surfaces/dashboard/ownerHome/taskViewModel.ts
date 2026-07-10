import type { DataCoverageSnapshot } from '../../../coverage/dataCoverage'
import type { IKState } from '../../../layers/hr/hrStore'
import { izinBakiyesi, izinTuruLabels } from '../../../layers/hr/attendanceTypes'
import type { ReasoningCase, ReasoningSeverity } from '../../../reasoning/types'
import type {
  InsightActionState,
  InsightActionStatus,
} from '../../../shared/insights/insightActionStore'
import { relevantDate } from './ownerHomeViewModel'

export type OwnerTaskCategory = 'insights' | 'approvals' | 'missing_data' | 'completed'
export type OwnerTaskSource = 'insight' | 'leave' | 'coverage'

export interface OwnerTaskViewModel {
  id: string
  sourceId: string
  category: OwnerTaskCategory
  sourceType: OwnerTaskSource
  title: string
  explanation: string
  severity: ReasoningSeverity
  dueDate?: string
  responsible?: string
  status: string
  primaryAction: string
  href: string
  remainingLeave?: number
}

export interface OwnerTaskSources {
  cases: ReasoningCase[]
  actionStates: InsightActionState[]
  hr: IKState
  coverage: DataCoverageSnapshot
}

export function mapInsightActionToTaskStatus(status: InsightActionStatus): {
  category: OwnerTaskCategory
  label: string
} {
  if (status === 'resolved') return { category: 'completed', label: 'Çözüldü' }
  if (status === 'dismissed') return { category: 'completed', label: 'İlgili değil' }
  if (status === 'reviewed') return { category: 'insights', label: 'İncelendi' }
  if (status === 'in_progress') return { category: 'insights', label: 'İşlemde' }
  if (status === 'waiting') return { category: 'insights', label: 'Bilgi bekleniyor' }
  return { category: 'insights', label: 'Yeni' }
}

function insightTasks(
  cases: ReasoningCase[],
  actionStates: InsightActionState[],
): OwnerTaskViewModel[] {
  return cases.map(reasoningCase => {
    const action = actionStates.find(item => item.insightId === reasoningCase.id)
    const mapped = mapInsightActionToTaskStatus(action?.status ?? 'new')
    return {
      id: `insight:${reasoningCase.id}`,
      sourceId: reasoningCase.id,
      category: mapped.category,
      sourceType: 'insight',
      title: reasoningCase.title,
      explanation: reasoningCase.summary,
      severity: reasoningCase.severity,
      dueDate: relevantDate(reasoningCase),
      responsible: action?.assignedTo ?? reasoningCase.owner,
      status: mapped.label,
      primaryAction: mapped.category === 'completed' ? 'Yeniden aç' : 'İncele',
      href: `/dashboard?insight=${encodeURIComponent(reasoningCase.id)}`,
    }
  })
}

function leaveTasks(hr: IKState): OwnerTaskViewModel[] {
  return hr.izinler.map(request => {
    const person = hr.personeller.find(item => item.id === request.personelId)
    const employeeName = person ? `${person.ad} ${person.soyad}` : 'Personel kaydı bulunamadı'
    const usedAnnualLeave = hr.izinler
      .filter(item => item.personelId === request.personelId && item.tur === 'yillik' && item.durum === 'onaylandi')
      .reduce((sum, item) => sum + item.gunSayisi, 0)
    const balance = person ? izinBakiyesi(person.iseGirisTarihi, usedAnnualLeave) : null
    const completed = request.durum !== 'beklemede'
    return {
      id: `leave:${request.id}`,
      sourceId: request.id,
      category: completed ? 'completed' : 'approvals',
      sourceType: 'leave',
      title: `${employeeName} · ${izinTuruLabels[request.tur]}`,
      explanation: `${request.baslangic} – ${request.bitis} · ${request.gunSayisi} gün`,
      severity: 'info',
      dueDate: request.baslangic,
      responsible: 'İnsan & Bordro',
      status: request.durum === 'beklemede' ? 'Onay bekliyor' : request.durum === 'onaylandi' ? 'Onaylandı' : 'Reddedildi',
      primaryAction: completed ? 'Detayı gör' : 'Karar ver',
      href: '/dashboard/ik',
      remainingLeave: request.tur === 'yillik' ? balance?.kalan : undefined,
    }
  })
}

function coverageTasks(coverage: DataCoverageSnapshot): OwnerTaskViewModel[] {
  return coverage.domains.flatMap(domain => domain.missingActions.map((action, index) => ({
    id: `coverage:${domain.domain}:${index}`,
    sourceId: domain.domain,
    category: 'missing_data' as const,
    sourceType: 'coverage' as const,
    title: `${domain.label} bilgisini tamamlayın`,
    explanation: action,
    severity: domain.status === 'missing' ? 'warning' as const : 'info' as const,
    responsible: domain.label,
    status: domain.status === 'missing' ? 'Eksik' : 'Kısmi',
    primaryAction: 'Veri ekle',
    href: domain.domain === 'finance'
      ? '/dashboard/finans'
      : domain.domain === 'tax'
        ? '/dashboard/vergi'
        : domain.domain === 'hr'
          ? '/dashboard/ik'
          : '/dashboard/operasyon',
  })))
}

const categoryRank: Record<OwnerTaskCategory, number> = {
  approvals: 0,
  insights: 1,
  missing_data: 2,
  completed: 3,
}

const severityRank: Record<ReasoningSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

export function aggregateOwnerTasks(sources: OwnerTaskSources): OwnerTaskViewModel[] {
  return [
    ...insightTasks(sources.cases, sources.actionStates),
    ...leaveTasks(sources.hr),
    ...coverageTasks(sources.coverage),
  ].sort((a, b) =>
    categoryRank[a.category] - categoryRank[b.category] ||
    severityRank[a.severity] - severityRank[b.severity] ||
    (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') ||
    a.id.localeCompare(b.id),
  )
}

export function filterOwnerTasks(
  tasks: OwnerTaskViewModel[],
  category: OwnerTaskCategory,
): OwnerTaskViewModel[] {
  return tasks.filter(task => task.category === category)
}
