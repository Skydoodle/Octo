import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
  } from 'recharts'
  import { useState } from 'react'
  import { useFinanceStore } from '../financeStore'
  import { calculateCashPosition } from '../logic/cashPosition'
  import { calculateCashProjection, getKnownObligations } from '../logic/cashProjection'
  import BankStatementImport from '../../../import/BankStatementImport'
  import { useCompanyObligationSettings, type CompanyBaseCurrency } from '../../../settings/companyObligationSettings'
  import { calendarDaysBetween, dateOnlyFromLocalDate } from '../../../shared/dateOnly'
  
  const symbol = (currency: CompanyBaseCurrency) => currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€'
  const fmt = (n: number, currency: CompanyBaseCurrency) => symbol(currency) + Math.round(n).toLocaleString('tr-TR')
  const fmtK = (n: number, currency: CompanyBaseCurrency) => n >= 1000000
    ? symbol(currency) + (n/1000000).toFixed(1) + 'M'
    : symbol(currency) + (n/1000).toFixed(0) + 'K'
  
  interface CashTooltipItem {
    payload?: { balance?: number; inflow?: number; outflow?: number }
  }
  interface CashTooltipProps {
    active?: boolean
    payload?: CashTooltipItem[]
    label?: string
    currency: CompanyBaseCurrency
  }
  const CustomTooltip = ({ active, payload, label, currency }: CashTooltipProps) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    const balance = d?.balance ?? 0
    const inflow = d?.inflow ?? 0
    const outflow = d?.outflow ?? 0
    return (
      <div style={{ background: 'rgb(var(--ink))', border: 'none', borderRadius: '6px', padding: '12px 16px', minWidth: '180px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', marginBottom: '8px', letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 500, color: balance > 100000 ? 'rgb(var(--positive))' : balance > 50000 ? 'rgb(var(--warn))' : 'rgb(var(--crimson))', marginBottom: '8px' }}>
          {fmt(balance, currency)}
        </div>
        {inflow > 0 && <div style={{ fontSize: '12px', color: 'rgb(var(--positive))', marginBottom: '3px' }}>+{fmt(inflow, currency)} giriş</div>}
        {outflow > 0 && <div style={{ fontSize: '12px', color: 'rgb(var(--crimson))' }}>-{fmt(outflow, currency)} çıkış</div>}
      </div>
    )
  }
  
  export default function CashFlow() {
  const { accounts: mockAccounts, transactions: mockTransactions } = useFinanceStore()
    const settings = useCompanyObligationSettings()
    const [showEkstre, setShowEkstre] = useState(false)
    const knownObligations = getKnownObligations()
    const baseAccountIds = new Set(mockAccounts.filter(account => account.currency === settings.baseCurrency).map(account => account.id))
    const baseTransactions = mockTransactions.filter(transaction => baseAccountIds.has(transaction.accountId))
    const cash = calculateCashPosition(mockAccounts, settings.baseCurrency)
    const projection = calculateCashProjection(cash.netCash, baseTransactions, knownObligations)
    const minBalance = Math.min(...projection.map(d => d.balance))
    const maxBalance = Math.max(...projection.map(d => d.balance))
    const endBalance = projection[29]?.balance || 0
    const change = endBalance - cash.netCash
    const chartData = projection.map(d => ({
      ...d,
      date: d.date.slice(5),
      balanceK: Math.round(d.balance),
    }))
  
    // Critical days — where obligations hit
    const today = dateOnlyFromLocalDate(new Date())
    const criticalDays = knownObligations.filter(o => {
      const days = calendarDaysBetween(today, o.date)
      return days !== null && days >= 0 && days <= 30
    })
  
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Ekstre import */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowEkstre(true)}
            style={{ borderRadius: '8px', border: '1px solid rgb(var(--line))', padding: '8px 16px', fontSize: '13px', fontWeight: 500, color: 'rgb(var(--ink-soft))', background: 'transparent', cursor: 'pointer' }}
          >
            Banka Ekstresi İçe Aktar
          </button>
        </div>
        {showEkstre && <BankStatementImport onClose={() => setShowEkstre(false)} />}
  
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Bugünkü Nakit</div>
            <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 500, color: 'rgb(var(--positive))' }}>{fmt(cash.netCash, settings.baseCurrency)}</div>
          </div>
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>30 Gün Sonra</div>
            <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 500, color: endBalance > 0 ? 'rgb(var(--positive))' : 'rgb(var(--crimson))' }}>{fmt(endBalance, settings.baseCurrency)}</div>
            <div style={{ fontSize: '11px', color: change >= 0 ? 'rgb(var(--positive))' : 'rgb(var(--crimson))', marginTop: '4px' }}>
              {change >= 0 ? '▲' : '▼'} {fmt(Math.abs(change), settings.baseCurrency)}
            </div>
          </div>
          <div style={{ background: minBalance < 50000 ? 'rgb(var(--crimson) / 0.1)' : 'rgb(var(--surface))', border: `1px solid ${minBalance < 50000 ? 'rgb(var(--crimson))' : 'rgb(var(--line))'}`, padding: '20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>En Düşük Nokta</div>
            <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 500, color: minBalance < 50000 ? 'rgb(var(--crimson))' : 'rgb(var(--ink))' }}>{fmt(minBalance, settings.baseCurrency)}</div>
            <div style={{ fontSize: '11px', color: minBalance < 50000 ? 'rgb(var(--crimson))' : 'rgb(var(--ink-mute))', marginTop: '4px' }}>
              {minBalance < 50000 ? '⚠ Kritik seviye' : 'Güvenli'}
            </div>
          </div>
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Planlı Çıkış</div>
            <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 500, color: 'rgb(var(--warn))' }}>
              {fmt(knownObligations.reduce((s, o) => s + o.amount, 0), settings.baseCurrency)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgb(var(--ink-mute))', marginTop: '4px' }}>{criticalDays.length} ödeme planlandı</div>
          </div>
        </div>
  
        {/* Main chart */}
        <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>30 Günlük Nakit Projeksiyonu</div>
              <div style={{ fontSize: '12px', color: 'rgb(var(--ink-mute))' }}>⚡ işaretli günlerde planlı ödemeler var</div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[['Nakit Bakiye','rgb(var(--crimson))'],['Kritik Eşik','rgb(var(--line))']].map(([l,c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgb(var(--ink-mute))' }}>
                  <div style={{ width: '20px', height: '2px', background: c as string }}/>
                  {l}
                </div>
              ))}
            </div>
          </div>
  
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--crimson))" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="rgb(var(--crimson))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--surface-2))" vertical={false}/>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'rgb(var(--ink-mute))', fontFamily: 'monospace' }}
                axisLine={false} tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgb(var(--ink-mute))', fontFamily: 'monospace' }}
                axisLine={false} tickLine={false}
                tickFormatter={value => fmtK(value, settings.baseCurrency)}
                domain={[0, maxBalance * 1.1]}
              />
              <Tooltip content={<CustomTooltip currency={settings.baseCurrency} />}/>
              <ReferenceLine y={50000} stroke="rgb(var(--crimson))" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Kritik eşik', position: 'right', fontSize: 10, fill: 'rgb(var(--crimson))', fontFamily: 'monospace' }}/>
              <Area
                type="monotone"
                dataKey="balanceK"
                stroke="rgb(var(--crimson))"
                strokeWidth={2}
                fill="url(#cashGrad)"
                dot={false}
                activeDot={{ r: 4, fill: 'rgb(var(--crimson))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
  
        {/* Upcoming obligations */}
        <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgb(var(--line))', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planlı Ödemeler</div>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--crimson))' }}>{criticalDays.length} ödeme</div>
          </div>
          {knownObligations.slice(0, 6).map((ob, i) => {
            const daysUntil = Math.floor((new Date(ob.date).getTime() - new Date().getTime()) / (1000*60*60*24))
            const isPast = daysUntil < 0
            const isUrgent = daysUntil >= 0 && daysUntil <= 7
            return (
              <div key={i} style={{ padding: '14px 20px', borderBottom: i < 5 ? '1px solid rgb(var(--line))' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPast ? 'rgb(var(--ink-mute))' : isUrgent ? 'rgb(var(--crimson))' : 'rgb(var(--warn))', flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: '13px', color: 'rgb(var(--ink))', fontWeight: 400 }}>{ob.description}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', marginTop: '2px' }}>{ob.date}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500, color: 'rgb(var(--ink))' }}>{fmt(ob.amount, settings.baseCurrency)}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: isPast ? 'rgb(var(--ink-mute))' : isUrgent ? 'rgb(var(--crimson))' : 'rgb(var(--warn))', marginTop: '2px' }}>
                    {isPast ? `${Math.abs(daysUntil)} gün geçti` : daysUntil === 0 ? 'Bugün' : `${daysUntil} gün`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
  
      </div>
    )
  }
