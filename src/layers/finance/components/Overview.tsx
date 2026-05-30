import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend
  } from 'recharts'
  import { mockAccounts, mockInvoices, mockTransactions } from '../mockData'
  import { calculateCashPosition, calculateRunway, calculateMonthlyExpenses } from '../logic/cashPosition'
  import { getTotalReceivables, getOverdueReceivables, calculateARAging } from '../logic/arAging'
  import { getTotalPayables, getUpcomingPayables } from '../logic/apSchedule'
  
  const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')
  const fmtK = (n: number) => n >= 1000000 ? '₺' + (n/1000000).toFixed(1) + 'M' : n >= 1000 ? '₺' + (n/1000).toFixed(0) + 'K' : '₺' + n
  
  // Mock 6-month trend data
  const monthlyTrend = [
    { month: 'Ara', gelir: 180000, gider: 145000, kar: 35000 },
    { month: 'Oca', gelir: 210000, gider: 162000, kar: 48000 },
    { month: 'Şub', gelir: 195000, gider: 158000, kar: 37000 },
    { month: 'Mar', gelir: 240000, gider: 171000, kar: 69000 },
    { month: 'Nis', gelir: 228000, gider: 168000, kar: 60000 },
    { month: 'May', gelir: 285000, gider: 212000, kar: 73000 },
  ]
  
  // Mock sparkline data
  const sparkData = (up: boolean) => Array.from({length: 8}, (_, i) => ({
    v: 50 + (up ? i * 6 : -i * 4) + Math.random() * 20
  }))
  
  export default function Overview() {
    const cash = calculateCashPosition(mockAccounts)
    const monthlyExpenses = calculateMonthlyExpenses(mockTransactions)
    const runway = calculateRunway(cash.netCash, monthlyExpenses)
    const totalReceivables = getTotalReceivables(mockInvoices)
    const overdueReceivables = getOverdueReceivables(mockInvoices)
    const totalPayables = getTotalPayables(mockInvoices)
    const upcomingPayables = getUpcomingPayables(mockInvoices)
    const aging = calculateARAging(mockInvoices)
  
    const agingChart = aging.map(b => ({
      name: b.label.replace(' gecikmiş', '').replace('Vadesi gelmemiş', 'Cari'),
      alacak: Math.round(b.total / 1000),
    }))
  
    // Expense breakdown
    const expenseCategories = [
      { label: 'Personel', amount: 142800, pct: 67 },
      { label: 'Kira', amount: 54000, pct: 25 },
      { label: 'Teknoloji', amount: 10200, pct: 5 },
      { label: 'Genel Gider', amount: 5040, pct: 2 },
    ]
  
    // Financial ratios
    const ratios = [
      { label: 'Cari Oran', value: '2.1:1', target: '2.0 veya üzeri', status: 'good' },
      { label: 'Asit-Test Oranı', value: '1.4:1', target: '1.0 veya üzeri', status: 'good' },
      { label: 'Borç/Özkaynak', value: '0.6:1', target: '0.5 veya altı', status: 'warn' },
    ]
  
    const ratioColor = { good: 'rgb(var(--positive))', warn: 'rgb(var(--warn))', bad: 'rgb(var(--crimson))' }
    const ratioIcon = { good: '◆', warn: '!', bad: '✗' }
  
    const kpis = [
      { label: 'Net Nakit', value: fmt(cash.netCash), sub:`nakit ömrü ${runway} ay`, delta: '+8.2%', up: true, spark: sparkData(true) },
      { label: 'Toplam Alacak', value: fmt(totalReceivables), sub: `${fmt(overdueReceivables)} gecikmiş`, delta: '+12.4%', up: true, spark: sparkData(true) },
      { label: 'Toplam Borç', value: fmt(totalPayables), sub: `${fmt(upcomingPayables)} 30 günde`, delta: '-3.1%', up: false, spark: sparkData(false) },
      { label: 'Aylık Gider', value: fmt(monthlyExpenses), sub: 'bu ay', delta: '+5.8%', up: false, spark: sparkData(false) },
    ]
  
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  
        {/* ROW 1 — KPI cards with sparklines */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
          {kpis.map(kpi => (
            <div key={kpi.label} style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{kpi.label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 500, color: 'rgb(var(--ink))', marginBottom: '4px' }}>{kpi.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgb(var(--ink-mute))', marginBottom: '6px' }}>{kpi.sub}</div>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: kpi.up ? 'rgb(var(--positive))' : 'rgb(var(--crimson))' }}>
                    {kpi.up ? '▲' : '▼'} {kpi.delta} geçen ay
                  </div>
                </div>
                <div style={{ width: '72px', height: '36px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpi.spark} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id={`grad-${kpi.label}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={kpi.up ? 'rgb(var(--positive))' : 'rgb(var(--crimson))'} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={kpi.up ? 'rgb(var(--positive))' : 'rgb(var(--crimson))'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke={kpi.up ? 'rgb(var(--positive))' : 'rgb(var(--crimson))'} strokeWidth={1.5} fill={`url(#grad-${kpi.label})`} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ))}
        </div>
  
        {/* ROW 2 — Income/Expense chart + Financial Ratios */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '12px' }}>
  
          {/* Income vs Expenses 6-month */}
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gelir & Gider — Son 6 Ay</div>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[['Gelir','rgb(var(--positive))'],['Gider','rgb(var(--crimson))'],['Kâr','rgb(var(--crimson))']].map(([l,c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'rgb(var(--ink-mute))' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c as string }}/>
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend} barGap={2} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--surface-2))" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgb(var(--ink-mute))', fontFamily: 'monospace' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--ink-mute))', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)}/>
                <Tooltip
                  formatter={(value: number, name: string) => [fmt(value), name === 'gelir' ? 'Gelir' : name === 'gider' ? 'Gider' : 'Kâr']}
                  contentStyle={{ background: 'rgb(var(--ink))', border: 'none', borderRadius: '4px', fontSize: '12px' }}
                  labelStyle={{ color: 'rgb(var(--ink-mute))', fontFamily: 'monospace', fontSize: '11px' }}
                  itemStyle={{ color: 'rgb(var(--surface))' }}
                />
                <Bar dataKey="gelir" fill="rgb(var(--positive))" radius={[2,2,0,0]}/>
                <Bar dataKey="gider" fill="rgb(var(--crimson))" radius={[2,2,0,0]}/>
                <Bar dataKey="kar" fill="rgb(var(--crimson))" radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
  
          {/* Financial Ratios */}
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '20px' }}>Finansal Oranlar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {ratios.map(r => (
                <div key={r.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <div style={{
                      width: '24px', height: '24px',
                      background: ratioColor[r.status as keyof typeof ratioColor],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: 'rgb(var(--surface))', fontWeight: 700,
                      borderRadius: r.status === 'good' ? '0' : '4px',
                      transform: r.status === 'good' ? 'rotate(45deg)' : 'none',
                    }}>
                      <span style={{ transform: r.status === 'good' ? 'rotate(-45deg)' : 'none', fontSize: '8px' }}>
                        {ratioIcon[r.status as keyof typeof ratioIcon]}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 500, color: 'rgb(var(--ink))' }}>{r.value}</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgb(var(--ink))', marginBottom: '2px' }}>{r.label}</div>
                  <div style={{ fontSize: '11px', color: 'rgb(var(--ink-mute))' }}>Hedef: {r.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
  
        {/* ROW 3 — AR Aging chart + Expense breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
  
          {/* AR Aging */}
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Alacak Yaşlandırma (₺K)</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={agingChart} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--surface-2))" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgb(var(--ink-mute))', fontFamily: 'monospace' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--ink-mute))', fontFamily: 'monospace' }} axisLine={false} tickLine={false}/>
                <Tooltip
                  formatter={(v: number) => [`₺${v}K`]}
                  contentStyle={{ background: 'rgb(var(--ink))', border: 'none', borderRadius: '4px', fontSize: '12px' }}
                  itemStyle={{ color: 'rgb(var(--surface))' }}
                />
                <Bar dataKey="alacak" radius={[3,3,0,0]}
                  fill="rgb(var(--ink-mute))"
                />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgb(var(--line))' }}>
              <div style={{ fontSize: '12px', color: 'rgb(var(--ink-mute))' }}>Toplam alacak</div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500, color: 'rgb(var(--ink))' }}>{fmt(totalReceivables)}</div>
            </div>
          </div>
  
          {/* Expense breakdown */}
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Bu Ayki Giderler</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {expenseCategories.map(cat => (
                <div key={cat.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ fontSize: '13px', color: 'rgb(var(--ink))' }}>{cat.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'rgb(var(--ink))', fontWeight: 500 }}>{fmt(cat.amount)}</div>
                  </div>
                  <div style={{ height: '4px', background: 'rgb(var(--surface-2))', borderRadius: '2px' }}>
                    <div style={{ width: `${cat.pct}%`, height: '100%', background: 'rgb(var(--crimson))', borderRadius: '2px' }}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgb(var(--line))' }}>
              <div style={{ fontSize: '12px', color: 'rgb(var(--ink-mute))' }}>Toplam gider</div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500, color: 'rgb(var(--ink))' }}>{fmt(monthlyExpenses)}</div>
            </div>
          </div>
        </div>
  
        {/* ROW 4 — Bank accounts + Recent transactions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
  
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgb(var(--line))' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Banka Hesapları</div>
            </div>
            {mockAccounts.map((acc, i) => (
              <div key={acc.id} style={{ padding: '14px 20px', borderBottom: i < mockAccounts.length - 1 ? '1px solid rgb(var(--line))' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgb(var(--ink))', marginBottom: '2px' }}>{acc.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))' }}>{acc.iban}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500, color: 'rgb(var(--ink))' }}>
                    {acc.currency === 'TRY' ? '₺' : acc.currency === 'USD' ? '$' : '€'}{acc.balance.toLocaleString('tr-TR')}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))' }}>{acc.currency}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '14px 20px', background: 'rgb(var(--paper))', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Toplam (TRY)</div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500, color: 'rgb(var(--ink))' }}>{fmt(cash.netCash)}</div>
            </div>
          </div>
  
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgb(var(--line))' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Son İşlemler</div>
            </div>
            {mockTransactions.slice(0, 5).map((tx, i) => (
              <div key={tx.id} style={{ padding: '12px 20px', borderBottom: i < 4 ? '1px solid rgb(var(--line))' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tx.type === 'income' ? 'rgb(var(--positive))' : 'rgb(var(--crimson))', flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: '12px', color: 'rgb(var(--ink))', marginBottom: '1px' }}>{tx.description}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))' }}>{tx.date} · {tx.category}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 500, color: tx.type === 'income' ? 'rgb(var(--positive))' : 'rgb(var(--crimson))' }}>
                  {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }