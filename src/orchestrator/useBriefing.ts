import { useEffect, useState } from 'react'
import { buildDeterministicBriefing, type Briefing } from './orchestrator'
import { useFinanceStore } from '../layers/finance/financeStore'
import { useTaxStore } from '../layers/tax/taxStore'
import { useIKStore } from '../layers/hr/hrStore'
import { useOpStore } from '../layers/operations/opStore'

export function useBriefing() {
  // Explicit subscriptions ensure every reasoning source causes a fresh,
  // synchronous deterministic snapshot. There is no stale narration cache.
  useFinanceStore()
  useTaxStore()
  useIKStore()
  useOpStore()

  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const briefing: Briefing = buildDeterministicBriefing(new Date(clock))
  const regenerate = () => setClock(current => Math.max(Date.now(), current + 1))
  return { briefing, loading: false, error: null as string | null, regenerate }
}
