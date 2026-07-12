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
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const requestId = useRef(0)

  const refreshCompanies = useCallback(async (): Promise<boolean> => {
    const currentRequest = ++requestId.current
    if (!user) {
      setCompanies([])
      setError(null)
      setLoading(false)
      setLoadedUserId(null)
      setActiveCompanyId(null)
      return true
    }

    setLoading(true)
    setError(null)
    const [companyResult, membershipResult] = await Promise.all([
      supabase
        .from('companies')
        .select('id, name, base_currency')
        .order('created_at', { ascending: true }),
      supabase
        .from('company_memberships')
        .select('company_id, role, status')
        .eq('user_id', user.id),
    ])

    if (currentRequest !== requestId.current) return false
    const loadError = companyResult.error ?? membershipResult.error
    if (loadError) {
      setCompanies([])
      setError(companyLoadErrorMessage(loadError))
      setLoading(false)
      setLoadedUserId(user.id)
      return false
    }

    const accessByCompany = new Map((membershipResult.data ?? []).map(membership => [membership.company_id, membership]))
    const nextCompanies: Company[] = (companyResult.data ?? []).map(company => {
      const access = accessByCompany.get(company.id)
      return {
        ...company,
        role: access?.role ?? null,
        membership_status: access?.status ?? null,
      }
    })
    setCompanies(nextCompanies)
    setActiveCompanyId(current => current && nextCompanies.some(company => company.id === current)
      ? current
      : nextCompanies[0]?.id ?? null)
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
    activeCompany: companies.find(company => company.id === activeCompanyId) ?? companies[0] ?? null,
    setActiveCompanyId,
    loading: loading || Boolean(user && loadedUserId !== user.id),
    error,
    refreshCompanies,
  }), [activeCompanyId, companies, error, loadedUserId, loading, refreshCompanies, user])

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}
