import { useState, useRef } from 'react'

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
}

export default function Tooltip({ children, content }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          left: '0',
          zIndex: 999,
          background: '#1A1A1A',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '2px solid #C34B4B',
          padding: '16px',
          minWidth: '240px',
          maxWidth: '280px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          animation: 'tooltipIn 0.15s cubic-bezier(.16,1,.3,1)',
        }}>
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '20px',
            width: '10px',
            height: '10px',
            background: '#C34B4B',
            transform: 'rotate(45deg)',
          }}/>
          {content}
        </div>
      )}

      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}