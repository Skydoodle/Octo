import { describe, expect, it, vi } from 'vitest'
import {
  updateProfileName,
  validateForgotPassword,
  validatePasswordUpdate,
  validateSignUp,
} from './accountAccess'

describe('account access validation', () => {
  it('validates sign-up fields', () => {
    expect(validateSignUp({ fullName: '', email: 'bad', password: 'short', passwordConfirmation: 'other' })).toContain('Ad soyad')
    expect(validateSignUp({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'password1', passwordConfirmation: 'password2' })).toContain('eşleşmiyor')
    expect(validateSignUp({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'password1', passwordConfirmation: 'password1' })).toBeNull()
  })

  it('validates forgot-password email', () => {
    expect(validateForgotPassword('not-an-email')).toContain('Geçerli')
    expect(validateForgotPassword('ada@example.com')).toBeNull()
  })

  it('validates password updates', () => {
    expect(validatePasswordUpdate('short', 'short')).toContain('8 karakter')
    expect(validatePasswordUpdate('password1', 'password2')).toContain('eşleşmiyor')
    expect(validatePasswordUpdate('password1', 'password1')).toBeNull()
  })

  it('trims and writes profile name updates', async () => {
    const writer = vi.fn(async () => ({ error: null }))
    await expect(updateProfileName('user-1', '  Ada Lovelace  ', writer)).resolves.toEqual({ error: null })
    expect(writer).toHaveBeenCalledWith('user-1', 'Ada Lovelace')
  })
})
