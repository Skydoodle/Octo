import { ACCOUNT_PATH } from './routeProtection'

interface AuthLocationState {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

export function authDestinationFromState(state: unknown): string {
  const from = (state as AuthLocationState | null)?.from
  const pathname = from?.pathname
  const isAllowed = pathname?.startsWith('/dashboard')
    || pathname === ACCOUNT_PATH
    || pathname === '/invite'
  if (!pathname || !isAllowed) return '/dashboard'
  return `${pathname}${from.search ?? ''}${from.hash ?? ''}`
}
