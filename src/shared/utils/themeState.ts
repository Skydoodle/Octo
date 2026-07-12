export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'octo-theme'

export function resolveInitialTheme(storedTheme: string | null): Theme {
  return storedTheme === 'dark' ? 'dark' : 'light'
}

export function toggleTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light'
}
