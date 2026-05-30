import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowUpRight, ArrowDownRight, Check, AlertTriangle } from 'lucide-react'
import { Card, Label } from '../../shared/utils/ui'
import { useBriefing } from '../../orchestrator/useBriefing'
import type { Aciliyet } from '../../orchestrator/orchestrator'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { mockInvoices, mockAccounts, mockTransactions } from '../../layers/finance/mockData'
import { calculateCashPosition, calculateRunway, calculateMonthlyExpenses } from '../../layers/finance/logic/cashPosition'
import { getTotalReceivables, getOverdueReceivables } from '../../layers/finance/logic/arAging'
import { getTotalPayables, getUpcomingPayables } from '../../layers/finance/logic/apSchedule'

const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

const dotColor: Record<Aciliyet, string> = {
  kritik: 'bg-crimson',
  dikkat: 'bg-warn',
  stabil: 'bg-positive',
  notr: 'bg-ink-mute',
}

const cashflow = [
  { m: 'Ara', gelir: 4.1, gider: 3.2 },
  { m: 'Oca', gelir: 3.8, gider: 3.4 },
  { m: 'Sub', gelir: 4.6, gider: 3.1 },
  { m: 'Mar', gelir: 5.2, gider: 3.9 },
  { m: 'Nis', gelir: 4.9, gider: 4.2 },
  { m: 'May', gelir: 5.6, gider: 4.0 },
]

const audit = [
  { area: 'Banka Mutabakatı', status: 'ok', note: 'Tüm hesaplar eşleşti' },
  { area: 'e-Fatura Uyumu', status: 'warn', note: '3 fatura uyumsuz' },
  { area: 'KDV Beyanname', status: 'ok', note: 'Taslak hazır' },
  { area: 'KVKK Envanteri', status: 'warn', note: 'Veri envanteri 40 gün eski' },
  { area: 'Muhtasar', status: 'ok', note: 'Zamanında' },
]

const horizon = [
  { day: '+3 gün', event: 'Demir Lojistik sözleşme yenilemesi', tone: 'crimson' },
  { day: '+9 gün', event: 'KDV beyanname son günü', tone: 'warn' },
  { day: '+14 gün', event: 'Tahsilat vadesi', tone: 'positive' },
  { day: '+22 gün', event: 'SGK bildirim dönemi', tone: 'mute' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { briefing, loading, regenerate } = useBriefing()

  const cash = calculateCashPosition(mockAccounts)
  const monthlyExpenses = calculateMonthlyExpenses(mockTransactions)
  const runway = calculateRunway(cash.netCash, monthlyExpenses)
  const totalReceivables = getTotalReceivables(mockInvoices)
  const overdueReceivables = getOverdueReceivables(mockInvoices)
  const totalPayables = getTotalPayables(mockInvoices)
  const upcomingPayables = getUpcomingPayables(mockInvoices)
  const monthlyIncome = mockTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const kpis = [
    { label: 'Nakit Pozisyonu', value: fmt(cash.netCash), delta: 4.2, hint: runway + ' ay pist', path: '/dashboard/finans' },
    { label: 'Toplam Alacak', value: fmt(totalReceivables), delta: -8.1, hint: fmt(overdueReceivables) + ' gecikmiş', path: '/dashboard/finans' },
    { label: 'Toplam Borç', value: fmt(totalPayables), delta: 3.1, hint: fmt(upcomingPayables) + ' 30 günde', path: '/dashboard/finans' },
    { label: 'Bu Ay Ciro', value: fmt(monthlyIncome), delta: 12.4, hint: 'bu ay tahsilat', path: '/dashboard/finans' },
  ]

  return (
    <div className="space-y-5">

      <Card className="overflow-hidden" delay={0}>
        <div className="p-7">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-crimson" />
              <Label>Günlük Brifing</Label>
            </div>
            <button
              onClick={regenerate}
              disabled={loading}
              className="label text-ink-mute hover:text-crimson transition-colors disabled:opacity-40"
            >
              {loading ? 'oluşturuluyor...' : 'Yenile'}
            </button>
          </div>

          {loading ? (
            <p className="text-[0.95rem] italic leading-relaxed text-ink-mute">Yapay zeka brifing hazırlıyor...</p>
          ) : (
            <>
              <p className="text-[0.95rem] leading-relaxed text-ink-soft">{briefing.ozet}</p>
              <div className="mt-5 space-y-3">
                {briefing.kollar.map((k, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border border-line bg-paper/40 p-3">
                    <span className={'mt-1 h-2 w-2 shrink-0 rounded-full ' + (dotColor[k.aciliyet] || 'bg-ink-mute')} />
                    <div>
                      <span className="label text-ink-mute">{k.kol}</span>
                      <p className="mt-1 text-sm text-ink">{k.metin}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5">
            <span className="label text-ink-mute">Müşaviriniz için hazırlandı</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const up = k.delta >= 0
          return (
            <Card key={k.label} className="p-5 cursor-pointer hover:border-crimson/40 transition-colors" delay={80 + i * 60}>
              <div onClick={() => navigate(k.path)}>
                <Label>{k.label}</Label>
                <div className="mt-3 font-mono text-2xl font-medium tracking-tight text-ink">{k.value}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={'inline-flex items-center gap-0.5 text-xs font-medium ' + (up ? 'text-positive' : 'text-crimson')}>
                    {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {Math.abs(k.delta)}%
                  </span>
                  <span className="text-xs text-ink-mute">{k.hint}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2" delay={160}>
          <div className="mb-4"><Label>Nakit Akışı 6 Ay</Label></div>
          <div className="mb-3 flex items-center gap-4 text-xs text-ink-mute">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-crimson" />Gelir</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-mute" />Gider</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="g-gelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(195 75 75)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="rgb(195 75 75)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-gider" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(138 133 125)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="rgb(138 133 125)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: 'rgb(138 133 125)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'rgb(255 254 251)', border: '1px solid rgb(226 221 211)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v + 'M TL', '']} />
                <Area type="monotone" dataKey="gelir" stroke="rgb(195 75 75)" strokeWidth={2} fill="url(#g-gelir)" dot={false} />
                <Area type="monotone" dataKey="gider" stroke="rgb(138 133 125)" strokeWidth={1.5} fill="url(#g-gider)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6" delay={200}>
          <Label>Denetim Özeti</Label>
          <div className="mt-4 space-y-3">
            {audit.map(a => (
              <div key={a.area} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={'grid h-5 w-5 place-items-center rounded-full ' + (a.status === 'ok' ? 'bg-positive/15 text-positive' : 'bg-warn/15 text-warn')}>
                    {a.status === 'ok' ? <Check size={12} /> : <AlertTriangle size={11} />}
                  </span>
                  <span className="text-sm text-ink">{a.area}</span>
                </div>
                <span className="text-xs text-ink-mute">{a.note}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6" delay={240}>
        <Label>30 Günlük Ufuk</Label>
        <div className="relative mt-5 pl-4">
          <span className="absolute left-[3px] top-1 bottom-1 w-px bg-line" />
          <div className="space-y-5">
            {horizon.map((h, i) => (
              <div key={i} className="relative">
                <span className={'absolute -left-[13px] top-1 h-2 w-2 rounded-full border-2 bg-paper ' + (h.tone === 'crimson' ? 'border-crimson' : h.tone === 'warn' ? 'border-warn' : h.tone === 'positive' ? 'border-positive' : 'border-line')} />
                <div className="font-mono text-xs text-ink-mute">{h.day}</div>
                <div className="mt-0.5 text-sm text-ink">{h.event}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

    </div>
  )
}
