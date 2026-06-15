// Octo — Shared EmptyState
// One consistent "no data yet" placeholder used across every surface.
// When the store is empty, surfaces render this instead of fabricated numbers.
// Honest by default: no data in -> nothing claimed.

import type { ReactNode } from 'react'

interface Props {
  title?: string
  hint?: string
  icon?: ReactNode
  compact?: boolean
}

export default function EmptyState({
  title = 'Yeterli veri yok',
  hint = 'Veri girildiğinde burası otomatik dolacak.',
  icon,
  compact = false,
}: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        padding: compact ? '20px 16px' : '40px 24px',
        color: 'rgb(var(--ink-mute))',
      }}
    >
      <div
        style={{
          width: compact ? '28px' : '36px',
          height: compact ? '28px' : '36px',
          borderRadius: '50%',
          border: '1px dashed rgb(var(--line))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          fontSize: compact ? '13px' : '15px',
          opacity: 0.7,
        }}
      >
        {icon ?? '—'}
      </div>
      <div
        style={{
          fontSize: compact ? '12px' : '13px',
          fontWeight: 500,
          color: 'rgb(var(--ink-soft))',
          marginBottom: '4px',
        }}
      >
        {title}
      </div>
      {hint && (
        <div style={{ fontSize: '11px', maxWidth: '220px', lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  )
}
