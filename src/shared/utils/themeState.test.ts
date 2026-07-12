import { describe, expect, it } from 'vitest'
import { resolveInitialTheme, toggleTheme } from './themeState'

describe('theme state', () => {
  it('defaults to light when no saved preference exists', () => {
    expect(resolveInitialTheme(null)).toBe('light')
    expect(resolveInitialTheme('unsupported')).toBe('light')
  })

  it('respects a saved dark preference', () => {
    expect(resolveInitialTheme('dark')).toBe('dark')
  })

  it('toggles between light and dark', () => {
    expect(toggleTheme('light')).toBe('dark')
    expect(toggleTheme('dark')).toBe('light')
  })
})
