import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Clipboard, MailPlus, RefreshCw, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCompanies } from '../company/companyContext'
import { ThemeToggle, Wordmark } from '../shared/utils/ui'
import {
  createInvitationLink,
  revokePendingInvitation,
  teamErrorMessage,
  validateInvitation,
  type InvitationRole,
} from './teamAccess'

interface TeamMember {
  membership_id: string
  user_id: string
  display_name: string | null
  email: string | null
  role: 'owner' | 'employee' | 'accountant'
  status: 'active' | 'invited' | 'disabled'
  joined_at: string
}

interface PendingInvitation {
  id: string
  email: string
  role: InvitationRole
  status: 'pending'
  created_at: string
  expires_at: string
}

const roleLabels = { owner: 'Şirket sahibi', employee: 'Çalışan', accountant: 'Muhasebeci' }
const statusLabels = { active: 'Aktif', invited: 'Davetli', disabled: 'Devre dışı', pending: 'Bekliyor' }
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' })

export default function TeamSettingsPage() {
  const { activeCompany } = useCompanies()
  const activeCompanyId = activeCompany?.id ?? ''
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InvitationRole>('employee')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadTeam = useCallback(async () => {
    if (!activeCompanyId) return
    setLoading(true)
    setLoadError(null)
    const [rosterResult, invitationsResult] = await Promise.all([
      supabase.rpc('get_company_team', { target_company_id: activeCompanyId }),
      supabase
        .from('company_invitations')
        .select('id, email, role, status, created_at, expires_at')
        .eq('company_id', activeCompanyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])
    const error = rosterResult.error ?? invitationsResult.error
    if (error) {
      setLoadError(teamErrorMessage(error))
      setLoading(false)
      return
    }
    setMembers((rosterResult.data ?? []) as TeamMember[])
    setInvitations((invitationsResult.data ?? []) as PendingInvitation[])
    setLoading(false)
  }, [activeCompanyId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTeam() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadTeam])

  const createInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateInvitation(email, role)
    if (validationError) {
      setFormError(validationError)
      return
    }
    setCreating(true)
    setFormError(null)
    setInvitationLink(null)
    setCopied(false)
    try {
      const { data, error: invitationError } = await supabase.rpc('create_company_invitation', {
        target_company_id: activeCompanyId,
        invited_email: email.trim(),
        invited_role: role,
      })
      if (invitationError || typeof data !== 'string') {
        setFormError(teamErrorMessage(invitationError))
        return
      }
      setInvitationLink(createInvitationLink(window.location.origin, data))
      setEmail('')
      await loadTeam()
    } catch (error) {
      setFormError(teamErrorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  const copyInvitation = async () => {
    if (!invitationLink) return
    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopied(true)
    } catch {
      setFormError('Davet bağlantısı kopyalanamadı. Bağlantıyı elle seçip kopyalayın.')
    }
  }

  const revokeInvitation = async (invitationId: string) => {
    setRevokingId(invitationId)
    setLoadError(null)
    try {
      const error = await revokePendingInvitation(invitationId)
      if (error) {
        setLoadError(teamErrorMessage(error))
        return
      }
      await loadTeam()
    } catch (error) {
      setLoadError(teamErrorMessage(error))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Link to="/dashboard" className="focus-ring flex items-baseline gap-2 rounded"><Wordmark className="text-3xl" /><span className="label text-ink-mute">OS</span></Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/dashboard" className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-ink-mute hover:text-ink"><ArrowLeft size={14} /> Panele dön</Link>
            <div className="label mt-6 text-crimson">{activeCompany?.name} · Ayarlar</div>
            <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Ekip</h1>
            <p className="mt-2 text-sm text-ink-mute">Ekip üyelerini görüntüleyin ve güvenli davet bağlantıları oluşturun.</p>
          </div>
          <Link to="/account" className="focus-ring rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-2">Hesap Ayarları</Link>
        </div>

        <section className="mt-8 rounded-card border border-line bg-surface p-6 shadow-soft" aria-labelledby="invite-title">
          <div className="flex items-center gap-3"><MailPlus size={20} className="text-crimson" /><h2 id="invite-title" className="font-display text-2xl font-semibold text-ink">Ekip üyesi davet edin</h2></div>
          <p className="mt-2 text-sm text-ink-mute">Henüz e-posta gönderilmiyor. Oluşan bağlantıyı davet edeceğiniz kişiyle güvenli biçimde paylaşın.</p>
          {formError && <div role="alert" className="mt-4 rounded-lg border border-crimson/25 bg-crimson/5 px-4 py-3 text-sm text-crimson">{formError}</div>}
          <form onSubmit={createInvitation} className="mt-5 grid gap-4 md:grid-cols-[1fr_13rem_auto] md:items-end">
            <div>
              <label htmlFor="invitation-email" className="mb-1.5 block text-sm font-medium text-ink">E-posta</label>
              <input id="invitation-email" type="email" value={email} onChange={event => setEmail(event.target.value)} disabled={creating} required className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60" placeholder="uye@sirket.com" />
            </div>
            <div>
              <label htmlFor="invitation-role" className="mb-1.5 block text-sm font-medium text-ink">Rol</label>
              <select id="invitation-role" value={role} onChange={event => setRole(event.target.value as InvitationRole)} disabled={creating} className="focus-ring w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink disabled:opacity-60">
                <option value="employee">Çalışan</option><option value="accountant">Muhasebeci</option>
              </select>
            </div>
            <button type="submit" disabled={creating} className="focus-ring inline-flex h-[46px] items-center justify-center gap-2 rounded-lg bg-crimson px-5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"><MailPlus size={16} /> {creating ? 'Oluşturuluyor…' : 'Davet oluştur'}</button>
          </form>
          {invitationLink && (
            <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4" role="status">
              <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-sm font-medium text-ink">Bu bağlantı yalnızca şimdi gösterilir.</p><p className="mt-1 text-xs leading-relaxed text-ink-mute">Sayfadan ayrıldıktan veya yeniledikten sonra bağlantı yeniden alınamaz. Bekleyen davet satırından eski bağlantı kopyalanamaz.</p></div></div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label="Davet bağlantısı" readOnly value={invitationLink} className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2.5 text-xs text-ink" /><button type="button" onClick={() => void copyInvitation()} className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink">{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? 'Kopyalandı' : 'Davet bağlantısını kopyala'}</button></div>
            </div>
          )}
        </section>

        {loadError && <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-crimson/25 bg-crimson/5 px-4 py-3 text-sm text-crimson"><span>{loadError}</span><button type="button" onClick={() => void loadTeam()} className="focus-ring inline-flex items-center gap-1.5 rounded font-medium"><RefreshCw size={14} /> Yeniden dene</button></div>}
        {loading ? (
          <div className="mt-6 rounded-card border border-line bg-surface p-8 text-center text-sm text-ink-mute" role="status">Ekip bilgileri yükleniyor…</div>
        ) : !loadError && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <section className="rounded-card border border-line bg-surface p-6 shadow-soft" aria-labelledby="roster-title">
              <div className="flex items-center gap-3"><Users size={20} className="text-crimson" /><h2 id="roster-title" className="font-display text-2xl font-semibold text-ink">Ekip üyeleri</h2></div>
              {members.length === 0 ? <p className="mt-6 text-sm text-ink-mute">Henüz ekip üyesi bulunmuyor.</p> : <div className="mt-5 divide-y divide-line">{members.map(member => <article key={member.membership_id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-crimson/10 text-crimson"><UserRound size={16} /></div><div className="min-w-0"><h3 className="truncate text-sm font-medium text-ink">{member.display_name?.trim() || member.email || 'Adsız kullanıcı'}</h3><p className="truncate text-xs text-ink-mute">{member.email ?? 'E-posta yok'}</p></div></div><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-soft">{roleLabels[member.role]}</span><span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-emerald-700">{statusLabels[member.status]}</span><span className="text-ink-mute">{dateFormatter.format(new Date(member.joined_at))}</span></div></article>)}</div>}
            </section>
            <section className="rounded-card border border-line bg-surface p-6 shadow-soft" aria-labelledby="pending-title">
              <h2 id="pending-title" className="font-display text-2xl font-semibold text-ink">Bekleyen davetler</h2>
              {invitations.length === 0 ? <p className="mt-6 text-sm text-ink-mute">Bekleyen davet bulunmuyor.</p> : <div className="mt-5 divide-y divide-line">{invitations.map(invitation => <article key={invitation.id} className="py-4 first:pt-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-medium text-ink">{invitation.email}</h3><p className="mt-1 text-xs text-ink-mute">{roleLabels[invitation.role]} · {statusLabels[invitation.status]}</p><p className="mt-2 text-xs text-ink-mute">Oluşturuldu: {dateFormatter.format(new Date(invitation.created_at))}<br />Son geçerlilik: {dateFormatter.format(new Date(invitation.expires_at))}</p></div><button type="button" onClick={() => void revokeInvitation(invitation.id)} disabled={revokingId === invitation.id} className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-crimson/25 px-3 py-2 text-xs font-medium text-crimson hover:bg-crimson/5 disabled:cursor-wait disabled:opacity-60"><X size={13} /> {revokingId === invitation.id ? 'İptal ediliyor…' : 'Davet iptal'}</button></div></article>)}</div>}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
