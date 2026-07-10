import { type ReactNode } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from './theme'
export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-display italic text-crimson leading-none ${className}`}>Octo</span>
}
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç'}
      className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-crimson/40 hover:text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
export function Label({ children }: { children: ReactNode }) {
  return <span className="label text-ink-mute">{children}</span>
}
export function Card({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`animate-rise rounded-card border border-line bg-surface shadow-soft ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
