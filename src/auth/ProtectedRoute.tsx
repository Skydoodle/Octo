import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from './authContext'
import { Wordmark } from '../shared/utils/ui'
import { protectedRouteDecision } from './routeProtection'

function AuthStatusScreen({ error }: { error?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6">
      <div className="w-full max-w-md text-center">
        <Wordmark className="text-4xl" />
        {error ? (
          <div className="mt-7 rounded-card border border-crimson/25 bg-crimson/5 p-5">
            <AlertCircle size={20} className="mx-auto text-crimson" />
            <h1 className="mt-3 font-display text-2xl font-semibold text-ink">Oturum doğrulanamadı</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="focus-ring mt-4 rounded bg-crimson px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Yeniden dene
            </button>
          </div>
        ) : (
          <div className="mt-7" role="status" aria-live="polite">
            <div className="mx-auto h-7 w-7 animate-pulse rounded-full border border-crimson bg-crimson/10" />
            <p className="mt-3 text-sm text-ink-mute">Oturumunuz kontrol ediliyor…</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, error } = useAuth()
  const location = useLocation()
  const decision = protectedRouteDecision({ loading, error, hasSession: Boolean(session) })

  if (decision === 'loading') return <AuthStatusScreen />
  if (decision === 'error') return <AuthStatusScreen error={error ?? undefined} />
  if (decision === 'redirect') return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
