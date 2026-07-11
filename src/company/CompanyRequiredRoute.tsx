import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Wordmark } from '../shared/utils/ui'
import { useCompanies } from './companyContext'

export default function CompanyRequiredRoute({ children }: { children: ReactNode }) {
  const { companies, loading, error, refreshCompanies } = useCompanies()

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-6" role="status">
        <div className="text-center">
          <Wordmark className="text-4xl" />
          <p className="mt-4 text-sm text-ink-mute">Şirket bilgileriniz yükleniyor…</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-6">
        <div className="w-full max-w-md rounded-card border border-crimson/25 bg-surface p-6 text-center shadow-soft">
          <AlertCircle size={22} className="mx-auto text-crimson" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink">Şirket bilgileri yüklenemedi</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{error}</p>
          <button
            type="button"
            onClick={() => void refreshCompanies()}
            className="focus-ring mt-5 rounded-lg bg-crimson px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Yeniden dene
          </button>
        </div>
      </main>
    )
  }

  if (companies.length === 0) return <Navigate to="/setup/company" replace />
  return children
}
