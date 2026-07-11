import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/authContext'
import { CompanyContext, type Company, type CompanyContextValue } from './companyContext'
import { companyLoadErrorMessage } from './companyErrors'

export default function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
  const requestId = useRef(0)

  const refreshCompanies = useCallback(async (): Promise<boolean> => {
    const currentRequest = ++requestId.current
    if (!user) {
      setCompanies([])
      setError(null)
      setLoading(false)
      setLoadedUserId(null)
      return true
    }

    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase
      .from('companies')
      .select('id, name, base_currency')
      .order('created_at', { ascending: true })

    if (currentRequest !== requestId.current) return false
    if (loadError) {
      setCompanies([])
      setError(companyLoadErrorMessage(loadError))
      setLoading(false)
      setLoadedUserId(user.id)
      return false
    }

    setCompanies(data ?? [])
    setLoading(false)
    setLoadedUserId(user.id)
    return true
  }, [user])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void refreshCompanies()
    }, 0)
    return () => {
      window.clearTimeout(loadTimer)
      requestId.current += 1
    }
  }, [refreshCompanies])

  const value = useMemo<CompanyContextValue>(() => ({
    companies,
    loading: loading || Boolean(user && loadedUserId !== user.id),
    error,
    refreshCompanies,
  }), [companies, error, loadedUserId, loading, refreshCompanies, user])

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}
