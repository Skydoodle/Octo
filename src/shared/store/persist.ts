// Octo — Persistence helper
// localStorage-backed storage with a clean swap path to a backend later.
// When you move to a real API, only this file changes — stores and components stay the same.
// Tracks per-key freshness so insights can report how current their data is.

const PREFIX = 'octo:'
const META_PREFIX = 'octo:meta:'

export function loadOrSeed<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) {
      localStorage.setItem(PREFIX + key, JSON.stringify(seed))
      localStorage.setItem(META_PREFIX + key, new Date().toISOString())
      return seed
    }
    return JSON.parse(raw) as T
  } catch {
    return seed
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    localStorage.setItem(META_PREFIX + key, new Date().toISOString())
  } catch (e) {
    console.error('octo persist error', key, e)
  }
}

// When was this store last written? Returns a human-readable Turkish string.
export function getFreshness(key: string): string {
  try {
    const iso = localStorage.getItem(META_PREFIX + key)
    if (!iso) return 'bilinmiyor'
    const then = new Date(iso).getTime()
    const mins = Math.floor((Date.now() - then) / 60000)
    if (mins < 1) return 'az önce güncellendi'
    if (mins < 60) return `${mins} dk önce güncellendi`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} saat önce güncellendi`
    return `${Math.floor(hours / 24)} gün önce güncellendi`
  } catch {
    return 'bilinmiyor'
  }
}

export function clearKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
    localStorage.removeItem(META_PREFIX + key)
  } catch {
    // ignore
  }
}

export function clearAll(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}
