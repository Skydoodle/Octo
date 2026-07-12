import { useState, type FormEvent } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthAccessLayout from './AuthAccessLayout'
import { accountAccessErrorMessage, validateForgotPassword } from './accountAccess'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateForgotPassword(email)
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) {
        setError(accountAccessErrorMessage(resetError))
        return
      }
      setSent(true)
    } catch (error) {
      setError(accountAccessErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthAccessLayout icon={KeyRound} eyebrow="Hesap kurtarma" title="Şifrenizi sıfırlayın" description="Sıfırlama bağlantısı gönderebilmemiz için hesap e-postanızı girin.">
      {sent ? (
        <div role="status" className="mt-6 rounded-lg border border-emerald-600/25 bg-emerald-600/5 p-4 text-sm leading-relaxed text-ink-soft">
          <CheckCircle2 size={20} className="mb-2 text-emerald-600" />
          Hesap varsa şifre sıfırlama bağlantısını <strong className="text-ink">{email.trim()}</strong> adresine gönderdik.
          <Link to="/login" className="focus-ring mt-4 block w-fit rounded font-medium text-crimson">Giriş sayfasına dön</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <div role="alert" className="rounded-lg border border-crimson/25 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</div>}
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-ink">E-posta</label>
            <input id="forgot-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" disabled={submitting} required className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
          </div>
          <button type="submit" disabled={submitting} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
            <KeyRound size={16} /> {submitting ? 'Bağlantı gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
          </button>
          <Link to="/login" className="focus-ring block rounded text-center text-sm font-medium text-crimson">Giriş sayfasına dön</Link>
        </form>
      )}
    </AuthAccessLayout>
  )
}
