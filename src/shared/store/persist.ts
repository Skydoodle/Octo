// Octo — Persistence helper
// localStorage-backed storage with a clean swap path to a backend later.
// When you move to a real API, only this file changes — stores and components stay the same.

const PREFIX = 'octo:'

export function loadOrSeed<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) {
      localStorage.setItem(PREFIX + key, JSON.stringify(seed))
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
  } catch (e) {
    console.error('octo persist error', key, e)
  }
}

export function clearKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
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
