import type { ReactNode } from 'react'

export const inputClass = 'focus-ring w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-mute'
export const buttonPrimary = 'focus-ring rounded-lg bg-crimson px-4 py-2.5 text-sm font-medium text-white hover:bg-crimson/90 disabled:cursor-wait disabled:opacity-55'
export const buttonSecondary = 'focus-ring rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink-soft hover:border-crimson/35 hover:text-crimson disabled:opacity-50'

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string | null }) {
  return <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">{label}</span>{children}{error && <span role="alert" className="mt-1 block text-xs text-crimson">{error}</span>}</label>
}

export function PageState({ kind, message, retry }: { kind: 'loading' | 'error' | 'empty'; message: string; retry?: () => void }) {
  return <div role={kind === 'error' ? 'alert' : 'status'} aria-live="polite" className="rounded-card border border-line bg-surface px-6 py-12 text-center"><p className="text-sm text-ink-soft">{message}</p>{retry && <button type="button" onClick={retry} className={`${buttonSecondary} mt-4`}>Yeniden dene</button>}</div>
}

export function Badge({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${muted ? 'bg-surface-2 text-ink-mute' : 'bg-crimson/10 text-crimson'}`}>{children}</span>
}
