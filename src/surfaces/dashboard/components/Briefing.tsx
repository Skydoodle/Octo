import { useBriefing } from '../../../orchestrator/useBriefing'
import { useFinanceData } from '../../../layers/finance/ui/FinanceDataContext'
import { buildReasoningSignalsWithoutLegacyFinance } from '../../../reasoning/signalAdapters'
import { productionSignalsOnly } from '../../../layers/finance/ui/productionFinanceSignals'

export default function Briefing() {
  const { snapshot } = useFinanceData()
  const { briefing, loading, error, regenerate } = useBriefing(productionSignalsOnly(buildReasoningSignalsWithoutLegacyFinance(),snapshot))

  return (
    <div style={{
      background: '#1A1A1A',
      borderLeft: '3px solid #C34B4B',
      padding: '20px 24px',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#C34B4B',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          Günlük Brifing — {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          {loading && (
            <span style={{ color: 'rgba(195,75,75,0.5)', fontSize: '9px' }}>
              oluşturuluyor...
            </span>
          )}
        </div>
        <button
          onClick={regenerate}
          disabled={loading}
          style={{
            background: 'none',
            border: '1px solid rgba(195,75,75,0.3)',
            color: 'rgba(195,75,75,0.6)',
            padding: '3px 10px',
            fontFamily: 'monospace',
            fontSize: '9px',
            letterSpacing: '0.08em',
            cursor: loading ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#C34B4B'
              e.currentTarget.style.color = '#C34B4B'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(195,75,75,0.3)'
            e.currentTarget.style.color = 'rgba(195,75,75,0.6)'
          }}
        >
          {loading ? '...' : '↺ Yenile'}
        </button>
      </div>
      <div style={{
        fontSize: '14px',
        color: loading ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
        lineHeight: '1.7',
        fontWeight: 300,
        transition: 'color 0.3s',
        fontStyle: loading ? 'italic' : 'normal',
      }}>
        {loading
          ? 'Yapay zeka brifing hazırlıyor...'
          : error
          ? 'Brifing yüklenemedi.'
          : (
            <>
              {briefing.ozet && <div style={{ marginBottom: briefing.kollar.length ? '14px' : 0 }}>{briefing.ozet}</div>}
              {briefing.kollar.map((k, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'baseline' }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: k.aciliyet === 'kritik' ? '#C34B4B' : k.aciliyet === 'dikkat' ? '#C9883A' : 'rgba(255,255,255,0.4)',
                    minWidth: '64px', flexShrink: 0, paddingTop: '2px',
                  }}>
                    {k.kol}
                  </span>
                  <span>{k.metin}</span>
                </div>
              ))}
            </>
          )}
      </div>
    </div>
  )
}
