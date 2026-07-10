// Stable non-cryptographic identifier for idempotent imports. The complete
// normalized record content is used as input; equal records produce equal IDs.

export function stableRecordId(prefix: string, parts: readonly unknown[]): string {
  const input = parts.map(value => String(value ?? '')).join('\u001f')
  let hash = 2_166_136_261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16_777_619)
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`
}
