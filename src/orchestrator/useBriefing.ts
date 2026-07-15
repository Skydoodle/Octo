import { useEffect, useState } from 'react'
import type { Briefing } from './orchestrator'
import { useTaxStore } from '../layers/tax/taxStore'
import { useIKStore } from '../layers/hr/hrStore'
import { useOpStore } from '../layers/operations/opStore'
import { useCompanyObligationSettings } from '../settings/companyObligationSettings'
import { runReasoningEngine } from '../reasoning/engine'
import type { ReasoningSignal } from '../reasoning/types'

export function useBriefing(signals: ReasoningSignal[]) {
  // Explicit subscriptions ensure every reasoning source causes a fresh,
  // synchronous deterministic snapshot. There is no stale narration cache.
  useTaxStore()
  useIKStore()
  useOpStore()
  useCompanyObligationSettings()

  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const cases = runReasoningEngine(signals, new Date(clock))
  const briefing: Briefing = cases.length === 0 ? { ozet: signals.length ? 'Kayıtlı verilerde mevcut deterministik kuralların kapsadığı bir vaka tespit edilmedi.' : '', kollar: [] } : { ozet: cases[0].summary, kollar: cases.slice(0,4).map(item=>({kol:item.domains.map(domain=>({finance:'Finans',tax:'Vergi',hr:'İK',operations:'Operasyon',sales:'Satış',legal:'Hukuk',audit:'Denetim'}[domain])).join(' + '),aciliyet:item.severity==='critical'?'kritik':item.severity==='warning'?'dikkat':'stabil',metin:`${item.summary} Öneri: ${item.recommendation}`})) }
  const regenerate = () => setClock(current => Math.max(Date.now(), current + 1))
  return { briefing, loading: false, error: null as string | null, regenerate }
}
