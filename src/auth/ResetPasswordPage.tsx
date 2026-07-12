import { useState, type FormEvent } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthAccessLayout from './AuthAccessLayout'
import { useAuth } from './authContext'
import { accountAccessErrorMessage, validatePasswordUpdate } from './accountAccess'

export default function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updated, setUpdated] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validatePasswordUpdate(password, confirmation)
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(accountAccessErrorMessage(updateError))
        return
      }
      setUpdated(true)
      setPassword('')
      setConfirmation('')
    } catch (error) {
      setError(accountAccessErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthAccessLayout icon={KeyRound} eyebrow="Yeni şifre" title="Yeni şifrenizi belirleyin" description="Hesabınız için en az 8 karakterli yeni bir şifre seçin.">
      {loading ? (
        <p className="mt-6 text-sm text-ink-mute" role="status">Sıfırlama bağlantısı doğrulanıyor…</p>
      ) : !session ? (
        <div role="alert" className="mt-6 rounded-lg border border-crimson/25 bg-crimson/5 p-4 text-sm leading-relaxed text-crimson">
          Bu sıfırlama bağlantısı geçersiz veya süresi dolmuş. <Link to="/forgot-password" className="focus-ring mt-3 block w-fit rounded font-medium underline">Yeni bağlantı isteyin</Link>
        </div>
      ) : updated ? (
        <div role="status" className="mt-6 rounded-lg border border-emerald-600/25 bg-emerald-600/5 p-4 text-sm leading-relaxed text-ink-soft">
          <CheckCircle2 size={20} className="mb-2 text-emerald-600" />
          Şifreniz güncellendi. <Link to="/dashboard" className="focus-ring mt-3 block w-fit rounded font-medium text-crimson">Octo’ya devam edin</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <div role="alert" className="rounded-lg border border-crimson/25 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</div>}
          <div>
            <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium text-ink">Yeni şifre</label>
            <input id="reset-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" disabled={submitting} required minLength={8} className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
          </div>
          <div>
            <label htmlFor="reset-password-confirmation" className="mb-1.5 block text-sm font-medium text-ink">Yeni şifreyi doğrulayın</label>
            <input id="reset-password-confirmation" type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" disabled={submitting} required minLength={8} className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
          </div>
          <button type="submit" disabled={submitting} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
            <KeyRound size={16} /> {submitting ? 'Şifre güncelleniyor…' : 'Şifreyi güncelle'}
          </button>
        </form>
      )}
    </AuthAccessLayout>
  )
}
