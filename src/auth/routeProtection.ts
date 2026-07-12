export type ProtectedRouteDecision = 'loading' | 'error' | 'redirect' | 'allow'
export const ACCOUNT_PATH = '/account'

export function protectedRouteDecision({
  loading,
  error,
  hasSession,
}: {
  loading: boolean
  error: string | null
  hasSession: boolean
}): ProtectedRouteDecision {
  if (loading) return 'loading'
  if (error && !hasSession) return 'error'
  if (!hasSession) return 'redirect'
  return 'allow'
}
