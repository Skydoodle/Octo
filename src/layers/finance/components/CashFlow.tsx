import { mockAccounts, mockTransactions } from '../mockData'
import { calculateCashPosition } from '../logic/cashPosition'
import { calculateCashProjection, knownObligations } from '../logic/cashProjection'

const fmt = (n: number) => '₺' + n.toLocaleString('tr-TR')

export default function CashFlow() {
  const cash = calculateCashPosition(mockAccounts)
  const projection = calculateCashProjection(cash.netCash, mockTransactions, knownObligations)

  const minBalance = Math.min(...projection.map(d => d.balance))
  const maxBalance = Math.max(...projection.map(d => d.balance))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        <div style={{ background: '#fff', border: '1px solid #E2DDD4', padding: '20px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Bugünkü Nakit</div>
          <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 500, color: '#4CAF84' }}>{fmt(cash.netCash)}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2DDD4', padding: '20px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>30 Gün Sonra (tahmini)</div>
          <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 500, color: projection[29]?.balance > 0 ? '#4CAF84' : '#E24B4A' }}>
            {fmt(Math.round(projection[29]?.balance || 0))}
          </div>
        </div>
        <div style={{ background: minBalance < 50000 ? '#FCEBEB' : '#fff', border: `1px solid ${minBalance < 50000 ? '#E24B4A' : '#E2DDD4'}`, padding: '20px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>En Düşük Nakit</div>
          <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 500, color: minBalance < 50000 ? '#E24B4A' : '#1A1A1A' }}>{fmt(Math.round(minBalance))}</div>
          <div style={{ fontSize: '11px', color: '#8A8680', marginTop: '4px' }}>
            {minBalance < 50000 ? '⚠ Dikkat — kritik seviye' : 'Güvenli seviyede'}
          </div>
        </div>
      </div>

      {/* Projection table */}
      <div style={{ background: '#fff', border: '1px solid #E2DDD4' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2DDD4' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680', letterSpacing: '0.1em', textTransform: 'uppercase' }}>30 Günlük Nakit Akışı Projeksiyonu</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', padding: '10px 20px', borderBottom: '1px solid #E2DDD4', background: '#F7F4EE' }}>
          {['Tarih', 'Giriş', 'Çıkış', 'Bakiye'].map(h => (
            <div key={h} style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {projection.map((day, i) => {
            const barWidth = Math.max(4, Math.round((day.balance / maxBalance) * 100))
            const isLow = day.balance < 50000
            const hasObligations = knownObligations.some(o => o.date === day.date)

            return (
              <div key={day.date} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr',
                padding: '10px 20px',
                borderBottom: i < projection.length - 1 ? '1px solid #E2DDD4' : 'none',
                background: isLow ? '#FFF5F5' : hasObligations ? '#FFFBF0' : 'white',
                alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: hasObligations ? '#E8A838' : '#8A8680' }}>
                  {day.date.slice(5)} {hasObligations ? '⚡' : ''}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#4CAF84' }}>
                  {day.inflow > 0 ? '+' + fmt(day.inflow) : '—'}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: day.outflow > 0 ? '#E24B4A' : '#8A8680' }}>
                  {day.outflow > 0 ? '-' + fmt(day.outflow) : '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '4px', background: '#E2DDD4', borderRadius: '2px' }}>
                    <div style={{ width: `${barWidth}%`, height: '100%', background: isLow ? '#E24B4A' : '#4CAF84', borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: isLow ? '#E24B4A' : '#1A1A1A', minWidth: '80px', textAlign: 'right' }}>
                    {fmt(Math.round(day.balance))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}