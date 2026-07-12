import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, LogIn, UserPlus, Users } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { useCompanies } from '../company/companyContext'
import { ThemeToggle, Wordmark } from '../shared/utils/ui'
import { acceptInvitation, activateAcceptedCompany, type InvitationAcceptanceError } from './teamAccess'

const errorCopy: Record<InvitationAcceptanceError, { title: string; message: string }> = {
  invalid: { title: 'Davet bağlantısı geçersiz', message: 'Bağlantı eksik veya geçersiz. Daveti oluşturan kişiden yeni bir bağlantı isteyin.' },
  expired: { title: 'Davet bağlantısının süresi dolmuş', message: 'Bu davet artık kullanılamıyor. Şirket sahibinden yeni bir davet isteyin.' },
  'email-mismatch': { title: 'E-posta adresi eşleşmiyor', message: 'Bu davet farklı bir e-posta adresi için oluşturulmuş. Davet edilen hesapla giriş yapın.' },
  unavailable: { title: 'Davet artık kullanılamıyor', message: 'Bu davet daha önce kabul edilmiş veya iptal edilmiş.' },
  unknown: { title: 'Davet kabul edilemedi', message: 'İşlem tamamlanamadı. Lütfen bağlantıyı yeniden açıp tekrar deneyin.' },
}

export default function InvitePage() {
  const { session, loading: authLoading } = useAuth()
  const { refreshCompanies, setActiveCompanyId } = useCompanies()
  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.search).get('token')?.trim() ?? ''
  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle')
  const [acceptanceError, setAcceptanceError] = useState<InvitationAcceptanceError | null>(null)
  const attemptedToken = useRef<string | null>(null)

  useEffect(() => {
    if (authLoading || !session || !token || attemptedToken.current === token) return
    attemptedToken.current = token
    setStatus('accepting')
    void acceptInvitation(token).then(async result => {
      if (result.error || !result.companyId) {
        setAcceptanceError(result.error ?? 'invalid')
        setStatus('error')
        return
      }

      navigate('/invite', { replace: true, state: { accepted: true } })
      setStatus('success')
      await activateAcceptedCompany(result.companyId, refreshCompanies, setActiveCompanyId)
      navigate('/dashboard', { replace: true })
    }).catch(() => {
      setAcceptanceError('unknown')
      setStatus('error')
    })
  }, [authLoading, navigate, refreshCompanies, session, setActiveCompanyId, token])

  const authState = token ? { from: { pathname: '/invite', search: `?token=${encodeURIComponent(token)}` } } : undefined
  const visibleError = acceptanceError ? errorCopy[acceptanceError] : null
  const acceptedInHistory = Boolean((location.state as { accepted?: boolean } | null)?.accepted)

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Link to="/" className="focus-ring flex items-baseline gap-2 rounded"><Wordmark className="text-3xl" /><span className="label text-ink-mute">OS</span></Link>
        <ThemeToggle />
      </header>
      <div className="grid min-h-[calc(100vh-73px)] place-items-center px-5 py-10">
        <section className="w-full max-w-lg rounded-card border border-line bg-surface p-7 shadow-soft sm:p-8">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-crimson/10 text-crimson"><Users size={20} /></div>
          <h1 className="mt-5 font-display text-3xl font-semibold text-ink">Octo ekip daveti</h1>

          {authLoading ? (
            <p className="mt-5 text-sm text-ink-mute" role="status">Oturumunuz kontrol ediliyor…</p>
          ) : !token && !acceptedInHistory ? (
            <div role="alert" className="mt-5 rounded-lg border border-crimson/25 bg-crimson/5 p-4 text-sm text-crimson"><AlertCircle size={18} className="mb-2" />{errorCopy.invalid.message}</div>
          ) : !session ? (
            <div className="mt-5">
              <p className="text-sm leading-relaxed text-ink-soft">Daveti kabul etmek için davetin gönderildiği e-posta adresine ait hesapla giriş yapın veya yeni hesap oluşturun.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link to="/login" state={authState} className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-medium text-white"><LogIn size={16} /> Giriş yap</Link>
                <Link to="/signup" state={authState} className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 py-3 text-sm font-medium text-ink"><UserPlus size={16} /> Hesap oluştur</Link>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-mute">Giriş veya kayıt sonrasında bu davete otomatik olarak geri döneceksiniz.</p>
            </div>
          ) : status === 'accepting' ? (
            <p className="mt-5 text-sm text-ink-mute" role="status">Davet doğrulanıyor ve ekip erişiminiz hazırlanıyor…</p>
          ) : status === 'success' || acceptedInHistory ? (
            <div role="status" className="mt-5 rounded-lg border border-emerald-600/25 bg-emerald-600/5 p-4 text-sm text-ink-soft"><CheckCircle2 size={18} className="mb-2 text-emerald-600" />Davet kabul edildi. Şirket paneline yönlendiriliyorsunuz…</div>
          ) : visibleError ? (
            <div role="alert" className="mt-5 rounded-lg border border-crimson/25 bg-crimson/5 p-4"><AlertCircle size={18} className="text-crimson" /><h2 className="mt-2 font-display text-xl font-semibold text-ink">{visibleError.title}</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">{visibleError.message}</p><Link to="/account" className="focus-ring mt-4 inline-flex rounded text-sm font-medium text-crimson">Hesap ayarlarına git</Link></div>
          ) : (
            <p className="mt-5 text-sm text-ink-mute" role="status">Davet hazırlanıyor…</p>
          )}
        </section>
      </div>
    </main>
  )
}
