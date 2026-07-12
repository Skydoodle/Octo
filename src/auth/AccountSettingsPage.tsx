import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, KeyRound, LogOut, Save, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ThemeToggle, Wordmark } from '../shared/utils/ui'
import { useAuth } from './authContext'
import { accountAccessErrorMessage, updateProfileName, validateDisplayName, validatePasswordUpdate } from './accountAccess'
import { signOutErrorMessage } from './authErrors'
import { useCompanies } from '../company/companyContext'
import { canManageTeam } from '../team/teamAccess'

export default function AccountSettingsPage() {
  const { user, signOut } = useAuth()
  const { activeCompany } = useCompanies()
  const [displayName, setDisplayName] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!user) return () => { active = false }

    void supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setProfileError(accountAccessErrorMessage(error))
        } else {
          setDisplayName(data?.display_name ?? String(user.user_metadata.full_name ?? ''))
        }
        setProfileLoading(false)
      })

    return () => { active = false }
  }, [user])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    const validationError = validateDisplayName(displayName)
    if (validationError) {
      setProfileError(validationError)
      return
    }
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      const { error } = await updateProfileName(user.id, displayName)
      if (error) {
        setProfileError(accountAccessErrorMessage(error))
        return
      }
      setDisplayName(displayName.trim())
      setProfileSuccess('Görünen adınız güncellendi.')
    } catch (error) {
      setProfileError(accountAccessErrorMessage(error))
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validatePasswordUpdate(password, passwordConfirmation)
    if (validationError) {
      setPasswordError(validationError)
      return
    }
    setPasswordSaving(true)
    setPasswordError(null)
    setPasswordSuccess(null)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setPasswordError(accountAccessErrorMessage(error))
        return
      }
      setPassword('')
      setPasswordConfirmation('')
      setPasswordSuccess('Şifreniz güncellendi.')
    } catch (error) {
      setPasswordError(accountAccessErrorMessage(error))
    } finally {
      setPasswordSaving(false)
    }
  }

  const logout = async () => {
    setLoggingOut(true)
    setLogoutError(null)
    try {
      const error = await signOut()
      if (error) setLogoutError(signOutErrorMessage(error))
    } catch (error) {
      setLogoutError(signOutErrorMessage(error))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Link to="/dashboard" className="focus-ring flex items-baseline gap-2 rounded">
          <Wordmark className="text-3xl" />
          <span className="label text-ink-mute">OS</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/dashboard" className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-ink-mute hover:text-ink">
            <ArrowLeft size={14} /> Panele dön
          </Link>
          {canManageTeam(activeCompany) && <Link to="/settings/team" className="focus-ring rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">Ekip Ayarları</Link>}
        </div>
        <div className="mt-6">
          <div className="label text-crimson">Hesap</div>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Hesap ayarları</h1>
          <p className="mt-2 text-sm text-ink-mute">Kişisel bilgilerinizi ve hesap güvenliğinizi yönetin.</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-card border border-line bg-surface p-6 shadow-soft" aria-labelledby="profile-title">
            <UserRound size={20} className="text-crimson" />
            <h2 id="profile-title" className="mt-3 font-display text-2xl font-semibold text-ink">Profil</h2>
            <p className="mt-1 text-sm text-ink-mute">Hesabınızda görünen adı güncelleyin.</p>
            {profileLoading ? (
              <p role="status" className="mt-6 text-sm text-ink-mute">Profil yükleniyor…</p>
            ) : (
              <form onSubmit={saveProfile} className="mt-6 space-y-4">
                {(profileError || profileSuccess) && (
                  <div role={profileError ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${profileError ? 'border-crimson/25 bg-crimson/5 text-crimson' : 'border-emerald-600/25 bg-emerald-600/5 text-ink-soft'}`}>
                    {!profileError && <CheckCircle2 size={16} className="mr-2 inline text-emerald-600" />}{profileError ?? profileSuccess}
                  </div>
                )}
                <div>
                  <label htmlFor="account-email" className="mb-1.5 block text-sm font-medium text-ink">E-posta</label>
                  <input id="account-email" type="email" value={user?.email ?? ''} readOnly className="w-full rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink-mute" />
                </div>
                <div>
                  <label htmlFor="account-display-name" className="mb-1.5 block text-sm font-medium text-ink">Görünen ad</label>
                  <input id="account-display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" disabled={profileSaving} required className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
                </div>
                <button type="submit" disabled={profileSaving} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-crimson px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
                  <Save size={15} /> {profileSaving ? 'Kaydediliyor…' : 'Adı kaydet'}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-card border border-line bg-surface p-6 shadow-soft" aria-labelledby="password-title">
            <KeyRound size={20} className="text-crimson" />
            <h2 id="password-title" className="mt-3 font-display text-2xl font-semibold text-ink">Şifre</h2>
            <p className="mt-1 text-sm text-ink-mute">Hesabınız için yeni bir şifre belirleyin.</p>
            <form onSubmit={savePassword} className="mt-6 space-y-4">
              {(passwordError || passwordSuccess) && (
                <div role={passwordError ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${passwordError ? 'border-crimson/25 bg-crimson/5 text-crimson' : 'border-emerald-600/25 bg-emerald-600/5 text-ink-soft'}`}>
                  {!passwordError && <CheckCircle2 size={16} className="mr-2 inline text-emerald-600" />}{passwordError ?? passwordSuccess}
                </div>
              )}
              <div>
                <label htmlFor="account-password" className="mb-1.5 block text-sm font-medium text-ink">Yeni şifre</label>
                <input id="account-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" disabled={passwordSaving} required minLength={8} className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
              </div>
              <div>
                <label htmlFor="account-password-confirmation" className="mb-1.5 block text-sm font-medium text-ink">Yeni şifreyi doğrulayın</label>
                <input id="account-password-confirmation" type="password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} autoComplete="new-password" disabled={passwordSaving} required minLength={8} className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" />
              </div>
              <button type="submit" disabled={passwordSaving} className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-2 disabled:cursor-wait disabled:opacity-60">
                <KeyRound size={15} /> {passwordSaving ? 'Güncelleniyor…' : 'Şifreyi güncelle'}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 flex flex-col items-start justify-between gap-4 rounded-card border border-line bg-surface p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Oturumu kapat</h2>
            <p className="mt-1 text-sm text-ink-mute">Bu cihazdaki Octo oturumunuzu sonlandırın.</p>
            {logoutError && <p role="alert" className="mt-2 text-sm text-crimson">{logoutError}</p>}
          </div>
          <button type="button" onClick={() => void logout()} disabled={loggingOut} className="focus-ring inline-flex items-center gap-2 rounded-lg border border-crimson/25 px-4 py-2.5 text-sm font-medium text-crimson hover:bg-crimson/5 disabled:cursor-wait disabled:opacity-60">
            <LogOut size={15} /> {loggingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap'}
          </button>
        </section>
      </div>
    </main>
  )
}
