import { describe, expect, it, vi } from 'vitest'
import { authDestinationFromState } from '../auth/authDestination'
import {
  acceptInvitation,
  activateAcceptedCompany,
  canManageTeam,
  createInvitationLink,
  invitationAcceptanceError,
  revokePendingInvitation,
  validateInvitation,
} from './teamAccess'

describe('Team Access V1', () => {
  it('allows the Team route only for an active owner', () => {
    expect(canManageTeam({ id: '1', name: 'Octo', base_currency: 'TRY', role: 'owner', membership_status: 'active' })).toBe(true)
    expect(canManageTeam({ id: '1', name: 'Octo', base_currency: 'TRY', role: 'employee', membership_status: 'active' })).toBe(false)
  })

  it('validates invitation form values', () => {
    expect(validateInvitation('bad-email', 'employee')).toContain('Geçerli')
    expect(validateInvitation('owner@example.com', 'owner')).toContain('rolü')
    expect(validateInvitation('member@example.com', 'accountant')).toBeNull()
  })

  it('creates an encoded invitation link', () => {
    expect(createInvitationLink('https://octo.example/', 'raw token')).toBe('https://octo.example/invite?token=raw%20token')
  })

  it('preserves the invitation destination through authentication', () => {
    expect(authDestinationFromState({ from: { pathname: '/invite', search: '?token=secret' } })).toBe('/invite?token=secret')
  })

  it('accepts an invitation and returns the company id', async () => {
    const rpc = vi.fn(async () => ({ data: 'company-1', error: null }))
    await expect(acceptInvitation('secret', rpc)).resolves.toEqual({ companyId: 'company-1', error: null })
    expect(rpc).toHaveBeenCalledWith('accept_company_invitation', { invitation_token: 'secret' })

    const refreshCompanies = vi.fn(async () => true)
    const setActiveCompanyId = vi.fn()
    await activateAcceptedCompany('company-1', refreshCompanies, setActiveCompanyId)
    expect(refreshCompanies).toHaveBeenCalledOnce()
    expect(setActiveCompanyId).toHaveBeenCalledWith('company-1')
  })

  it('maps invitation acceptance error states', () => {
    expect(invitationAcceptanceError({ message: 'Invitation is invalid' })).toBe('invalid')
    expect(invitationAcceptanceError({ message: 'Invitation has expired' })).toBe('expired')
    expect(invitationAcceptanceError({ message: 'Authenticated email does not match the invitation' })).toBe('email-mismatch')
    expect(invitationAcceptanceError({ message: 'Invitation is no longer pending' })).toBe('unavailable')
  })

  it('revokes pending invitations through the secure RPC', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }))
    await expect(revokePendingInvitation('invitation-1', rpc)).resolves.toBeNull()
    expect(rpc).toHaveBeenCalledWith('revoke_company_invitation', { invitation_id: 'invitation-1' })
  })

  it('does not persist raw invitation tokens in browser storage', () => {
    const localStorage = { setItem: vi.fn() }
    const sessionStorage = { setItem: vi.fn() }
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('sessionStorage', sessionStorage)
    createInvitationLink('https://octo.example', 'raw-token')
    expect(localStorage.setItem).not.toHaveBeenCalled()
    expect(sessionStorage.setItem).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
