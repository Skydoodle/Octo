import { describe, expect, it } from 'vitest'
import { authErrorMessage, signOutErrorMessage } from './authErrors'

describe('authentication error copy', () => {
  it('maps invalid credentials without exposing provider details', () => {
    expect(authErrorMessage(new Error('Invalid login credentials'))).toBe('E-posta veya şifre hatalı.')
  })

  it('maps connection failures to an actionable login message', () => {
    expect(authErrorMessage(new Error('Failed to fetch'))).toContain('İnternet bağlantınızı')
  })

  it('uses logout-specific copy for sign-out failures', () => {
    expect(signOutErrorMessage(new Error('Unknown provider failure'))).toBe('Çıkış işlemi tamamlanamadı. Lütfen yeniden deneyin.')
  })
})
