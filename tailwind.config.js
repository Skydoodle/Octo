export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',
        'ink-mute': 'rgb(var(--ink-mute) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        crimson: 'rgb(var(--crimson) / <alpha-value>)',
        'crimson-soft': 'rgb(var(--crimson-soft) / <alpha-value>)',
        positive: 'rgb(var(--positive) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '14px' },
      boxShadow: { soft: '0 1px 2px rgb(0 0 0/0.04),0 8px 24px -12px rgb(0 0 0/0.10)' },
      keyframes: {
        rise: { '0%': { opacity:'0', transform:'translateY(8px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
      },
      animation: { rise: 'rise 0.5s cubic-bezier(0.16,1,0.3,1) both' },
    },
  },
  plugins: [],
}
