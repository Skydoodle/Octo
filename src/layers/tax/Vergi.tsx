import { useState } from 'react'
import { Card, Label } from '../../shared/utils/ui'
import { Check, AlertTriangle, AlertCircle } from 'lucide-react'
import { mockBeyannameler, mockCompliance } from './mockData'
import {
  getUpcomingObligations, getTotalTaxOwed, getOverdueCount,
  calculateComplianceScore, daysUntil, detectDeadlineClusters,
} from './logic/taxLogic'
import { beyannameLabels, statusLabels, type BeyannameStatus } from './types'

const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

const statusColor: Record<BeyannameStatus, string> = {
  taslak: 'text-ink-mute bg-ink-mute/10',
  hazir: 'text-warn bg-warn/10',
  gonderildi: 'text-positive bg-positive/10',
  odendi: 'text-positive bg-positive/10',
  gecikti: 'text-crimson bg-crimson/10',
}

type Tab = 'beyannameler' | 'takvim' | 'uyumluluk'

export default function Vergi() {
  const [tab, setTab] = useState<Tab>('beyannameler')

  const totalOwed = getTotalTaxOwed(mockBeyannameler)
  const upcoming = getUpcomingObligations(mockBeyannameler, 30)
  const overdue = getOverdueCount(mockBeyannameler)
  const score = calculateComplianceScore(mockCompliance)
  const clusters = detectDeadlineClusters(mockBeyannameler)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'beyannameler', label: 'Beyannameler' },
    { id: 'takvim', label: 'Vergi Takvimi' },
    { id: 'uyumluluk', label: 'Uyumluluk' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <span className="label text-crimson">Katman 02</span>
        <h1 className="mt-2 font-display text-4xl text-ink">Vergi</h1>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5" delay={0}>
          <Label>Toplam Vergi Yükü</Label>
          <div className="mt-3 font-mono text-2xl font-medium text-ink">{fmt(totalOwed)}</div>
          <div className="mt-1 text-xs text-ink-mute">ödenmemiş tahakkuk</div>
        </Card>
        <Card className="p-5" delay={60}>
          <Label>Yaklaşan Beyanname</Label>
          <div className="mt-3 font-mono text-2xl font-medium text-warn">{upcoming.length}</div>
          <div className="mt-1 text-xs text-ink-mute">30 gün içinde</div>
        </Card>
        <Card className="p-5" delay={120}>
          <Label>Gecikmiş</Label>
          <div className={'mt-3 font-mono text-2xl font-medium ' + (overdue > 0 ? 'text-crimson' : 'text-positive')}>{overdue}</div>
          <div className="mt-1 text-xs text-ink-mute">süresi geçen</div>
        </Card>
        <Card className="p-5" delay={180}>
          <Label>Uyumluluk Skoru</Label>
          <div className={'mt-3 font-mono text-2xl font-medium ' + (score >= 80 ? 'text-positive' : score >= 60 ? 'text-warn' : 'text-crimson')}>{score}</div>
          <div className="mt-1 text-xs text-ink-mute">100 üzerinden</div>
        </Card>
      </div>

      {/* Cross-layer cluster warning */}
      {clusters.length > 0 && (
        <Card className="border-crimson/30 bg-crimson/5 p-5" delay={220}>
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-crimson" />
            <div>
              <p className="text-sm font-medium text-ink">Yığılma uyarısı</p>
              {clusters.map((c, i) => (
                <p key={i} className="mt-1 text-sm text-ink-soft">
                  {c.hafta} aralığında {c.sayi} beyanname üst üste biniyor; toplam {fmt(c.toplam)} çıkış bekleniyor.
                </p>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={'relative px-4 py-3 text-sm transition-colors ' + (tab === t.id ? 'text-crimson font-medium' : 'text-ink-soft hover:text-ink')}
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-4 -bottom-px h-0.5 bg-crimson" />}
          </button>
        ))}
      </div>

      {/* Beyannameler tab */}
      {tab === 'beyannameler' && (
        <Card className="overflow-hidden" delay={0}>
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-line bg-surface-2 px-6 py-3">
            {['Beyanname', 'Dönem', 'Son Tarih', 'Tutar', 'Durum'].map(h => (
              <span key={h} className="label text-ink-mute">{h}</span>
            ))}
          </div>
          {mockBeyannameler.map((b, i) => {
            const du = daysUntil(b.sonTarih)
            const isUrgent = du >= 0 && du <= 7 && b.status !== 'odendi' && b.status !== 'gonderildi'
            return (
              <div key={b.id} className={'grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-6 py-4 ' + (i < mockBeyannameler.length - 1 ? 'border-b border-line' : '')}>
                <div>
                  <div className="text-sm font-medium text-ink">{beyannameLabels[b.type]}</div>
                  <div className="text-xs text-ink-mute">{b.aciklama}</div>
                </div>
                <span className="font-mono text-xs text-ink-soft">{b.donem}</span>
                <div>
                  <div className="font-mono text-xs text-ink-soft">{b.sonTarih}</div>
                  {isUrgent && <div className="font-mono text-xs text-crimson">{du} gün kaldı</div>}
                </div>
                <span className="font-mono text-sm font-medium text-ink">{fmt(b.hesaplananVergi)}</span>
                <div>
                  <span className={'rounded-full px-2.5 py-1 text-xs font-medium ' + statusColor[b.status]}>
                    {statusLabels[b.status]}
                  </span>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* Takvim tab */}
      {tab === 'takvim' && (
        <Card className="p-6" delay={0}>
          <Label>Yaklaşan Vergi Takvimi</Label>
          <div className="relative mt-6 pl-4">
            <span className="absolute left-[3px] top-1 bottom-1 w-px bg-line" />
            <div className="space-y-6">
              {upcoming.map((o, i) => {
                const tone = o.daysUntil <= 7 ? 'border-crimson' : o.daysUntil <= 14 ? 'border-warn' : 'border-line'
                return (
                  <div key={i} className="relative">
                    <span className={'absolute -left-[13px] top-1 h-2 w-2 rounded-full border-2 bg-paper ' + tone} />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-ink">{o.label}</div>
                        <div className="font-mono text-xs text-ink-mute">{o.sonTarih} · {o.daysUntil} gün kaldı</div>
                      </div>
                      <span className="font-mono text-sm font-medium text-ink">{fmt(o.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Uyumluluk tab */}
      {tab === 'uyumluluk' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2" delay={0}>
            <Label>Uyumluluk Detayı</Label>
            <div className="mt-5 space-y-4">
              {mockCompliance.map(c => (
                <div key={c.alan} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={'grid h-6 w-6 place-items-center rounded-full ' +
                      (c.durum === 'tamam' ? 'bg-positive/15 text-positive' : c.durum === 'risk' ? 'bg-warn/15 text-warn' : 'bg-crimson/15 text-crimson')}>
                      {c.durum === 'tamam' ? <Check size={13} /> : c.durum === 'risk' ? <AlertTriangle size={12} /> : <AlertCircle size={12} />}
                    </span>
                    <div>
                      <div className="text-sm text-ink">{c.alan}</div>
                      <div className="text-xs text-ink-mute">{c.not}</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-ink-mute">%{c.agirlik}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col items-center justify-center p-6" delay={80}>
            <Label>Genel Skor</Label>
            <div className={'mt-4 font-mono text-6xl font-medium ' + (score >= 80 ? 'text-positive' : score >= 60 ? 'text-warn' : 'text-crimson')}>
              {score}
            </div>
            <div className="mt-2 text-xs text-ink-mute">100 üzerinden</div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-line">
              <div className={'h-full rounded-full ' + (score >= 80 ? 'bg-positive' : score >= 60 ? 'bg-warn' : 'bg-crimson')} style={{ width: score + '%' }} />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
