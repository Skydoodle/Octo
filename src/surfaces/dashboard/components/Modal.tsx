import { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: string
}

export default function Modal({ title, onClose, children, width = '560px' }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#F7F4EE',
          width, maxWidth: '95vw',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2DDD4',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#F7F4EE', zIndex: 1,
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#C34B4B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#8A8680', lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}