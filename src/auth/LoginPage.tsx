import { useState, type FormEvent } from 'react'
import { ArrowLeft, LockKeyhole, LogIn } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle, Wordmark } from '../shared/utils/ui'
import { useAuth } from './authContext'
import { authErrorMessage } from './authErrors'
import { authDestinationFromState } from './authDestination'

export default function LoginPage() {
  const { session, loading: sessionLoading, error: sessionError, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (sessionLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-6" role="status">
        <div className="text-center">
          <Wordmark className="text-4xl" />
          <p className="mt-4 text-sm text-ink-mute">Oturumunuz kontrol ediliyor…</p>
        </div>
      </main>
    )
  }
  if (session) return <Navigate to={authDestinationFromState(location.state)} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const result = await signIn(email.trim(), password)
      if (result.error || !result.session) {
        setFormError(authErrorMessage(result.error))
        return
      }
      navigate(authDestinationFromState(location.state), { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Link to="/" className="focus-ring flex items-baseline gap-2 rounded">
          <Wordmark className="text-3xl" />
          <span className="label text-ink-mute">OS</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1fr_28rem] lg:px-8">
        <section className="hidden max-w-xl lg:block" aria-labelledby="login-context-title">
          <div className="label text-crimson">İşletmeniz için tek görünüm</div>
          <h1 id="login-context-title" className="balanced-wrap mt-4 font-display text-5xl font-semibold leading-[1.05] text-ink">
            Bugünün kararlarına, kanıtlarıyla birlikte ulaşın.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft">
            Finans, vergi, bordro ve operasyon kayıtlarınızı aynı işletme görünümünde takip edin.
          </p>
        </section>

        <section aria-labelledby="login-title" className="w-full rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-crimson/10 text-crimson">
            <LockKeyhole size={19} />
          </div>
          <h1 id="login-title" className="mt-5 font-display text-3xl font-semibold text-ink">Octo’ya giriş</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-mute">Hesabınıza erişmek için e-posta adresinizi ve şifrenizi girin.</p>

          {(formError || sessionError) && (
            <div role="alert" className="mt-5 rounded-lg border border-crimson/25 bg-crimson/5 px-4 py-3 text-sm leading-relaxed text-crimson">
              {formError ?? sessionError}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink">E-posta</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
                className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink placeholder:text-ink-mute disabled:opacity-60"
                placeholder="siz@sirketiniz.com"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="block text-sm font-medium text-ink">Şifre</label>
                <Link to="/forgot-password" className="focus-ring rounded text-xs font-medium text-crimson">Şifremi unuttum</Link>
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
                className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink placeholder:text-ink-mute disabled:opacity-60"
                placeholder="Şifreniz"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              <LogIn size={16} /> {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-mute">
            Octo’da yeni misiniz? <Link to="/signup" className="focus-ring rounded font-medium text-crimson">Hesap oluşturun</Link>
          </p>

          <Link to="/" className="focus-ring mt-5 inline-flex items-center gap-1.5 rounded text-sm text-ink-mute hover:text-ink">
            <ArrowLeft size={14} /> Ana sayfaya dön
          </Link>
        </section>
      </div>
    </main>
  )
}
