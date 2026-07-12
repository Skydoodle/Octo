import { describe, expect, it } from 'vitest'
import { ACCOUNT_PATH, protectedRouteDecision } from './routeProtection'

describe('protected account route', () => {
  it('redirects a logged-out account visitor and allows an authenticated one', () => {
    expect(ACCOUNT_PATH).toBe('/account')
    expect(protectedRouteDecision({ loading: false, error: null, hasSession: false })).toBe('redirect')
    expect(protectedRouteDecision({ loading: false, error: null, hasSession: true })).toBe('allow')
  })
})
