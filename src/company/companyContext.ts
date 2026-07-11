import { createContext, useContext } from 'react'

export interface Company {
  id: string
  name: string
  base_currency: string
}

export interface CompanyContextValue {
  companies: Company[]
  loading: boolean
  error: string | null
  refreshCompanies: () => Promise<boolean>
}

export const CompanyContext = createContext<CompanyContextValue | null>(null)

export function useCompanies(): CompanyContextValue {
  const value = useContext(CompanyContext)
  if (!value) throw new Error('useCompanies must be used within CompanyProvider.')
  return value
}
