import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthContextValue, type AuthResult } from './authContext'
import { authErrorMessage } from './authErrors'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setError(null)
      setLoading(false)
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      setSession(data.session)
      setError(sessionError ? authErrorMessage(sessionError) : null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (!signInError) {
      setSession(data.session)
      setError(null)
    }
    return { session: data.session, error: signInError }
  }, [])

  const signOut = useCallback(async (): Promise<AuthError | null> => {
    const { error: signOutError } = await supabase.auth.signOut()
    if (!signOutError) {
      setSession(null)
      setError(null)
    }
    return signOutError
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    error,
    signIn,
    signOut,
  }), [error, loading, session, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
