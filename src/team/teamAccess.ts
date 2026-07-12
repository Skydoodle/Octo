import { supabase } from '../lib/supabase'
import type { Company } from '../company/companyContext'

export type InvitationRole = 'employee' | 'accountant'
export type InvitationAcceptanceError = 'invalid' | 'expired' | 'email-mismatch' | 'unavailable' | 'unknown'

export function canManageTeam(company: Company | null): boolean {
  return company?.role === 'owner' && company.membership_status === 'active'
}

export function validateInvitation(email: string, role: string): string | null {
  const normalizedEmail = email.trim().toLocaleLowerCase('en-US')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return 'Geçerli bir e-posta adresi girin.'
  if (role !== 'employee' && role !== 'accountant') return 'Geçerli bir ekip rolü seçin.'
  return null
}

export function createInvitationLink(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/invite?token=${encodeURIComponent(token)}`
}

function errorMessage(error: unknown): string {
  return typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
    ? error.message.toLocaleLowerCase('en-US')
    : ''
}

export function invitationAcceptanceError(error: unknown): InvitationAcceptanceError {
  const message = errorMessage(error)
  if (message.includes('expired')) return 'expired'
  if (message.includes('email does not match')) return 'email-mismatch'
  if (message.includes('no longer pending')) return 'unavailable'
  if (message.includes('invalid') || message.includes('valid invitation token')) return 'invalid'
  return 'unknown'
}

export function teamErrorMessage(error: unknown): string {
  const message = errorMessage(error)
  if (message.includes('active company owner')) return 'Bu alanı yalnızca aktif şirket sahibi görüntüleyebilir.'
  if (message.includes('pending invitation already exists')) return 'Bu e-posta adresi için zaten bekleyen bir davet var.'
  if (message.includes('failed to fetch') || message.includes('network')) return 'Ekip hizmetine bağlanılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.'
  return 'Ekip bilgileri işlenemedi. Lütfen yeniden deneyin.'
}

type RpcCaller = (functionName: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown | null }>

const callRpc: RpcCaller = (functionName, args) => supabase.rpc(functionName, args)

export async function acceptInvitation(
  token: string,
  rpc: RpcCaller = callRpc,
): Promise<{ companyId: string | null; error: InvitationAcceptanceError | null }> {
  const result = await rpc('accept_company_invitation', { invitation_token: token })
  if (result.error) return { companyId: null, error: invitationAcceptanceError(result.error) }
  return { companyId: typeof result.data === 'string' ? result.data : null, error: null }
}

export async function activateAcceptedCompany(
  companyId: string,
  refreshCompanies: () => Promise<boolean>,
  setActiveCompanyId: (companyId: string) => void,
): Promise<void> {
  await refreshCompanies()
  setActiveCompanyId(companyId)
}

export async function revokePendingInvitation(
  invitationId: string,
  rpc: RpcCaller = callRpc,
): Promise<unknown | null> {
  const result = await rpc('revoke_company_invitation', { invitation_id: invitationId })
  return result.error
}
