import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../store/persist'

export type InsightActionStatus =
  | 'new'
  | 'reviewed'
  | 'in_progress'
  | 'waiting'
  | 'resolved'
  | 'dismissed'

export interface InsightActionState {
  insightId: string
  status: InsightActionStatus
  assignedTo?: string
  note?: string
  updatedAt: string
}

export const insightActionStatusLabels: Record<InsightActionStatus, string> = {
  new: 'Yeni',
  reviewed: 'İncelendi',
  in_progress: 'İşlemde',
  waiting: 'Bilgi bekleniyor',
  resolved: 'Çözüldü',
  dismissed: 'İlgili değil',
}

const KEY = 'insight-actions-v1'
const statuses: InsightActionStatus[] = ['new', 'reviewed', 'in_progress', 'waiting', 'resolved', 'dismissed']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeInsightActionState(value: unknown): InsightActionState | null {
  if (!isRecord(value)) return null
  if (typeof value.insightId !== 'string' || !value.insightId.trim()) return null
  if (typeof value.status !== 'string' || !statuses.includes(value.status as InsightActionStatus)) return null
  if (typeof value.updatedAt !== 'string' || !Number.isFinite(new Date(value.updatedAt).getTime())) return null
  const assignedTo = typeof value.assignedTo === 'string' && value.assignedTo.trim()
    ? value.assignedTo.trim()
    : undefined
  const note = typeof value.note === 'string' && value.note.trim() ? value.note.trim() : undefined
  return {
    insightId: value.insightId,
    status: value.status as InsightActionStatus,
    assignedTo,
    note,
    updatedAt: value.updatedAt,
  }
}

export function deserializeInsightActionStates(value: unknown): InsightActionState[] {
  const parsed = typeof value === 'string'
    ? (() => {
        try { return JSON.parse(value) as unknown } catch { return [] }
      })()
    : value
  if (!Array.isArray(parsed)) return []
  const byId = new Map<string, InsightActionState>()
  for (const item of parsed) {
    const normalized = normalizeInsightActionState(item)
    if (normalized) byId.set(normalized.insightId, normalized)
  }
  return [...byId.values()].sort((a, b) => a.insightId.localeCompare(b.insightId))
}

export function serializeInsightActionStates(value: InsightActionState[]): string {
  return JSON.stringify(deserializeInsightActionStates(value))
}

const loaded = loadOrSeed<unknown>(KEY, [])
let state = deserializeInsightActionStates(loaded)
const listeners = new Set<() => void>()

function emit(): void {
  save(KEY, state)
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getInsightActionStates(): InsightActionState[] {
  return state
}

export function useInsightActionStates(): InsightActionState[] {
  return useSyncExternalStore(subscribe, getInsightActionStates, getInsightActionStates)
}

export function getInsightActionState(insightId: string): InsightActionState | undefined {
  return state.find(item => item.insightId === insightId)
}

export function setInsightActionState(
  insightId: string,
  patch: Partial<Omit<InsightActionState, 'insightId' | 'updatedAt'>>,
  now = new Date(),
): InsightActionState {
  const current = getInsightActionState(insightId)
  const next = normalizeInsightActionState({
    insightId,
    status: patch.status ?? current?.status ?? 'new',
    assignedTo: patch.assignedTo === undefined ? current?.assignedTo : patch.assignedTo,
    note: patch.note === undefined ? current?.note : patch.note,
    updatedAt: now.toISOString(),
  }) as InsightActionState
  state = [...state.filter(item => item.insightId !== insightId), next]
    .sort((a, b) => a.insightId.localeCompare(b.insightId))
  emit()
  return next
}

export function replaceInsightActionStatesForTest(value: unknown): void {
  state = deserializeInsightActionStates(value)
  emit()
}
