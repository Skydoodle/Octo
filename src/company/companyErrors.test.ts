import { describe, expect, it } from 'vitest'
import { companyCreationErrorMessage, companyLoadErrorMessage } from './companyErrors'

describe('company error copy', () => {
  it('maps load connection failures to an actionable message', () => {
    expect(companyLoadErrorMessage({ message: 'Failed to fetch' })).toContain('İnternet bağlantınızı')
  })

  it('maps blank company names without exposing provider details', () => {
    expect(companyCreationErrorMessage({ message: 'Company name cannot be blank' })).toBe('Şirket adı boş bırakılamaz.')
  })
})
