import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { resolveInitialTheme, THEME_STORAGE_KEY, toggleTheme, type Theme } from './themeState'

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} })

function readStoredTheme(): Theme {
  try {
    return resolveInitialTheme(typeof window !== 'undefined' ? window.localStorage.getItem(THEME_STORAGE_KEY) : null)
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The in-memory theme still works when browser storage is unavailable.
    }
  }, [theme])
  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(toggleTheme) }}>
      {children}
    </ThemeCtx.Provider>
  )
}
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeCtx)
