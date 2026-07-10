import { useState } from 'react'
import { CheckCircle2, CircleAlert, CircleDashed, Settings2 } from 'lucide-react'
import { buildDataCoverage, type DataCoverageStatus } from '../../../coverage/dataCoverage'
import { useFinanceStore } from '../../../layers/finance/financeStore'
import { useIKStore } from '../../../layers/hr/hrStore'
import { useOpStore } from '../../../layers/operations/opStore'
import { useTaxStore } from '../../../layers/tax/taxStore'
import {
  setCompanyObligationSettings,
  useCompanyObligationSettings,
  type CompanyBaseCurrency,
} from '../../../settings/companyObligationSettings'
import { Card, Label } from '../../../shared/utils/ui'
import Modal from './Modal'

const statusLabel: Record<DataCoverageStatus, string> = {
  ready: 'Hazır',
  partial: 'Kısmi',
  missing: 'Eksik',
}

const statusStyle: Record<DataCoverageStatus, string> = {
  ready: 'bg-positive/10 text-positive',
  partial: 'bg-warn/10 text-warn',
  missing: 'bg-ink-mute/10 text-ink-mute',
}

function StatusIcon({ status }: { status: DataCoverageStatus }) {
  if (status === 'ready') return <CheckCircle2 size={15} className="text-positive" />
  if (status === 'partial') return <CircleAlert size={15} className="text-warn" />
  return <CircleDashed size={15} className="text-ink-mute" />
}

function ObligationSettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useCompanyObligationSettings()
  const initialMode = settings.salaryPaymentRule?.mode ?? 'missing'
  const [baseCurrency, setBaseCurrency] = useState<CompanyBaseCurrency>(settings.baseCurrency)
  const [mode, setMode] = useState<'missing' | 'fixed_day' | 'month_end'>(initialMode)
  const [day, setDay] = useState(settings.salaryPaymentRule?.mode === 'fixed_day'
    ? String(settings.salaryPaymentRule.day)
    : '')
  const [error, setError] = useState('')

  const save = () => {
    if (mode === 'fixed_day') {
      const parsedDay = Number(day)
      if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        setError('Maaş ödeme günü 1 ile 31 arasında tam sayı olmalı.')
        return
      }
      setCompanyObligationSettings({
        version: 1,
        baseCurrency,
        salaryPaymentRule: { mode: 'fixed_day', day: parsedDay },
      })
    } else if (mode === 'month_end') {
      setCompanyObligationSettings({ version: 1, baseCurrency, salaryPaymentRule: { mode: 'month_end' } })
    } else {
      setCompanyObligationSettings({ version: 1, baseCurrency })
    }
    onClose()
  }

  const inputClass = 'w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-mute'
  return (
    <Modal title="Yükümlülük Ayarları" onClose={onClose} width="500px">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          Bu bilgiler yalnızca ödeme takvimi ve aynı para birimindeki nakit değerlendirmesi için kullanılır.
        </p>
        <div>
          <span className="label mb-1.5 block text-ink-mute">Şirket Ana Para Birimi</span>
          <select className={inputClass} value={baseCurrency} onChange={event => setBaseCurrency(event.target.value as CompanyBaseCurrency)}>
            <option value="TRY">TRY — Türk Lirası</option>
            <option value="USD">USD — ABD Doları</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
        <div>
          <span className="label mb-1.5 block text-ink-mute">Maaş Ödeme Zamanı</span>
          <select className={inputClass} value={mode} onChange={event => { setMode(event.target.value as typeof mode); setError('') }}>
            <option value="missing">Henüz belirlenmedi</option>
            <option value="fixed_day">Her ay sabit gün</option>
            <option value="month_end">Ayın son günü</option>
          </select>
        </div>
        {mode === 'fixed_day' && (
          <div>
            <span className="label mb-1.5 block text-ink-mute">Ayın Günü</span>
            <input type="number" min="1" max="31" step="1" className={inputClass} value={day} onChange={event => { setDay(event.target.value); setError('') }} />
            <p className="mt-1.5 text-xs text-ink-mute">Kısa aylarda ödeme günü ayın son geçerli gününe alınır.</p>
          </div>
        )}
        {error && <p className="text-sm text-crimson">{error}</p>}
        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">İptal</button>
          <button onClick={save} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">Kaydet</button>
        </div>
      </div>
    </Modal>
  )
}

function CoveragePanel({
  coverage,
  openSettings,
}: {
  coverage: ReturnType<typeof buildDataCoverage>
  openSettings: () => void
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Label>Octo’nun Görüş Alanı</Label>
          <p className="mt-1 text-xs text-ink-mute">Güvenle değerlendirilebilen kayıtlar ve tamamlanması gereken bilgiler.</p>
        </div>
        <button
          type="button"
          onClick={openSettings}
          className="focus-ring inline-flex items-center gap-1.5 rounded border border-line px-3 py-2 text-xs text-ink-soft hover:border-crimson hover:text-crimson"
        >
          <Settings2 size={13} /> Ödeme ayarları
        </button>
      </div>
      <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {coverage.domains.map((domain, index) => (
          <div key={domain.domain} className={'py-3 sm:px-4 sm:py-1 ' + (index === 0 ? 'sm:pl-0' : '')}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusIcon status={domain.status} />
                <span className="text-sm font-medium text-ink">{domain.label}</span>
              </div>
              <span className={'rounded px-2 py-0.5 text-[10px] font-medium ' + statusStyle[domain.status]}>{statusLabel[domain.status]}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">{domain.explanation}</p>
            {domain.missingActions[0] && (
              <p className="mt-2 text-[11px] leading-relaxed text-ink-mute"><span className="font-medium text-ink-soft">Sonraki adım:</span> {domain.missingActions[0]}</p>
            )}
            <p className="mt-2 text-[10px] text-ink-mute">{domain.freshness}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DataCoverageCard({ compact = false }: { compact?: boolean }) {
  useFinanceStore()
  useTaxStore()
  useIKStore()
  useOpStore()
  useCompanyObligationSettings()
  const [showSettings, setShowSettings] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const coverage = buildDataCoverage()
  const ready = coverage.domains.filter(domain => domain.status === 'ready').length
  const missing = coverage.domains.reduce((sum, domain) => sum + domain.missingActions.length, 0)

  const openSettings = () => {
    setShowDetail(false)
    setShowSettings(true)
  }

  if (compact) {
    return (
      <>
        {showSettings && <ObligationSettingsModal onClose={() => setShowSettings(false)} />}
        {showDetail && (
          <Modal title="Veri durumu" onClose={() => setShowDetail(false)} width="900px">
            <CoveragePanel coverage={coverage} openSettings={openSettings} />
          </Modal>
        )}
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="focus-ring flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left shadow-soft transition-colors hover:border-crimson/30"
        >
          <span>
            <span className="text-sm font-medium text-ink">Veri durumu: {ready}/4 hazır</span>
            <span className="ml-2 text-xs text-ink-mute">{missing > 0 ? `${missing} bilgi eksik` : 'Temel kayıtlar hazır'}</span>
          </span>
          <span className="text-xs font-medium text-crimson">Detayı gör</span>
        </button>
      </>
    )
  }

  return (
    <>
      {showSettings && <ObligationSettingsModal onClose={() => setShowSettings(false)} />}
      <Card className="p-5" delay={20}>
        <CoveragePanel coverage={coverage} openSettings={openSettings} />
      </Card>
    </>
  )
}
