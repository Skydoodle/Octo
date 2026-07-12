import { useState, type FormEvent } from 'react'
import { CheckCircle2, UserPlus } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './authContext'
import AuthAccessLayout from './AuthAccessLayout'
import { accountAccessErrorMessage, validateSignUp } from './accountAccess'

export default function SignUpPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  if (loading) {
    return (
      <AuthAccessLayout icon={UserPlus} eyebrow="Yeni hesap" title="Octo hesabınızı oluşturun" description="Adınız, e-posta adresiniz ve güvenli bir şifreyle başlayın.">
        <p className="mt-6 text-sm text-ink-mute" role="status">Oturumunuz kontrol ediliyor…</p>
      </AuthAccessLayout>
    )
  }
  if (session) return <Navigate to="/dashboard" replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateSignUp({ fullName, email, password, passwordConfirmation })
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (signUpError) {
        setError(accountAccessErrorMessage(signUpError))
        return
      }
      if (data.session) {
        navigate('/dashboard', { replace: true })
        return
      }
      setConfirmationSent(true)
    } catch (error) {
      setError(accountAccessErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthAccessLayout icon={UserPlus} eyebrow="Yeni hesap" title="Octo hesabınızı oluşturun" description="Adınız, e-posta adresiniz ve güvenli bir şifreyle başlayın.">
      {confirmationSent ? (
        <div className="mt-6 rounded-lg border border-emerald-600/25 bg-emerald-600/5 p-4 text-sm leading-relaxed text-ink-soft" role="status">
          <CheckCircle2 size={20} className="mb-2 text-emerald-600" />
          Doğrulama bağlantısını <strong className="text-ink">{email.trim()}</strong> adresine gönderdik. Hesabınızı etkinleştirmek için e-postanızı kontrol edin.
          <Link to="/login" className="focus-ring mt-4 block w-fit rounded font-medium text-crimson">Giriş sayfasına dön</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <div role="alert" className="rounded-lg border border-crimson/25 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</div>}
          <div>
            <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-ink">Ad soyad</label>
            <input id="signup-name" value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" disabled={submitting} required className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-ink">E-posta</label>
            <input id="signup-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" disabled={submitting} required className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-ink">Şifre</label>
            <input id="signup-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" disabled={submitting} required minLength={8} className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
          </div>
          <div>
            <label htmlFor="signup-password-confirmation" className="mb-1.5 block text-sm font-medium text-ink">Şifreyi doğrulayın</label>
            <input id="signup-password-confirmation" type="password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} autoComplete="new-password" disabled={submitting} required minLength={8} className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
          </div>
          <button type="submit" disabled={submitting} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
            <UserPlus size={16} /> {submitting ? 'Hesap oluşturuluyor…' : 'Hesap oluştur'}
          </button>
          <p className="text-center text-sm text-ink-mute">Zaten hesabınız var mı? <Link to="/login" className="focus-ring rounded font-medium text-crimson">Giriş yapın</Link></p>
        </form>
      )}
    </AuthAccessLayout>
  )
}
