import { useState } from 'react'
import { buildDataCoverageWithoutLegacyFinance } from '../../../coverage/dataCoverage'
import {
  getIKState,
  kullanilanYillikIzin,
  setIzinDurumu,
  useIKStore,
} from '../../../layers/hr/hrStore'
import { izinBakiyesi } from '../../../layers/hr/attendanceTypes'
import { useFinanceData } from '../../../layers/finance/ui/FinanceDataContext'
import { productionFinanceCoverage } from '../../../layers/finance/ui/financeUIModel'
import { productionSignalsOnly } from '../../../layers/finance/ui/productionFinanceSignals'
import { useTaxStore } from '../../../layers/tax/taxStore'
import { useOpStore } from '../../../layers/operations/opStore'
import { runReasoningEngine } from '../../../reasoning/engine'
import { buildReasoningSignalsWithoutLegacyFinance } from '../../../reasoning/signalAdapters'
import { useCompanyObligationSettings } from '../../../settings/companyObligationSettings'
import {
  setInsightActionState,
  useInsightActionStates,
} from '../../../shared/insights/insightActionStore'
import { useDataManager } from '../dataManagerContext'
import {
  aggregateOwnerTasks,
  filterOwnerTasks,
  type OwnerTaskCategory,
  type OwnerTaskViewModel,
} from '../ownerHome/taskViewModel'
import TaskCard from './TaskCard'

const sections: Array<{ category: OwnerTaskCategory; label: string; description: string }> = [
  { category: 'insights', label: 'İçgörüler', description: 'İşletme kayıtlarından türetilen, takip edilmesi gereken sonuçlar.' },
  { category: 'approvals', label: 'Onaylar', description: 'Gerçek domain akışlarında kararınızı bekleyen kayıtlar.' },
  { category: 'missing_data', label: 'Eksik bilgiler', description: 'Değerlendirmeyi veya hesaplamayı sınırlayan veri eksikleri.' },
  { category: 'completed', label: 'Tamamlananlar', description: 'Çözülen, ilgili değil olarak işaretlenen veya sonuçlanan kayıtlar.' },
]

export default function TasksPage() {
  const { snapshot: finance } = useFinanceData()
  useTaxStore()
  useOpStore()
  const hr = useIKStore()
  const settings = useCompanyObligationSettings()
  const actionStates = useInsightActionStates()
  const openData = useDataManager()
  const [feedback, setFeedback] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const now = new Date()
  const signals = productionSignalsOnly(buildReasoningSignalsWithoutLegacyFinance(now), finance)
  const cases = runReasoningEngine(signals, now, settings.baseCurrency)
  const legacyCoverage = buildDataCoverageWithoutLegacyFinance(now)
  const financeCoverage = productionFinanceCoverage(finance)
  const coverage = {...legacyCoverage,domains:legacyCoverage.domains.map(domain=>domain.domain==='finance'?{...domain,...financeCoverage,freshness:'Supabase şirket kayıtları'}:domain)}
  const tasks = aggregateOwnerTasks({ cases, actionStates, hr, coverage })

  const decideLeave = (task: OwnerTaskViewModel, status: 'onaylandi' | 'reddedildi') => {
    setIzinDurumu(task.sourceId, status)
    if (status === 'reddedildi') {
      setFeedback('İzin talebi reddedildi. İnsan & Bordro kaydı güncellendi.')
      return
    }
    const state = getIKState()
    const request = state.izinler.find(item => item.id === task.sourceId)
    const person = request ? state.personeller.find(item => item.id === request.personelId) : undefined
    if (request?.tur === 'yillik' && person) {
      const balance = izinBakiyesi(person.iseGirisTarihi, kullanilanYillikIzin(person.id))
      setFeedback(`İzin onaylandı. Kalan yıllık izin: ${balance.kalan} gün.`)
    } else {
      setFeedback('İzin onaylandı. İnsan & Bordro kaydı güncellendi.')
    }
  }

  return (
    <div className="space-y-7">
      <header>
        <div className="label text-crimson">Sizin için</div>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">Yapılacaklar</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">İçgörüler, gerçek onay akışları ve eksik bilgiler tek bir çalışma listesinde.</p>
      </header>

      {feedback && (
        <div role="status" className="rounded-lg border border-positive/25 bg-positive/5 px-4 py-3 text-sm text-positive">{feedback}</div>
      )}

      {sections.map(section => {
        const sectionTasks = filterOwnerTasks(tasks, section.category)
        if (section.category === 'completed' && !showCompleted) {
          return (
            <section key={section.category} className="border-t border-line pt-5">
              <button type="button" onClick={() => setShowCompleted(true)} className="focus-ring flex w-full items-center justify-between rounded py-2 text-left">
                <span>
                  <span className="font-display text-2xl font-semibold text-ink">Tamamlananlar</span>
                  <span className="ml-2 text-sm text-ink-mute">{sectionTasks.length}</span>
                </span>
                <span className="text-xs text-ink-mute">Göster</span>
              </button>
            </section>
          )
        }
        return (
          <section key={section.category} aria-labelledby={`tasks-${section.category}`}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id={`tasks-${section.category}`} className="font-display text-2xl font-semibold text-ink">{section.label}</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-mute">{section.description}</p>
              </div>
              {section.category === 'completed' && (
                <button type="button" onClick={() => setShowCompleted(false)} className="focus-ring rounded text-xs text-ink-mute hover:text-ink">Gizle</button>
              )}
            </div>
            {sectionTasks.length === 0 ? (
              <div className="rounded-card border border-line bg-surface px-5 py-4 text-sm text-ink-mute">Bu bölümde bekleyen kayıt yok.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {sectionTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onApproveLeave={item => decideLeave(item, 'onaylandi')}
                    onRejectLeave={item => decideLeave(item, 'reddedildi')}
                    onReopenInsight={item => {
                      setInsightActionState(item.sourceId, { status: 'reviewed' })
                      setFeedback('İçgörü yeniden açıldı ve “İncelendi” durumuna alındı.')
                    }}
                    onAddData={openData}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
