import { useState, type FormEvent } from 'react'
import { Building2 } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ThemeToggle, Wordmark } from '../shared/utils/ui'
import { supabase } from '../lib/supabase'
import { useCompanies } from './companyContext'
import { companyCreationErrorMessage } from './companyErrors'

const currencies = ['TRY', 'EUR', 'USD', 'GBP'] as const

export default function CompanySetupPage() {
  const navigate = useNavigate()
  const { companies, loading, error: loadError, refreshCompanies } = useCompanies()
  const [companyName, setCompanyName] = useState('')
  const [baseCurrency, setBaseCurrency] = useState<(typeof currencies)[number]>('TRY')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (!loading && !loadError && companies.length > 0) return <Navigate to="/dashboard" replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!companyName.trim()) {
      setFormError('Şirket adı boş bırakılamaz.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const { error } = await supabase.rpc('create_company', {
        company_name: companyName.trim(),
        company_base_currency: baseCurrency,
      })
      if (error) {
        setFormError(companyCreationErrorMessage(error))
        return
      }

      const refreshed = await refreshCompanies()
      if (!refreshed) return
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(companyCreationErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <div className="flex items-baseline gap-2">
          <Wordmark className="text-3xl" />
          <span className="label text-ink-mute">OS</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1fr_28rem] lg:px-8">
        <section className="hidden max-w-xl lg:block" aria-labelledby="setup-context-title">
          <div className="label text-crimson">İlk kurulum</div>
          <h1 id="setup-context-title" className="balanced-wrap mt-4 font-display text-5xl font-semibold leading-[1.05] text-ink">
            İşletmenizi Octo’ya ekleyin.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft">
            Şirket görünümünüzü oluşturmak için temel bilgileri girin. Diğer ayarları daha sonra tamamlayabilirsiniz.
          </p>
        </section>

        <section aria-labelledby="setup-title" className="w-full rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-crimson/10 text-crimson">
            <Building2 size={19} />
          </div>
          <h1 id="setup-title" className="mt-5 font-display text-3xl font-semibold text-ink">Şirketinizi oluşturun</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-mute">Başlamak için şirket adını ve temel para birimini seçin.</p>

          {(formError || loadError) && (
            <div role="alert" className="mt-5 rounded-lg border border-crimson/25 bg-crimson/5 px-4 py-3 text-sm leading-relaxed text-crimson">
              {formError ?? loadError}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-lg border border-line bg-paper px-4 py-5 text-center" role="status">
              <p className="text-sm text-ink-mute">Şirket bilgileriniz kontrol ediliyor…</p>
            </div>
          ) : loadError ? (
            <button
              type="button"
              onClick={() => void refreshCompanies()}
              className="focus-ring mt-5 inline-flex w-full items-center justify-center rounded-lg bg-crimson px-4 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Yeniden dene
            </button>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="company-name" className="mb-1.5 block text-sm font-medium text-ink">Şirket adı</label>
                <input
                  id="company-name"
                  type="text"
                  value={companyName}
                  onChange={event => setCompanyName(event.target.value)}
                  autoComplete="organization"
                  required
                  disabled={submitting}
                  className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink placeholder:text-ink-mute disabled:opacity-60"
                  placeholder="Şirketinizin adı"
                />
              </div>
              <div>
                <label htmlFor="base-currency" className="mb-1.5 block text-sm font-medium text-ink">Temel para birimi</label>
                <select
                  id="base-currency"
                  value={baseCurrency}
                  onChange={event => setBaseCurrency(event.target.value as (typeof currencies)[number])}
                  disabled={submitting}
                  className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60"
                >
                  {currencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                <Building2 size={16} /> {submitting ? 'Şirket oluşturuluyor…' : 'Şirketi oluştur'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
