import { useNavigate } from 'react-router-dom'
import Tooltip from './Tooltip'
import { useFinanceStore } from '../../../layers/finance/financeStore'
import { calculateCashPosition, calculateRunway, calculateMonthlyExpenses } from '../../../layers/finance/logic/cashPosition'
import { getTotalReceivables, getOverdueReceivables } from '../../../layers/finance/logic/arAging'
import { getTotalPayables, getUpcomingPayables } from '../../../layers/finance/logic/apSchedule'

const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

function TooltipRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 300 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: color || '#fff', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function TooltipDivider() {
  return <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '10px 0' }} />
}

function TooltipTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#C34B4B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
      {children}
    </div>
  )
}

function KPICard({
  label, value, sub, color, tooltip, onClick
}: {
  label: string
  value: string
  sub: string
  color: string
  tooltip: React.ReactNode
  onClick: () => void
}) {
  return (
    <Tooltip content={tooltip}>
      <div
        onClick={onClick}
        style={{
          background: '#fff',
          border: '1px solid #E2DDD4',
          padding: '20px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          height: '100%',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#C34B4B'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#E2DDD4'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
          {label}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 500, color, letterSpacing: '-0.02em', marginBottom: '4px' }}>
          {value}
        </div>
        <div style={{ fontSize: '12px', color: '#8A8680' }}>{sub}</div>
      </div>
    </Tooltip>
  )
}

export default function KPICards() {
  const navigate = useNavigate()
  const { accounts: mockAccounts, invoices: mockInvoices, transactions: mockTransactions } = useFinanceStore()
  const cash = calculateCashPosition(mockAccounts)
  const monthlyExpenses = calculateMonthlyExpenses(mockTransactions)
  const runway = calculateRunway(cash.netCash, monthlyExpenses)
  const totalReceivables = getTotalReceivables(mockInvoices)
  const overdueReceivables = getOverdueReceivables(mockInvoices)
  const totalPayables = getTotalPayables(mockInvoices)
  const upcomingPayables = getUpcomingPayables(mockInvoices)
  const overdueInvoices = mockInvoices.filter(inv => inv.type === 'sales' && inv.status === 'overdue')
  const unpaidBills = mockInvoices.filter(inv => inv.type === 'purchase' && inv.status === 'sent')
  const monthlyIncome = mockTransactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>

      <KPICard
        label="Nakit Pozisyonu"
        value={fmt(cash.netCash)}
        sub={`${runway} aylık pist`}
        color="#4CAF84"
        onClick={() => navigate('/finans')}
        tooltip={
          <>
            <TooltipTitle>Nakit Dağılımı</TooltipTitle>
            {mockAccounts.map(acc => (
              <TooltipRow
                key={acc.id}
                label={acc.name}
                value={`${acc.currency === 'TRY' ? '₺' : '$'}${acc.balance.toLocaleString('tr-TR')}`}
              />
            ))}
            <TooltipDivider />
            <TooltipRow label="Toplam (TRY)" value={fmt(cash.netCash)} color="#4CAF84" />
            <TooltipRow label="Nakit Pisti" value={`${runway} ay`} />
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
              Finans katmanına git →
            </div>
          </>
        }
      />

      <KPICard
        label="Toplam Alacak"
        value={fmt(totalReceivables)}
        sub={`${fmt(overdueReceivables)} gecikmiş`}
        color={overdueReceivables > 0 ? '#E8A838' : '#4CAF84'}
        onClick={() => navigate('/finans')}
        tooltip={
          <>
            <TooltipTitle>Alacak Detayı</TooltipTitle>
            {overdueInvoices.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: '#E24B4A', marginBottom: '6px', fontFamily: 'monospace', letterSpacing: '0.08em' }}>GECİKMİŞ</div>
                {overdueInvoices.map(inv => (
                  <TooltipRow key={inv.id} label={inv.contactName} value={fmt(inv.total)} color="#E24B4A" />
                ))}
                <TooltipDivider />
              </>
            )}
            <TooltipRow label="Toplam alacak" value={fmt(totalReceivables)} />
            <TooltipRow label="Gecikmiş" value={fmt(overdueReceivables)} color="#E24B4A" />
            <TooltipRow label="Vadesi gelmemiş" value={fmt(totalReceivables - overdueReceivables)} color="#4CAF84" />
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
              Faturalar sekmesine git →
            </div>
          </>
        }
      />

      <KPICard
        label="Toplam Borç"
        value={fmt(totalPayables)}
        sub={`${fmt(upcomingPayables)} 30 günde`}
        color="#E8A838"
        onClick={() => navigate('/finans')}
        tooltip={
          <>
            <TooltipTitle>Borç Detayı</TooltipTitle>
            {unpaidBills.map(inv => (
              <TooltipRow
                key={inv.id}
                label={inv.contactName}
                value={fmt(inv.total)}
                color={new Date(inv.dueDate) < new Date() ? '#E24B4A' : '#fff'}
              />
            ))}
            <TooltipDivider />
            <TooltipRow label="Toplam borç" value={fmt(totalPayables)} />
            <TooltipRow label="30 gün içinde" value={fmt(upcomingPayables)} color="#E8A838" />
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
              Giderler sekmesine git →
            </div>
          </>
        }
      />

      <KPICard
        label="Bu Ay Ciro"
        value={fmt(monthlyIncome)}
        sub="bu ay tahsilat"
        color="#4CAF84"
        onClick={() => navigate('/finans')}
        tooltip={
          <>
            <TooltipTitle>Gelir Detayı</TooltipTitle>
            {mockTransactions.filter(tx => tx.type === 'income').map(tx => (
              <TooltipRow key={tx.id} label={tx.description} value={fmt(tx.amount)} color="#4CAF84" />
            ))}
            <TooltipDivider />
            <TooltipRow label="Toplam tahsilat" value={fmt(monthlyIncome)} color="#4CAF84" />
            <TooltipRow label="Aylık gider" value={fmt(monthlyExpenses)} color="#E24B4A" />
            <TooltipRow
              label="Net"
              value={fmt(monthlyIncome - monthlyExpenses)}
              color={monthlyIncome > monthlyExpenses ? '#4CAF84' : '#E24B4A'}
            />
          </>
        }
      />

    </div>
  )
}