import { useNavigate } from 'react-router-dom'

const alerts = [
  {
    severity: 'critical',
    layer: 'VERGİ',
    message: 'KDV beyannamesi onay bekliyor',
    impact: '₺228,300',
    deadline: '2 gün',
    action: 'Müşavirinize gönderin',
    actionLabel: 'Gönder →',
    path: '/vergi',
  },
  {
    severity: 'critical',
    layer: 'İK',
    message: 'SGK prim ödemesi yaklaşıyor',
    impact: '₺142,800',
    deadline: '4 gün',
    action: 'Ödemeyi planlayın',
    actionLabel: 'Planla →',
    path: '/ik',
  },
  {
    severity: 'warning',
    layer: 'DENETİM',
    message: 'SGK + KDV aynı haftaya denk geliyor — nakit riski',
    impact: '₺371,100',
    deadline: '4 gün',
    action: 'Nakit akışını gözden geçirin',
    actionLabel: 'İncele →',
    path: '/finans',
  },
  {
    severity: 'warning',
    layer: 'HUKUK',
    message: 'Tedarikçi sözleşmesi yenileme tarihi yaklaşıyor',
    impact: '₺540,000/yıl',
    deadline: '18 gün',
    action: 'Sözleşmeyi inceleyin',
    actionLabel: 'Görüntüle →',
    path: '/hukuk',
  },
  {
    severity: 'info',
    layer: 'FİNANS',
    message: 'Müşteri A — 45 günlük gecikmiş fatura',
    impact: '₺84,500',
    deadline: '45 gün gecikmeli',
    action: 'Tahsilat başlatın',
    actionLabel: 'Faturaları gör →',
    path: '/finans',
  },
]

const clr: Record<string, string> = {
  critical: '#E24B4A',
  warning: '#E8A838',
  info: '#4CAF84',
}

const layerBg: Record<string, string> = {
  'VERGİ': 'rgba(226,75,74,0.08)',
  'İK': 'rgba(226,75,74,0.08)',
  'DENETİM': 'rgba(232,168,56,0.08)',
  'HUKUK': 'rgba(232,168,56,0.08)',
  'FİNANS': 'rgba(76,175,132,0.08)',
}

export default function IntelligenceFeed() {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#fff', border: '1px solid #E2DDD4' }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #E2DDD4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Zeka Akışı — Finansal Etkiye Göre
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#C34B4B' }}>
          {alerts.length} aktif
        </div>
      </div>

      {alerts.map((alert, i) => (
        <div
          key={i}
          onClick={() => navigate(alert.path)}
          style={{
            padding: '14px 20px',
            borderBottom: i < alerts.length - 1 ? '1px solid #E2DDD4' : 'none',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            cursor: 'pointer',
            transition: 'background 0.15s',
            position: 'relative',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = layerBg[alert.layer] || '#FAFAF8'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {/* Severity dot */}
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: clr[alert.severity],
            marginTop: '6px',
            flexShrink: 0,
          }} />

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                color: clr[alert.severity],
                letterSpacing: '0.08em',
                background: clr[alert.severity] + '15',
                padding: '2px 6px',
              }}>
                {alert.layer}
              </span>
              <span style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: 400 }}>
                {alert.message}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#8A8680' }}>
              {alert.action}
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: clr[alert.severity], fontWeight: 500 }}>
              {alert.impact}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680' }}>
              {alert.deadline}
            </div>
            <button
              onClick={e => {
                e.stopPropagation()
                navigate(alert.path)
              }}
              style={{
                padding: '3px 10px',
                background: 'none',
                border: `1px solid ${clr[alert.severity]}40`,
                color: clr[alert.severity],
                fontFamily: 'monospace',
                fontSize: '10px',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = clr[alert.severity]
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = clr[alert.severity]
              }}
            >
              {alert.actionLabel}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}