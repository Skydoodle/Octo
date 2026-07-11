import { createContext, useContext } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'

export interface AuthResult {
  session: Session | null
  error: AuthError | null
}

export interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<AuthError | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}
