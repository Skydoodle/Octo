import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend
  } from 'recharts'
  import { useFinanceStore } from '../financeStore'
  import EmptyState from '../../../shared/utils/EmptyState'
  import { calculateCashPosition, calculateRunway, calculateMonthlyExpenses } from '../logic/cashPosition'
  import { getTotalReceivables, getOverdueReceivables, calculateARAging } from '../logic/arAging'
  import { getTotalPayables, getUpcomingPayables } from '../logic/apSchedule'
  import { monthlyTrend as buildTrend, expenseByCategory, financialRatios, momDelta, sparkFromTrend } from '../logic/metrics'
  import { useDoviz, cevir, type ParaBirimi } from '../../../shared/doviz'
  import { useState } from 'react'

  const fmtDelta = (d: number | null) => d === null ? '—' : (d >= 0 ? '+' : '') + d.toFixed(1) + '%'
  
  export default function Overview() {
    const { usdTry } = useDoviz()
    const [para, setPara] = useState<ParaBirimi>('TRY')
    const sembol = para === 'TRY' ? '₺' : '$'
    const loc = para === 'TRY' ? 'tr-TR' : 'en-US'
    const fmt = (n: number) => sembol + Math.round(cevir(n, para, usdTry)).toLocaleString(loc)
    const fmtK = (n: number) => {
      const v = cevir(n, para, usdTry)
      return v >= 1000000 ? sembol + (v/1000000).toFixed(1) + 'M' : v >= 1000 ? sembol + (v/1000).toFixed(0) + 'K' : sembol + Math.round(v)
    }
  const { accounts: mockAccounts, invoices: mockInvoices, transactions: mockTransactions } = useFinanceStore()
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
  
    // ---- All store-derived now (no hardcoded figures) ----
    const monthlyTrend = buildTrend(mockTransactions, 6)
    const expenseCategories = expenseByCategory(mockTransactions)
    const ratios = financialRatios(mockAccounts, mockInvoices)
  
    // Month-over-month deltas from the real trend (last two months).
    const last = monthlyTrend[monthlyTrend.length - 1]
    const prev = monthlyTrend[monthlyTrend.length - 2]
    const revenueDelta = momDelta(last?.gelir ?? 0, prev?.gelir ?? 0)
    const expenseDelta = momDelta(last?.gider ?? 0, prev?.gider ?? 0)
  
    const ratioColor = { good: 'rgb(var(--positive))', warn: 'rgb(var(--warn))', bad: 'rgb(var(--crimson))', unknown: 'rgb(var(--ink-mute))' }
    const ratioIcon = { good: '◆', warn: '!', bad: '✗', unknown: '–' }
  
    const kpis = [
      { label: 'Net Nakit', value: fmt(cash.netCash), sub:`nakit ömrü ${runway} ay`, delta: fmtDelta(revenueDelta), up: (revenueDelta ?? 0) >= 0, spark: sparkFromTrend(monthlyTrend, 'kar') },
      { label: 'Toplam Alacak', value: fmt(totalReceivables), sub: `${fmt(overdueReceivables)} gecikmiş`, delta: '', up: true, spark: sparkFromTrend(monthlyTrend, 'gelir') },
      { label: 'Toplam Borç', value: fmt(totalPayables), sub: `${fmt(upcomingPayables)} 30 günde`, delta: '', up: false, spark: sparkFromTrend(monthlyTrend, 'gider') },
      { label: 'Aylık Gider', value: fmt(monthlyExpenses), sub: 'bu ay', delta: fmtDelta(expenseDelta), up: (expenseDelta ?? 0) < 0, spark: sparkFromTrend(monthlyTrend, 'gider') },
    ]
  
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Currency toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'rgb(var(--ink-mute))', fontFamily: 'monospace' }}>1$ = ₺{usdTry.toFixed(2)}</span>
          <div style={{ display: 'flex', border: '1px solid rgb(var(--line))', borderRadius: '6px', overflow: 'hidden' }}>
            {(['TRY', 'USD'] as ParaBirimi[]).map(p => (
              <button key={p} onClick={() => setPara(p)}
                style={{
                  padding: '4px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: para === p ? 'rgb(var(--crimson))' : 'transparent',
                  color: para === p ? '#fff' : 'rgb(var(--ink-mute))',
                }}>
                {p === 'TRY' ? '₺ TRY' : '$ USD'}
              </button>
            ))}
          </div>
        </div>
  
        {/* ROW 1 — KPI cards with sparklines */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
          {kpis.map(kpi => (
            <div key={kpi.label} style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '20px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{kpi.label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 500, color: 'rgb(var(--ink))', marginBottom: '4px' }}>{kpi.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgb(var(--ink-mute))', marginBottom: '6px' }}>{kpi.sub}</div>
                  {kpi.delta && (
                    <div style={{ fontSize: '11px', fontWeight: 500, color: kpi.up ? 'rgb(var(--positive))' : 'rgb(var(--crimson))' }}>
                      {kpi.up ? '▲' : '▼'} {kpi.delta} geçen ay
                    </div>
                  )}
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
                  formatter={(value, name) => [fmt(Number(value ?? 0)), name === 'gelir' ? 'Gelir' : name === 'gider' ? 'Gider' : 'Kâr']}
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
                      opacity: r.status === 'unknown' ? 0.5 : 1,
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
                  formatter={(v) => [`₺${Number(v ?? 0)}K`]}
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
            {mockAccounts.length === 0 ? (
              <EmptyState compact title="Banka hesabı yok" hint="Hesap eklendiğinde bakiyeler burada görünür." />
            ) : (<>
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
            </>)}
          </div>
  
          <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgb(var(--line))' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Son İşlemler</div>
            </div>
            {mockTransactions.length === 0 ? (
              <EmptyState compact title="İşlem yok" hint="Fatura tahsil edildiğinde işlemler burada listelenir." />
            ) : mockTransactions.slice(0, 5).map((tx, i) => (
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